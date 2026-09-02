#!/usr/bin/env python3
"""
Write new station YAMLs from the discovery workflow's candidate list.

Input JSON: { "candidates": [ { name, stream_url, stream_codec, stream_bitrate,
  stream_hls, homepage, favicon, country, countrycode, state, languages, tags,
  nature, score, operator, affiliations, audience, format, notes, sources,
  why_notable }, ... ] }

For each candidate:
  1. Skip if the catalog already has it — matched by normalized stream URL,
     by (homepage host + normalized name), or by (normalized name + country).
  2. Re-verify the stream (HTTP 200/206 with an audio / playlist content type).
  3. Mint a UUID (v5 over the normalized stream URL so re-runs are idempotent),
     shard by sha1 like scripts/lib/shard.ts, and write the YAML in the same
     layout as the rest of the catalog with a filled research block, the
     agent's curation score, and provenance `tuneout-<uuid>`.
Tags are filtered to the canonical vocabulary; languages must be ISO-639-1.

Usage: python3 scripts/add-discovered-stations.py candidates.json [--dry-run] [--date 2026-09-02]
"""
from __future__ import annotations

import argparse, hashlib, json, re, ssl, unicodedata, uuid as uuid_mod
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / 'data' / 'stations'
UA = 'Mozilla/5.0 (compatible; TuneOutBot/3.0; +https://tune-out.app)'
NAMESPACE = uuid_mod.UUID('6ba7b811-9dad-11d1-80b4-00c04fd430c8')  # uuid.NAMESPACE_URL

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

CANONICAL_TAGS = set('''pop rock jazz classical blues folk country electronic dance house techno trance edm
ambient lounge chillout downtempo drum-and-bass dubstep hip-hop rap r-and-b soul funk disco reggae reggaeton ska
metal hardcore punk indie alternative classic-rock soft-rock hard-rock prog-rock pop-rock gospel christian-music opera
instrumental soundtrack smooth-jazz synthpop new-wave oldies hits top-40 classic-hits adult-contemporary ballad romantic
retro experimental lofi latin salsa cumbia merengue tropical regional-mexican bollywood k-pop j-pop anime arabic-music
world 50s 60s 70s 80s 90s 2000s 2010s news news-talk talk sports sports-talk comedy public-radio community-radio
local-news religious catholic islamic culture education politics business lifestyle kids podcast party sleep'''.split())
AUDIO_TYPES = ('audio/', 'application/ogg', 'mpegurl', 'application/octet-stream', 'video/mp2t')
NOISE = re.compile(r"\b(hd|sd|opus|flac|mp3|aac|aacp|aac\+|ogg|vorbis|hls|low|high|mobile|hq|lq|\d{1,3}\s*kbps|\d{1,3}\s*k\b|stream|live|listen|online)\b", re.I)


def nurl(raw: str) -> str:
    if not raw or not raw.lower().startswith(('http://', 'https://')): return ''
    try: sp = urlsplit(raw.strip())
    except Exception: return ''
    host = (sp.hostname or '').lower()
    if not host: return ''
    port = sp.port
    if (port == 80 and sp.scheme == 'http') or (port == 443 and sp.scheme == 'https'): port = None
    return f"://{host}{':' + str(port) if port else ''}{sp.path.rstrip('/')}"


def host(u: str) -> str:
    try: return ((urlsplit(u or '').hostname or '').lower()).removeprefix('www.')
    except Exception: return ''


def nname(s: str) -> str:
    s = re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]', ' ', s or '')
    s = NOISE.sub(' ', s)
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]+', ' ', s)).strip().lower()


def shard(uuid: str) -> str:
    return hashlib.sha1(uuid.encode()).hexdigest()[:2]


def yq(v) -> str:
    s = '' if v is None else ' '.join(str(v).split())
    if not s: return '""'
    out = yaml.safe_dump(s, allow_unicode=True, width=1_000_000, default_flow_style=True).strip()
    return out[:-4].rstrip() if out.endswith('\n...') else out


def stream_ok(url: str) -> tuple[bool, str]:
    try:
        req = Request(url, headers={'User-Agent': UA, 'Range': 'bytes=0-2047', 'Icy-MetaData': '1'})
        r = urlopen(req, timeout=12, context=ctx)
        ct = (r.headers.get('Content-Type') or '').lower()
        head = r.read(512)
        r.close()
        if r.status not in (200, 206): return False, f'http {r.status}'
        if any(t in ct for t in AUDIO_TYPES) or head.startswith(b'#EXTM3U') or head.startswith(b'ID3') or head[:2] == b'\xff\xfb':
            return True, ct
        return False, f'content-type {ct}'
    except Exception as e:
        return False, f'{type(e).__name__}: {e}'[:120]


