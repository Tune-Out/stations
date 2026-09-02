#!/usr/bin/env python3
"""
Apply agent-adjudicated duplicate proposals.

Input: one or more JSON files. Two shapes are accepted:

  1. review reports from scripts/apply-review-results.py --report:
       [ { "uuid": "...", "dup_proposed": "<authority-uuid>", ... }, ... ]
  2. cluster verdicts from the dedupe workflow:
       { "clusters": [ { "verdict": "same"|"mixed", "authority": "...",
                          "duplicates": ["...", ...] }, ... ] }

For every (duplicate -> authority) pair the script validates:
  * both YAMLs exist, differ, and the authority is canonical (no duplicate_of)
  * the duplicate is not itself the target of other stations (those get
    re-pointed to the new authority so chains never form)
  * the pair looks like one broadcast: same homepage host, OR same stream
    host, OR near-identical normalized names (>= 0.8 token overlap)
Then:
  * writes `duplicate_of: <authority>` on the duplicate (surgical line edit,
    placed after `curation:` like scripts/mark-duplicates.py)
  * folds the duplicate's stream URL into the authority's `streams:` list
    when the URL is not already there (so no stream quality is lost)
  * merges provenance ids into the authority

Usage: python3 scripts/apply-duplicate-proposals.py in1.json [in2.json ...] [--dry-run]
"""
from __future__ import annotations

import argparse, json, re, unicodedata
from pathlib import Path
from urllib.parse import urlsplit

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / 'data' / 'stations'
RE_DUP_LINE = re.compile(r'^duplicate_of:\s*\S.*$', re.M)
RE_CURATION_LINE = re.compile(r'^curation:.*$', re.M)
RE_PROV_BLOCK = re.compile(r'^provenance:\s*(?:\[\]\s*)?$\n((?:  - .*\n?)*)', re.M)
RE_STREAMS_BLOCK = re.compile(r'^streams:\s*$\n((?:  .*\n?|\n)*)', re.M)
NOISE = re.compile(r"\b(hd|sd|opus|flac|mp3|aac|aacp|aac\+|ogg|vorbis|hls|low|high|mobile|hq|lq|hi[-\s]?fi|\d{1,3}\s*kbps|\d{1,3}\s*k\b|stream|live|listen|online|radio|fm|am)\b", re.I)


def find(uuid: str) -> Path | None:
    for p in STATIONS.glob(f'*/{uuid}.yaml'):
        return p
    return None


def host(u: str) -> str:
    try: return ((urlsplit(u or '').hostname or '').lower()).removeprefix('www.')
    except Exception: return ''


def tokens(name: str) -> set[str]:
    s = re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]', ' ', name or '')
    s = NOISE.sub(' ', s)
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return {t for t in re.sub(r'[^\w\s]+', ' ', s).lower().split() if len(t) > 1}


def similar(a: dict, b: dict) -> bool:
    if host(a.get('homepage')) and host(a.get('homepage')) == host(b.get('homepage')): return True
    if host(a.get('url')) and host(a.get('url')) == host(b.get('url')): return True
    ta, tb = tokens(a.get('name', '')), tokens(b.get('name', ''))
    if not ta or not tb: return False
    return len(ta & tb) / max(len(ta), len(tb)) >= 0.8


def yq(v: str) -> str:
    return "'" + v.replace("'", "''") + "'"


def fold_stream(auth_text: str, auth: dict, dup: dict) -> tuple[str, bool]:
    """Append dup's stream to the authority's streams block (create it if needed)."""
    url = (dup.get('url') or '').strip()
    if not url.lower().startswith('http'): return auth_text, False
    existing = [s.get('url') for s in (auth.get('streams') or [])] or [auth.get('url')]
    if url in existing or (dup.get('url_resolved') or '') in existing: return auth_text, False

    def entry(s: dict) -> str:
        lines = [f"  - url: {yq(s.get('url') or '')}"]
        if s.get('url_resolved') and s.get('url_resolved') != s.get('url'):
            lines.append(f"    url_resolved: {yq(s['url_resolved'])}")
        if s.get('codec'): lines.append(f"    codec: {s['codec']}")
        if int(s.get('bitrate') or 0): lines.append(f"    bitrate: {int(s['bitrate'])}")
        if s.get('hls'): lines.append('    hls: true')
        return '\n'.join(lines) + '\n'

    m = RE_STREAMS_BLOCK.search(auth_text)
    if m:
        block = m.group(0)
        if not block.endswith('\n'): block += '\n'
        return auth_text[:m.start()] + block + entry(dup) + auth_text[m.end():], True
    # No streams block yet: synthesise one from the authority's primary + the dup.
    primary = {k: auth.get(k) for k in ('url', 'url_resolved', 'codec', 'bitrate', 'hls')}
    return auth_text.rstrip('\n') + '\nstreams:\n' + entry(primary) + entry(dup), True


