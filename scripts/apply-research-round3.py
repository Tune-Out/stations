#!/usr/bin/env python3
"""
Apply round-3 workflow results back to station YAMLs.

Input JSON shape (from the workflow output):
  { "results": [
      { "uuid": "...", "delta": 0.15, "nature": "non-commercial",
        "favicon": "https://...", "evidence": "..." },
      ...
    ]
  }

For each result:
  1. Curation: add `delta` to the existing curation value, clamped to [-1, 1].
  2. Nature:   if non-empty AND differs from existing research.nature, update
               the value inside the research: block. Done via surgical line
               edit so the rest of the block stays untouched.
  3. Favicon:  if station currently has no favicon AND the candidate URL
               HEADs as a 2xx image, set it. Wikipedia thumb URLs get
               normalised — try original size, fall back to 250px, then
               drop /thumb/ for the source file.
"""
import argparse, json, re, ssl, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / 'data' / 'stations'
UA = 'Mozilla/5.0 (compatible; TuneOutBot/3.0; +https://tune-out.app)'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

RE_CURATION_LINE = re.compile(r'^curation:\s*(-?\d+(?:\.\d+)?)\s*$', re.M)
RE_FAVICON_LINE  = re.compile(r'^favicon:\s*(?:"[^"\n]*"|\S.*?)\s*$', re.M)
RE_RESEARCH_BLOCK = re.compile(r'^research:\s*$\n([\s\S]*?)(?=^[^\s#]|\Z)', re.M)
RE_NATURE_IN_BLOCK = re.compile(r'^(  nature:\s*)(.*)$', re.M)
RE_WM_THUMB = re.compile(r'^(https?://upload\.wikimedia\.org/wikipedia/[^/]+)/thumb/([^/]+/[^/]+/[^/]+)/(\d+px-[^/]+)$')


def find_shard(uuid: str) -> Path | None:
    sd = STATIONS / uuid[:2] / f"{uuid}.yaml"
    if sd.exists(): return sd
    matches = list(STATIONS.glob(f"*/{uuid}.yaml"))
    return matches[0] if matches else None


def head_ok(url: str) -> bool:
    for method in ('HEAD', 'GET'):
        try:
            req = Request(url, method=method, headers={'User-Agent': UA, 'Range': 'bytes=0-2047'})
            r = urlopen(req, timeout=6, context=ctx)
            status, ct = r.status, (r.headers.get('Content-Type') or '').lower()
            r.close()
            if status in (200, 206):
                return 'image/' in ct or ct.rsplit('/', 1)[-1] in ('x-icon', 'ico', 'vnd.microsoft.icon')
        except Exception:
            continue
    return False


def favicon_candidates(url: str):
    yield url
    m = RE_WM_THUMB.match(url)
    if m:
        prefix, path, last = m.group(1), m.group(2), m.group(3)
        yield f'{prefix}/thumb/{path}/{re.sub(r"^\d+px-", "250px-", last)}'
        yield f'{prefix}/{path}'


def apply_curation_delta(text: str, delta: float) -> tuple[str, bool]:
    m = RE_CURATION_LINE.search(text)
    if not m: return text, False
    try: cur = float(m.group(1))
    except: return text, False
    new = max(-1.0, min(1.0, round(cur + delta, 2)))
    if new == cur: return text, False
    return RE_CURATION_LINE.sub(f"curation: {new:.2f}", text, count=1), True


def apply_nature_update(text: str, new_nature: str) -> tuple[str, bool]:
    """Update research.nature in-place. Does NOT create the field — only
    rewrites it when both the research block and the nature line exist."""
    bm = RE_RESEARCH_BLOCK.search(text)
    if not bm: return text, False
    block = bm.group(0)
    nm = RE_NATURE_IN_BLOCK.search(block)
    if not nm: return text, False
    current = nm.group(2).strip().strip('"').strip("'")
    if current == new_nature: return text, False
    new_block = RE_NATURE_IN_BLOCK.sub(f"\\g<1>{new_nature}", block, count=1)
    return text[:bm.start()] + new_block + text[bm.end():], True


def apply_favicon(text: str, url: str) -> tuple[str, bool]:
    """Only if current favicon is empty/non-http AND the URL HEADs cleanly."""
    fm = RE_FAVICON_LINE.search(text)
    if not fm: return text, False
    current = fm.group(0).split(':', 1)[1].strip().strip('"').strip("'")
    if current.startswith('http'): return text, False
    for cand in favicon_candidates(url):
        if head_ok(cand):
            return RE_FAVICON_LINE.sub(f"favicon: {cand}", text, count=1), True
    return text, False


def process_one(result: dict) -> dict:
    uuid = result.get('uuid') or ''
    if not uuid: return {'status': 'skip-empty'}
    path = find_shard(uuid)
    if not path: return {'status': 'miss'}

    text = path.read_text(encoding='utf-8')
    actions = []

    delta = float(result.get('delta') or 0.0)
    if delta != 0:
        text, changed = apply_curation_delta(text, delta)
        if changed: actions.append('curation')

    nature = (result.get('nature') or '').strip()
    if nature:
        text, changed = apply_nature_update(text, nature)
        if changed: actions.append('nature')

    favicon = (result.get('favicon') or '').strip()
    if favicon.startswith('http'):
        text, changed = apply_favicon(text, favicon)
        if changed: actions.append('favicon')

    if actions:
        path.write_text(text, encoding='utf-8')
        return {'status': 'ok', 'actions': actions, 'uuid': uuid}
    return {'status': 'noop'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input', nargs='?', default='scripts/research-round3.json')
    ap.add_argument('--workers', type=int, default=32)
    args = ap.parse_args()

    data = json.loads(Path(args.input).read_text(encoding='utf-8'))
    results = data.get('results') or data
    print(f'[round-3] {len(results)} suggestions')

    by_status = {}
    by_action = {'curation': 0, 'nature': 0, 'favicon': 0}
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one, r): r for r in results}
        for f in as_completed(futs):
            r = f.result()
            by_status[r['status']] = by_status.get(r['status'], 0) + 1
            for a in r.get('actions', []):
                by_action[a] = by_action.get(a, 0) + 1
    print('status:')
    for k, v in sorted(by_status.items()):
        print(f'  {k:>12}: {v}')
    print('actions:')
    for k, v in sorted(by_action.items()):
        print(f'  {k:>12}: {v}')


if __name__ == '__main__':
    main()