def load_catalog() -> tuple[set, set, set]:
    urls, hp_name, name_cc = set(), set(), set()
    for p in STATIONS.glob('*/*.yaml'):
        try: d = yaml.safe_load(p.read_text(encoding='utf-8')) or {}
        except Exception: continue
        u = nurl(d.get('url') or '')
        if u: urls.add(u)
        for s in d.get('streams') or []:
            su = nurl((s or {}).get('url') or '')
            if su: urls.add(su)
        n = nname(d.get('name') or '')
        h = host(d.get('homepage') or '')
        if h and n: hp_name.add((h, n))
        if n: name_cc.add((n, (d.get('countrycode') or '').upper()))
    return urls, hp_name, name_cc


def render(c: dict, uid: str, date: str, ok_ct: str) -> str:
    tags = sorted({t.strip().lower() for t in c.get('tags') or [] if t.strip().lower() in CANONICAL_TAGS})
    langs = sorted({l.strip().lower() for l in c.get('languages') or [] if re.fullmatch(r'[a-z]{2}', l.strip().lower())})
    codec = (c.get('stream_codec') or '').upper().replace('AAC+', 'AAC+')
    if not codec:
        codec = 'AAC' if 'aac' in ok_ct else 'MP3' if 'mpeg' in ok_ct else ''
    hls = bool(c.get('stream_hls')) or c['stream_url'].lower().endswith('.m3u8')
    if hls and not codec: codec = 'AAC'
    L = [
        f'stationuuid: {uid}',
        f'name: {yq(c["name"])}',
        f'url: {yq(c["stream_url"])}',
        f'url_resolved: {yq(c["stream_url"])}',
        f'homepage: {yq(c.get("homepage"))}',
        f'favicon: {yq(c.get("favicon"))}',
    ]
    L.append('tags:' if tags else 'tags: []'); L += [f'  - {t}' for t in tags]
    L.append(f'country: {yq(c.get("country"))}')
    L.append(f'countrycode: {(c.get("countrycode") or "").upper()}')
    L.append(f'state: {yq(c.get("state"))}')
    L.append('language:' if langs else 'language: []'); L += [f'  - {l}' for l in langs]
    L.append('languagecodes:' if langs else 'languagecodes: []'); L += [f'  - {l}' for l in langs]
    L += ['votes: 0', f'codec: {codec}' if codec else 'codec: ""', f'bitrate: {int(c.get("stream_bitrate") or 0)}',
          f'hls: {"true" if hls else "false"}', 'lastcheckok: true', f'lastchangetime: {date} 00:00:00', 'clickcount: 0',
          'geo_lat: null', 'geo_long: null', 'research:', f'  reviewed_at: {date}',
          f'  nature: {yq(c.get("nature"))}', f'  operator: {yq(c.get("operator"))}',
          f'  affiliations: {yq(c.get("affiliations"))}', f'  audience: {yq(c.get("audience"))}',
          f'  format: {yq(c.get("format"))}', f'  notes: {yq(c.get("notes"))}', f'  sources: {yq(c.get("sources"))}',
          f'curation: {max(-1.0, min(1.0, float(c.get("score") or 0))):.2f}', 'provenance:', f'  - tuneout-{uid}']
    return '\n'.join(L) + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('--date', default='2026-09-02')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    data = json.loads(Path(args.input).read_text(encoding='utf-8'))
    cands = data.get('candidates') if isinstance(data, dict) else data
    print(f'{len(cands)} candidates; loading catalog…')
    urls, hp_name, name_cc = load_catalog()

    seen_urls: set[str] = set()
    todo, skipped = [], {}
    for c in cands:
        name, su = (c.get('name') or '').strip(), (c.get('stream_url') or '').strip()
        if not name or not su.lower().startswith('http'):
            skipped['invalid'] = skipped.get('invalid', 0) + 1; continue
        nu, n, h, cc = nurl(su), nname(name), host(c.get('homepage') or ''), (c.get('countrycode') or '').upper()
        if nu in urls or nu in seen_urls:
            skipped['url-exists'] = skipped.get('url-exists', 0) + 1; continue
        if (h, n) in hp_name or (n, cc) in name_cc:
            skipped['name-exists'] = skipped.get('name-exists', 0) + 1
            print(f'  present: {name} ({cc})'); continue
        seen_urls.add(nu); name_cc.add((n, cc))
        todo.append(c)
    print(f'{len(todo)} new; skipped {skipped}')

    with ThreadPoolExecutor(max_workers=12) as ex:
        checks = list(ex.map(lambda c: stream_ok(c['stream_url']), todo))
    written = 0
    for c, (ok, info) in zip(todo, checks):
        if not ok:
            print(f'  stream FAIL {c["name"]}: {info}'); continue
        uid = str(uuid_mod.uuid5(NAMESPACE, nurl(c['stream_url'])))
        path = STATIONS / shard(uid) / f'{uid}.yaml'
        if path.exists():
            print(f'  exists: {path.name}'); continue
        text = render(c, uid, args.date, info)
        if args.dry_run:
            print(f'  would write {path.relative_to(ROOT)}: {c["name"]} [{c.get("countrycode")}] score={c.get("score")}')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding='utf-8')
            print(f'  wrote {path.relative_to(ROOT)}: {c["name"]} [{c.get("countrycode")}] score={c.get("score")}')
        written += 1
    print(f'written: {written}')


if __name__ == '__main__':
    main()
