#!/usr/bin/env python3
"""
Merge deep-review workflow results back into station YAMLs.

Input: one or more JSON files, each shaped { "results": [ {...}, ... ] }
where every result carries (see .claude/workflows/*review*.js for the schema):

  uuid, status (active|defunct|uncertain), stream_check, nature, score,
  confidence (high|medium|low), controversial, controversy_note,
  operator, affiliations, audience, format, notes, sources,
  favicon, homepage_fix, name_fix, duplicate_of, evidence

What gets written (surgical text edits — no full YAML reformat):

  curation:      ABSOLUTE score from the agent, weighted by confidence:
                   high   -> score
                   medium -> 0.7*score + 0.3*current   (or score, when the
                             current value is a placeholder / --baseline)
                   low    -> unchanged (or 0.5*score with --baseline)
                 then: defunct -> min(v, -0.30); controversial -> min(v, -0.30)
  research:      block rebuilt from existing values + any non-empty agent
                 fields; reviewed_at stamped with --date when anything was
                 confirmed or changed (confidence != low).
  favicon:       set only when currently empty and the candidate URL serves
                 an image (HEAD/GET check).
  homepage:      replaced by homepage_fix when confidence is high and the new
                 URL resolves.
  name:          replaced by name_fix only when the fix is a *cleanup* of the
                 current name (junk suffix removal) — anything else is logged
                 to the report for manual review.
  duplicate_of:  NOT written here. Proposed duplicates are validated and
                 written to the report; apply them with
                 scripts/apply-duplicate-proposals.py after review.

Usage:
  python3 scripts/apply-review-results.py results-A.json [results-B.json ...]
      [--date 2026-09-02] [--baseline] [--report out.json] [--dry-run]
"""
from __future__ import annotations

import argparse, json, re, ssl, sys, unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / 'data' / 'stations'
UA = 'Mozilla/5.0 (compatible; TuneOutBot/3.0; +https://tune-out.app)'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

RE_CURATION_LINE = re.compile(r'^curation:\s*(-?\d+(?:\.\d+)?)\s*$', re.M)
RE_FAVICON_LINE = re.compile(r'^favicon:.*$', re.M)
RE_HOMEPAGE_LINE = re.compile(r'^homepage:.*$', re.M)
RE_NAME_LINE = re.compile(r'^name:.*$', re.M)
RE_RESEARCH_BLOCK = re.compile(r'^research:[ \t]*(?:\{\}|)\s*$\n((?:[ \t]+.*\n?|\n)*)', re.M)
RE_WM_THUMB = re.compile(r'^(https?://upload\.wikimedia\.org/wikipedia/[^/]+)/thumb/([^/]+/[^/]+/[^/]+)/(\d+px-[^/]+)$')
RE_NAME_JUNK = re.compile(r'(\[[^\]]*\]|\([^)]*\)|\b\d{2,3}\s?k(?:bps)?\b|\b(?:mp3|aac\+?|aacp|ogg|opus|flac|hls|hd|hq|lq|low|high|stream)\b|[|/·•–-]\s*$)', re.I)

RESEARCH_KEYS = ['reviewed_at', 'nature', 'operator', 'affiliations', 'audience', 'format', 'notes', 'sources']
NATURES = {'public broadcaster', 'state media', 'non-commercial', 'community', 'commercial', 'religious', 'online-only', 'pirate'}
PLACEHOLDER_NOTES = ('imported from iprd', '')


def find_shard(uuid: str) -> Path | None:
    for p in STATIONS.glob(f'*/{uuid}.yaml'):
        return p
    return None


def _s(v) -> str:
    if v is None: return ''
    if isinstance(v, str): return v.strip()
    return str(v).strip()


def yaml_scalar(v: str) -> str:
    """Render a single-line YAML scalar the way pyyaml would, without wrapping."""
    v = ' '.join(v.split())  # collapse whitespace/newlines into single spaces
    out = yaml.safe_dump(v, allow_unicode=True, width=1_000_000, default_flow_style=True).strip()
    if out.endswith('\n...'): out = out[:-4].rstrip()
    return out


