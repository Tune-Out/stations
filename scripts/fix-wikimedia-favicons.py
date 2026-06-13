#!/usr/bin/env python3
"""
Find every station whose favicon URL is a Wikimedia /thumb/ image and
normalise it to a thumb size Wikimedia will actually serve.

Wikimedia rejects arbitrary thumb sizes with HTTP 400 ("Use thumbnail
sizes listed on https://w.wiki/...") — only a handful of standard sizes
are pre-rendered per file. 250px is universally cached. 1024px and most
other large sizes 400 for most files.

For each Wikimedia thumb URL:
  1. HEAD it. If 200 → leave alone, the size happens to be cached.
  2. Otherwise try, in order: 250px, 320px, then the original file
     (drop /thumb/ and the /NNNpx-… suffix).
  3. The first that returns 2xx + image/* wins.

If everything fails, leave the URL alone (the station-card fallback will
show the radio emoji).
"""
import argparse, re, ssl, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"
UA = "Mozilla/5.0 (compatible; TuneOutBot/3.0; +https://tune-out.app)"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

RE_WM_THUMB = re.compile(
    r"^(https?://upload\.wikimedia\.org/wikipedia/[^/]+)/thumb/([^/]+/[^/]+/[^/]+)/(\d+px-[^/]+)$"
)
RE_FAVICON_LINE = re.compile(r'^favicon:\s*(?:"[^"\n]*"|\S.*?)\s*$', re.M)


import time as _time
_last_request = [0.0]

def head_ok(url: str) -> bool:
    """HEAD with one retry on 429 (Wikimedia rate-limit)."""
    # Politeness: never more than ~2 requests per second to upload.wikimedia.org
    now = _time.time()
    elapsed = now - _last_request[0]
    if elapsed < 0.5:
        _time.sleep(0.5 - elapsed)
    _last_request[0] = _time.time()
    for attempt in range(3):
        try:
            r = urlopen(Request(url, method="HEAD", headers={"User-Agent": UA}), timeout=8, context=ctx)
            status, ct = r.status, (r.headers.get("Content-Type") or "").lower()
            r.close()
        except HTTPError as e:
            if e.code == 429 and attempt < 2:
                import time as _t; _t.sleep(2 + attempt * 3); continue
            return False
        except Exception:
            return False
        if status not in (200, 206): return False
        if "image/" in ct: return True
        return ct.rsplit("/", 1)[-1] in ("x-icon", "ico", "vnd.microsoft.icon", "svg+xml")
    return False


def normalised_candidates(url: str):
    """Yields candidate URLs in priority order."""
    yield url
    m = RE_WM_THUMB.match(url)
    if not m: return
    prefix, path, last = m.group(1), m.group(2), m.group(3)
    fileext = last.split("-", 1)[1] if "-" in last else last  # everything after "NNNpx-"
    # Try 250px (universally cached on Wikimedia), then 320px, then the original
    # file (no /thumb/ at all — every file serves at this URL).
    for size in (250, 320):
        candidate = f"{prefix}/thumb/{path}/{size}px-{fileext}"
        if candidate != url:
            yield candidate
    # Original file — drops the /thumb/ + /NNNpx-… suffix.
    yield f"{prefix}/{path}"


def resolve_one(url: str) -> tuple[str, str]:
    """Returns (status, new_url). status: 'ok'|'unchanged'|'fail'."""
    if not RE_WM_THUMB.match(url):
        return ("unchanged", url)
    # If the original is already serving, leave it alone.
    if head_ok(url):
        return ("unchanged", url)
    for cand in normalised_candidates(url):
        if cand == url: continue
        if head_ok(cand):
            return ("ok", cand)
    return ("fail", url)


def collect_targets() -> list[tuple[Path, str]]:
    """[(yaml_path, current_favicon_url), …] for every station with a
    Wikimedia /thumb/ favicon."""
    out = []
    for shard in sorted(STATIONS.iterdir()):
        if not shard.is_dir(): continue
        for p in shard.glob("*.yaml"):
            try:
                d = yaml.safe_load(p.read_text(encoding="utf-8"))
            except Exception:
                continue
            if not isinstance(d, dict): continue
            fav = (d.get("favicon") or "").strip()
            if isinstance(fav, str) and RE_WM_THUMB.match(fav):
                out.append((p, fav))
    return out


def write_favicon(path: Path, new_url: str) -> bool:
    text = path.read_text(encoding="utf-8")
    new_text = RE_FAVICON_LINE.sub(f"favicon: {new_url}", text, count=1)
    if new_text == text: return False
    path.write_text(new_text, encoding="utf-8")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=32)
    args = ap.parse_args()

    print("[fix-wm-fav] scanning…", flush=True)
    targets = collect_targets()
    print(f"  {len(targets)} stations with Wikimedia /thumb/ favicons", flush=True)

    # Dedup URLs (many stations may share the same logo)
    unique = {u for _, u in targets}
    print(f"  {len(unique)} unique URLs to validate/resolve", flush=True)

    resolved: dict[str, tuple[str, str]] = {}
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(resolve_one, u): u for u in unique}
        done = 0
        for f in as_completed(futs):
            u = futs[f]
            resolved[u] = f.result()
            done += 1
            if done % 50 == 0:
                rate = done / max(time.time() - started, 0.001)
                changed = sum(1 for s, _ in resolved.values() if s == "ok")
                failed  = sum(1 for s, _ in resolved.values() if s == "fail")
                print(f"  {done}/{len(unique)}  changed={changed} fail={failed}  ({rate:.1f}/s)", flush=True)

    # Counts
    changed = [u for u, (s, _) in resolved.items() if s == "ok"]
    unchanged = [u for u, (s, _) in resolved.items() if s == "unchanged"]
    failed = [u for u, (s, _) in resolved.items() if s == "fail"]
    print(f"\n[fix-wm-fav] URL resolution:")
    print(f"  changed:   {len(changed)}")
    print(f"  unchanged: {len(unchanged)} (already 200)")
    print(f"  failed:    {len(failed)}")

    # Apply rewrites
    written = 0
    for path, old_url in targets:
        status, new_url = resolved.get(old_url, ("unchanged", old_url))
        if status == "ok" and new_url != old_url:
            try:
                if write_favicon(path, new_url):
                    written += 1
            except Exception as e:
                print(f"  warn: {path.name}: {e}")
    print(f"\n[fix-wm-fav] YAMLs rewritten: {written}")


if __name__ == "__main__":
    main()