def merge_provenance(auth_text: str, auth: dict, dup: dict) -> tuple[str, bool]:
    have = set(auth.get('provenance') or [])
    add = [p for p in (dup.get('provenance') or []) if p not in have]
    if not add: return auth_text, False
    m = RE_PROV_BLOCK.search(auth_text)
    new_lines = ''.join(f'  - {p}\n' for p in add)
    if m:
        block = m.group(0)
        if not block.endswith('\n'): block += '\n'
        if block.startswith('provenance: []'):
            block = 'provenance:\n'
        return auth_text[:m.start()] + block + new_lines + auth_text[m.end():], True
    return auth_text.rstrip('\n') + '\nprovenance:\n' + new_lines, True


def write_dup(dup_text: str, target: str) -> str:
    line = f'duplicate_of: {target}'
    if RE_DUP_LINE.search(dup_text):
        return RE_DUP_LINE.sub(line, dup_text, count=1)
    m = RE_CURATION_LINE.search(dup_text)
    if m:
        return dup_text[:m.end()] + '\n' + line + dup_text[m.end():]
    return dup_text.rstrip('\n') + '\n' + line + '\n'


def fix_chains(dry_run: bool) -> None:
    """Re-point every `duplicate_of` at the final canonical station.

    A → B → C leaves A's redirect breadcrumb aimed at another duplicate, which
    the build pipeline skips, so the link dead-ends. Collapse every chain to the
    canonical tail. Cycles and targets that do not exist are reported, not
    rewritten.
    """
    target: dict[str, str] = {}
    path_of: dict[str, Path] = {}
    for p in STATIONS.glob('*/*.yaml'):
        try: d = yaml.safe_load(p.read_text(encoding='utf-8')) or {}
        except Exception: continue
        u = (d.get('stationuuid') or '').strip()
        if not u: continue
        path_of[u] = p
        t = (d.get('duplicate_of') or '').strip()
        if t: target[u] = t

    def clear_dup(u: str) -> None:
        p = path_of[u]
        text = p.read_text(encoding='utf-8')
        if not dry_run:
            p.write_text(re.sub(r'^duplicate_of:.*\n?', '', text, count=1, flags=re.M), encoding='utf-8')
        target.pop(u, None)

    # A station that is (transitively) its own duplicate is invisible: the build
    # skips it and its redirect never lands on a real page. Break every cycle by
    # promoting one member back to canonical.
    freed = 0
    for u in sorted(target):
        if target.get(u) == u:
            clear_dup(u); freed += 1
    for u in sorted(target):
        seen, cur = {u}, u
        while cur in target:
            cur = target[cur]
            if cur not in path_of: break
            if cur in seen:
                cycle = sorted(seen, key=lambda x: -int((yaml.safe_load(path_of[x].read_text(encoding='utf-8')) or {}).get('votes') or 0))
                clear_dup(cycle[0]); freed += 1
                break
            seen.add(cur)
    if freed: print(f'cycles: promoted {freed} self-referencing stations back to canonical')

    def final(u: str) -> str | None:
        seen, cur = {u}, u
        while cur in target:
            cur = target[cur]
            if cur in seen or cur not in path_of: return None
            seen.add(cur)
        return cur

    fixed = broken = 0
    for u, t in sorted(target.items()):
        f = final(u)
        if f is None:
            broken += 1
            print(f'  unresolvable chain from {u} -> {t}')
            continue
        if f == t: continue
        p = path_of[u]
        text = p.read_text(encoding='utf-8')
        if not dry_run:
            p.write_text(RE_DUP_LINE.sub(f'duplicate_of: {f}', text, count=1), encoding='utf-8')
        fixed += 1
    print(f'chain fix: {fixed} re-pointed to the canonical tail, {broken} unresolvable')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inputs', nargs='*')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--fix-chains', action='store_true',
                    help='collapse every duplicate_of chain to its canonical tail and exit')
    args = ap.parse_args()

    if args.fix_chains:
        fix_chains(args.dry_run)
        return

    pairs: dict[str, str] = {}
    origin: dict[str, str] = {}
    for src in args.inputs:
        data = json.loads(Path(src).read_text(encoding='utf-8'))
        if isinstance(data, dict) and 'clusters' in data:
            # Cluster verdicts carry an explicit authority choice (completeness
            # first, votes as tie-break), so their direction is authoritative.
            for c in data['clusters']:
                if c.get('verdict') in ('same', 'mixed') and c.get('authority'):
                    for d in c.get('duplicates') or []:
                        if d and d != c['authority']:
                            pairs[d] = c['authority']; origin[d] = 'cluster'
        else:
            # Per-station proposals were asked for only when the target has MORE
            # votes; a reversed pair means the agent matched the wrong entry.
            for r in data if isinstance(data, list) else data.get('results', []):
                if r.get('dup_proposed') and r.get('uuid'):
                    pairs[r['uuid']] = r['dup_proposed']; origin[r['uuid']] = 'report'
    print(f'{len(pairs)} proposed pairs')

    # Resolve chains: if the authority is itself proposed as a duplicate, follow it.
    def resolve(u: str, depth=0) -> str:
        while u in pairs and depth < 10:
            u = pairs[u]; depth += 1
        return u

    applied = rejected = 0
    reasons: dict[str, int] = {}
    for dup_uuid, auth_uuid in sorted(pairs.items()):
        auth_uuid = resolve(auth_uuid)
        if auth_uuid == dup_uuid:
            reasons['cycle'] = reasons.get('cycle', 0) + 1; rejected += 1; continue
        dp, apth = find(dup_uuid), find(auth_uuid)
        if not dp or not apth:
            reasons['missing'] = reasons.get('missing', 0) + 1; rejected += 1; continue
        dtext, atext = dp.read_text(encoding='utf-8'), apth.read_text(encoding='utf-8')
        dup, auth = yaml.safe_load(dtext) or {}, yaml.safe_load(atext) or {}
        if (auth.get('duplicate_of') or '').strip():
            reasons['authority-not-canonical'] = reasons.get('authority-not-canonical', 0) + 1; rejected += 1; continue
        if (dup.get('duplicate_of') or '').strip() == auth_uuid:
            reasons['already'] = reasons.get('already', 0) + 1; continue
        if not similar(auth, dup):
            reasons['not-similar'] = reasons.get('not-similar', 0) + 1; rejected += 1
            print(f'  reject (not similar): "{dup.get("name")}" -> "{auth.get("name")}"')
            continue
        if origin.get(dup_uuid) == 'report' and int(auth.get('votes') or 0) < int(dup.get('votes') or 0):
            reasons['reversed-votes'] = reasons.get('reversed-votes', 0) + 1; rejected += 1
            print(f'  reject (target less popular): "{dup.get("name")}" ({dup.get("votes")}) -> "{auth.get("name")}" ({auth.get("votes")})')
            continue
        atext, s1 = fold_stream(atext, auth, dup)
        atext, s2 = merge_provenance(atext, auth, dup)
        dtext = write_dup(dtext, auth_uuid)
        if not args.dry_run:
            dp.write_text(dtext, encoding='utf-8')
            if s1 or s2: apth.write_text(atext, encoding='utf-8')
        applied += 1
        print(f'  dup: "{dup.get("name")}" ({dup.get("votes")}) -> "{auth.get("name")}" ({auth.get("votes")})' + (' +stream' if s1 else ''))

    # Fix chains: any file whose duplicate_of points at a station that is now a duplicate.
    if not args.dry_run and applied:
        import subprocess
        out = subprocess.run(['grep', '-rl', '--include=*.yaml', '^duplicate_of: ', str(STATIONS)], capture_output=True, text=True).stdout.split()
        fixed = 0
        for f in out:
            p = Path(f)
            t = p.read_text(encoding='utf-8')
            m = RE_DUP_LINE.search(t)
            if not m: continue
            target = m.group(0).split(':', 1)[1].strip()
            final = resolve(target)
            if final != target and find(final):
                p.write_text(RE_DUP_LINE.sub(f'duplicate_of: {final}', t, count=1), encoding='utf-8'); fixed += 1
        if fixed: print(f'  re-pointed {fixed} chained duplicate_of values')

    print(f'applied: {applied}  rejected: {rejected}  {reasons}')


if __name__ == '__main__':
    main()