def render_research(block: dict) -> str:
    lines = ['research:']
    for k in RESEARCH_KEYS:
        v = _s(block.get(k))
        if k == 'reviewed_at':
            lines.append(f'  reviewed_at: {v}' if re.fullmatch(r'\d{4}-\d{2}-\d{2}', v) else f'  reviewed_at: {yaml_scalar(v)}')
        else:
            lines.append(f'  {k}: {yaml_scalar(v)}')
    return '\n'.join(lines) + '\n'


def http_ok(url: str, want_image: bool) -> str | None:
    """Return the final URL if it resolves (and is an image when want_image)."""
    for method in ('HEAD', 'GET'):
        try:
            req = Request(url, method=method, headers={'User-Agent': UA, 'Range': 'bytes=0-2047'})
            r = urlopen(req, timeout=8, context=ctx)
            status, ct = r.status, (r.headers.get('Content-Type') or '').lower()
            final = r.geturl()
            r.close()
            if status not in (200, 206): continue
            if want_image and not ('image/' in ct or ct.rsplit('/', 1)[-1] in ('x-icon', 'ico', 'vnd.microsoft.icon')):
                continue
            return final or url
        except HTTPError as e:
            if e.code in (405, 403) and method == 'HEAD':
                continue
            continue
        except Exception:
            continue
    return None


def favicon_candidates(url: str):
    yield url
    m = RE_WM_THUMB.match(url)
    if m:
        prefix, path, last = m.group(1), m.group(2), m.group(3)
        yield f'{prefix}/thumb/{path}/{re.sub(r"^\d+px-", "250px-", last)}'
        yield f'{prefix}/{path}'


