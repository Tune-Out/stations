#!/usr/bin/env python3
"""
Apply agent-suggested favicon URLs to station YAMLs after validating that
each candidate URL actually serves an image.

Input JSON shape (same as the workflow output):
  { "results": [
      { "uuid": "...", "favicon": "https://example.com/logo.png",
        "evidence": "Wikipedia logo" },
      ...
    ]
  }

For each suggestion:
  1. Only act when the existing YAML's favicon is empty / non-http.
  2. HEAD the suggested URL; require 200/206 + image/* content-type
     (or x-icon variants). Reject HTML 404 pages disguised as 200.
  3. Atomically rewrite the YAML's `favicon:` line.

Idempotent — if the suggestion already matches, no change.
"""
import argparse, json, re, ssl, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"
UA = "TuneOutFaviconBot/2.0 (+https://tune-out.app)"
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

RE_FAVICON_LINE = re.compile(r'^favicon:\s*(?:"[^"\n]*"|\S.*?)\s*$', re.M)


def head_ok(url):
    try:
        req = Request(url, method="HEAD", headers={"User-Agent": UA})
        r = urlopen(req, timeout=6, context=SSL_CTX)
        status, ct = r.status, (r.headers.get("Content-Type") or "").lower()
        r.close()
    except HTTPError as e:
        if e.code != 405: return False
        try:
            req = Request(url, headers={"User-Agent": UA, "Range": "bytes=0-2047"})
            r = urlopen(req, timeout=6, context=SSL_CTX)
            status, ct = r.status, (r.headers.get("Content-Type") or "").lower()
            r.close()
        except Exception:
            return False
    except Exception:
        return False
    if status not in (200, 206): return False
    if "image/" in ct: return True
    last = ct.rsplit("/", 1)[-1] if "/" in ct else ct
    return last in ("x-icon", "ico", "vnd.microsoft.icon")


def find_yaml(uuid):
    """Shard-by-hash isn't simple here — fall back to scanning by uuid."""
    sd = STATIONS / uuid[:2] / f"{uuid}.yaml"
    if sd.exists(): return sd
    matches = list(STATIONS.glob(f"*/{uuid}.yaml"))
    return matches[0] if matches else None


def patch(path, new_favicon):
    text = path.read_text(encoding="utf-8")
    new_line = f"favicon: {new_favicon}"
    if RE_FAVICON_LINE.search(text):
        text2 = RE_FAVICON_LINE.sub(new_line, text, count=1)
        if text2 == text: return False
        path.write_text(text2, encoding="utf-8")
        return True
    return False


def needs_lookup(data):
    fav = data.get("favicon") or ""
    if isinstance(fav, str): fav = fav.strip().strip('"').strip("'")
    else: fav = ""
    return not (fav.startswith("http"))


def process_one(result):
    uuid    = result.get("uuid")
    new_fav = (result.get("favicon") or "").strip()
    if not uuid or not new_fav or not new_fav.startswith("http"):
        return "skip-empty"
    path = find_yaml(uuid)
    if not path: return "miss"
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return "fail"
    if not isinstance(data, dict): return "fail"
    if not needs_lookup(data): return "skip-have"
    # Validate the URL serves an image.
    if not head_ok(new_fav): return "invalid"
    return "ok" if patch(path, new_fav) else "noop"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", nargs="?", default="scripts/favicon-suggestions.json")
    ap.add_argument("--workers", type=int, default=48)
    args = ap.parse_args()

    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    results = data.get("results") or data
    if not isinstance(results, list):
        print(f"unexpected shape: {type(results).__name__}")
        sys.exit(2)
    print(f"[apply-favicon] {len(results)} suggestions")

    counts = {}
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one, r): r for r in results}
        for f in as_completed(futs):
            counts[f.result()] = counts.get(f.result(), 0) + 1
    print("breakdown:")
    for k in sorted(counts):
        print(f"  {k:>12}: {counts[k]}")


if __name__ == "__main__":
    main()