def norm_name(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


def is_cleanup(current: str, fix: str) -> bool:
    """True when `fix` is the current name with junk removed (safe to apply)."""
    nc, nf = norm_name(current), norm_name(fix)
    if not nf: return False
    if nf == nc: return current != fix  # case / punctuation / whitespace only
    if nf in nc: return True
    stripped = norm_name(RE_NAME_JUNK.sub(' ', current))
    return nf == stripped or (stripped and nf in stripped)


def new_score(current: float | None, r: dict, baseline: bool) -> float | None:
    conf = r.get('confidence') or 'low'
    score = r.get('score')
    if score is None: return None
    score = max(-1.0, min(1.0, float(score)))
    cur = current if current is not None else 0.0
    if conf == 'high' or (baseline and conf == 'medium'):
        v = score
    elif conf == 'medium':
        v = 0.7 * score + 0.3 * cur
    elif baseline:
        v = 0.5 * score
    else:
        v = None
    if r.get('status') == 'defunct' and conf != 'low':
        v = min(v if v is not None else cur, -0.30)
    if r.get('controversial'):
        v = min(v if v is not None else cur, -0.30)
    if v is None: return None
    return round(max(-1.0, min(1.0, v)), 2)


def process(r: dict, args) -> dict:
    uuid = _s(r.get('uuid'))
    out = {'uuid': uuid, 'actions': []}
    if not uuid:
        out['status'] = 'skip-empty'; return out
    path = find_shard(uuid)
    if not path:
        out['status'] = 'miss'; return out
    text = path.read_text(encoding='utf-8')
    try:
        data = yaml.safe_load(text) or {}
    except Exception as e:
        out['status'] = f'yaml-error: {e}'; return out
    out['name'] = _s(data.get('name'))
    out['votes'] = int(data.get('votes') or 0)
    conf = r.get('confidence') or 'low'

    # ── curation ─────────────────────────────────────────────────────────
    cur = data.get('curation')
    cur = float(cur) if isinstance(cur, (int, float)) else None
    research = data.get('research') or {}
    existing_notes = _s(research.get('notes')).lower()
    baseline = args.baseline or existing_notes.startswith(PLACEHOLDER_NOTES[0]) or not existing_notes
    ns = new_score(cur, r, baseline)
    if ns is not None and ns != cur:
        m = RE_CURATION_LINE.search(text)
        if m:
            text = RE_CURATION_LINE.sub(f'curation: {ns:.2f}', text, count=1)
        else:
            text = re.sub(r'(^geo_long:.*$)', lambda mm: mm.group(1) + f'\ncuration: {ns:.2f}', text, count=1, flags=re.M)
        out['actions'].append(f'curation {cur} -> {ns}')
    out['score_old'], out['score_new'] = cur, ns if ns is not None else cur

    # ── research block ───────────────────────────────────────────────────
    merged = {k: _s(research.get(k)) for k in RESEARCH_KEYS}
    changed_fields = []
    nature = _s(r.get('nature'))
    if nature in NATURES and nature != merged['nature'] and conf != 'low':
        merged['nature'] = nature; changed_fields.append('nature')
    for k in ('operator', 'affiliations', 'audience', 'format', 'notes', 'sources'):
        v = ' '.join(_s(r.get(k)).split())
        if v and v != merged[k]:
            if k == 'sources' and v.lower() in ('internal knowledge only', 'no web sources found') and merged[k]:
                continue
            if conf == 'low' and k in ('notes',) and merged[k] and not baseline:
                continue  # don't overwrite real notes with low-confidence text
            merged[k] = v; changed_fields.append(k)
    if r.get('controversial') and _s(r.get('controversy_note')):
        note = 'Editorial flag: ' + ' '.join(_s(r.get('controversy_note')).split())
        if note not in merged['notes']:
            merged['notes'] = (merged['notes'] + ' ' + note).strip(); changed_fields.append('controversy')
    if r.get('status') == 'defunct' and conf != 'low' and 'defunct' not in merged['notes'].lower() and 'closed' not in merged['notes'].lower():
        merged['notes'] = (merged['notes'] + ' Editorial note: appears to be defunct as of ' + args.date + '.').strip()
        changed_fields.append('defunct')
    if changed_fields or conf != 'low':
        merged['reviewed_at'] = args.date
    if merged != {k: _s(research.get(k)) for k in RESEARCH_KEYS}:
        block = render_research(merged)
        bm = RE_RESEARCH_BLOCK.search(text)
        if bm:
            text = text[:bm.start()] + block + text[bm.end():]
        else:
            m = RE_CURATION_LINE.search(text)
            if m:
                text = text[:m.start()] + block + text[m.start():]
            else:
                text = text.rstrip('\n') + '\n' + block
        out['actions'].append('research: ' + ','.join(changed_fields or ['reviewed_at']))

    # ── favicon ──────────────────────────────────────────────────────────
    fav = _s(r.get('favicon'))
    if fav.startswith('http') and not _s(data.get('favicon')).startswith('http'):
        for cand in favicon_candidates(fav):
            if args.dry_run or http_ok(cand, want_image=True):
                if RE_FAVICON_LINE.search(text):
                    text = RE_FAVICON_LINE.sub(f'favicon: {yaml_scalar(cand)}', text, count=1)
                else:
                    text = RE_HOMEPAGE_LINE.sub(lambda mm: mm.group(0) + f'\nfavicon: {yaml_scalar(cand)}', text, count=1)
                out['actions'].append('favicon set'); break

    # ── homepage ─────────────────────────────────────────────────────────
    hp = _s(r.get('homepage_fix'))
    if hp.startswith('http') and conf == 'high' and hp.rstrip('/') != _s(data.get('homepage')).rstrip('/'):
        if args.dry_run or http_ok(hp, want_image=False):
            text = RE_HOMEPAGE_LINE.sub(f'homepage: {yaml_scalar(hp)}', text, count=1)
            out['actions'].append(f'homepage -> {hp}')

    # ── name ─────────────────────────────────────────────────────────────
    nf = ' '.join(_s(r.get('name_fix')).split())
    if nf and nf != out['name'] and len(nf) >= 2:
        # Cleanups (junk removal, casing) apply at any confidence; a genuine
        # rename (rebrand, corrected official name) only at high confidence.
        if is_cleanup(out['name'], nf) or conf == 'high':
            text = RE_NAME_LINE.sub(f'name: {yaml_scalar(nf)}', text, count=1)
            out['actions'].append(f'name "{out["name"]}" -> "{nf}"')
        else:
            out['name_fix_skipped'] = nf

    # ── duplicate proposals (report only) ───────────────────────────────
    dup = _s(r.get('duplicate_of'))
    if dup and dup != uuid:
        out['dup_proposed'] = dup

    out['controversial'] = bool(r.get('controversial'))
    out['defunct'] = r.get('status') == 'defunct'
    out['stream_check'] = r.get('stream_check') or ''
    out['confidence'] = conf
    if out['actions'] and not args.dry_run:
        path.write_text(text, encoding='utf-8')
    out['status'] = 'changed' if out['actions'] else 'noop'
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inputs', nargs='+')
    ap.add_argument('--date', default='2026-09-02')
    ap.add_argument('--baseline', action='store_true', help='treat current scores as placeholders')
    ap.add_argument('--report', default='')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--ledger', default='', help='JSON file of already-applied uuids; skips them and records new ones')
    args = ap.parse_args()

    results: list[dict] = []
    for src in args.inputs:
        data = json.loads(Path(src).read_text(encoding='utf-8'))
        rs = data.get('results') if isinstance(data, dict) else data
        results.extend(rs or [])
    # Last result per uuid wins (later files override earlier ones).
    by_uuid: dict[str, dict] = {}
    for r in results:
        if r.get('uuid'): by_uuid[r['uuid']] = r

    # The score merge is confidence-weighted against the CURRENT file value, so
    # re-applying the same result would drift it. The ledger makes runs additive.
    ledger: set[str] = set()
    ledger_path = Path(args.ledger) if args.ledger else None
    if ledger_path and ledger_path.exists():
        ledger = set(json.loads(ledger_path.read_text(encoding='utf-8')))
        skipped = [u for u in by_uuid if u in ledger]
        for u in skipped: by_uuid.pop(u)
        print(f'ledger: skipping {len(skipped)} already-applied results')

    todo = list(by_uuid.values())
    print(f'{len(todo)} unique results from {len(results)} entries')

    outs: list[dict] = []
    with ThreadPoolExecutor(max_workers=16) as ex:
        for o in ex.map(lambda r: process(r, args), todo):
            outs.append(o)

    counts: dict[str, int] = {}
    for o in outs: counts[o['status']] = counts.get(o['status'], 0) + 1
    print('status:', counts)
    acts: dict[str, int] = {}
    for o in outs:
        for a in o.get('actions', []):
            key = a.split(' ')[0].rstrip(':')
            acts[key] = acts.get(key, 0) + 1
    print('actions:', acts)
    print('controversial:', sum(1 for o in outs if o.get('controversial')),
          'defunct:', sum(1 for o in outs if o.get('defunct')),
          'stream fail:', sum(1 for o in outs if o.get('stream_check') == 'fail'),
          'dup proposals:', sum(1 for o in outs if o.get('dup_proposed')),
          'name fixes skipped:', sum(1 for o in outs if o.get('name_fix_skipped')))
    if args.report:
        Path(args.report).write_text(json.dumps(outs, ensure_ascii=False, indent=1), encoding='utf-8')
        print('report ->', args.report)
    if ledger_path and not args.dry_run:
        ledger.update(o['uuid'] for o in outs if o.get('status') in ('changed', 'noop'))
        ledger_path.write_text(json.dumps(sorted(ledger)), encoding='utf-8')
        print(f'ledger -> {ledger_path} ({len(ledger)} uuids)')


if __name__ == '__main__':
    main()
