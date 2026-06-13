#!/usr/bin/env python3
"""
Bypass StreamTheWorld's ad-injection front-end by replacing aggregator
URLs with the underlying direct-stream URL.

Two URL patterns we unwrap:

  1. http(s)://playerservices.streamtheworld.com/pls/STATION.pls
     → fetch the .pls, parse File1, use that direct URL.

  2. http(s)://playerservices.streamtheworld.com/api/livestream-redirect/STATION.mp3
     → follow the HTTP 302, use the final URL (host like
       `15313.live.streamtheworld.com:80/STATION_SC`).

  3. http(s)://provisioning.streamtheworld.com/...
     → same idea: follow redirects.

The unwrapped URL is the CDN mountpoint itself, which does NOT run through
the ad-injection wrapper. Stream ads still happen if the station owner
inserts them upstream, but the aggregator's pre-roll is bypassed.

Other aggregators (iHeart/Revma, Live365, RadioKing) are NOT touched —
iHeart redirects expire (token-bearing URLs), Live365 and RadioKing are
just hosting services rather than ad-injecting front-ends.
"""
import argparse, json, re, ssl, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"
UA = "Mozilla/5.0 (compatible; TuneOutBot/3.0; +https://tune-out.app)"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Hosts whose URLs we know how to unwrap.
UNWRAP_HOSTS = {
    "playerservices.streamtheworld.com",
    "provisioning.streamtheworld.com",
}

RE_PLS_FILE1 = re.compile(r"^File1\s*=\s*(\S.*)$", re.M)

def is_unwrap_candidate(url: str) -> bool:
    if not isinstance(url, str) or not url: return False
    try: host = (urlsplit(url).hostname or "").lower()
    except Exception: return False
    return host in UNWRAP_HOSTS


def unwrap(url: str, timeout: int = 8) -> str | None:
    """Returns the underlying CDN URL or None if unwrap failed."""
    try:
        # Case 1: .pls fetch + parse
        if url.lower().endswith(".pls"):
            r = urlopen(Request(url, headers={"User-Agent": UA}), timeout=timeout, context=ctx)
            body = r.read(8192).decode("utf-8", errors="replace")
            r.close()
            m = RE_PLS_FILE1.search(body)
            if m: return m.group(1).strip()
            return None
        # Case 2 / 3: follow redirect
        # Use a HEAD-like range request so we don't pull audio bytes.
        r = urlopen(Request(url, headers={"User-Agent": UA, "Range": "bytes=0-127"}), timeout=timeout, context=ctx)
        final = r.geturl()
        r.close()
        # Sanity: must have followed somewhere
        if final and final != url:
            try:
                host = (urlsplit(final).hostname or "").lower()
                if host in UNWRAP_HOSTS:
                    return None  # didn't actually unwrap — same aggregator
                return final
            except Exception:
                return None
        return None
    except Exception:
        return None


# ─── YAML editing ─────────────────────────────────────────────────────────

RE_URL_LINE = re.compile(r"^url:\s*(\S.*)$", re.M)
RE_URLR_LINE = re.compile(r"^url_resolved:\s*(\S.*)$", re.M)
RE_STREAMS_BLOCK = re.compile(r"^streams:[\s\S]*?(?=^[^\s#-]|\Z)", re.M)
RE_STREAM_URL_LINE = re.compile(r"^(\s+- url:\s*)(\S.*)$", re.M)


def unwrap_value(s: str) -> str:
    return s.strip().strip("'\"")


def write_url_line(text: str, regex: re.Pattern, new_url: str) -> str:
    """Surgical replace, preserving the YAML-quoted form."""
    return regex.sub(lambda m: m.group(0).split(":", 1)[0] + f": '{new_url}'", text, count=1)


def patch_yaml(path: Path, replacements: dict[str, str]) -> bool:
    """replacements maps {old_url → new_url}. Updates url, url_resolved, and
    every matching entry in the streams: block. Returns True if changed."""
    text = path.read_text(encoding="utf-8")
    changed = False

    # url:
    m = RE_URL_LINE.search(text)
    if m and unwrap_value(m.group(1)) in replacements:
        new_url = replacements[unwrap_value(m.group(1))]
        text = RE_URL_LINE.sub(f"url: '{new_url}'", text, count=1)
        changed = True

    # url_resolved:
    m = RE_URLR_LINE.search(text)
    if m and unwrap_value(m.group(1)) in replacements:
        new_url = replacements[unwrap_value(m.group(1))]
        text = RE_URLR_LINE.sub(f"url_resolved: '{new_url}'", text, count=1)
        changed = True

    # streams: block (multi-entry)
    def streams_sub(mblock):
        block = mblock.group(0)
        def line_sub(ml):
            prefix, val = ml.group(1), unwrap_value(ml.group(2))
            if val in replacements:
                return f"{prefix}'{replacements[val]}'"
            return ml.group(0)
        new_block = RE_STREAM_URL_LINE.sub(line_sub, block)
        return new_block
    new_text = RE_STREAMS_BLOCK.sub(streams_sub, text)
    if new_text != text:
        text = new_text
        changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


# ─── Main ─────────────────────────────────────────────────────────────────

def collect_targets() -> list[tuple[Path, list[str]]]:
    """Scan YAMLs; return [(path, [aggregator_urls])] for stations whose
    primary url or any streams[] entry hits an unwrap host."""
    out = []
    for shard in sorted(STATIONS.iterdir()):
        if not shard.is_dir(): continue
        for p in shard.glob("*.yaml"):
            try:
                d = yaml.safe_load(p.read_text(encoding="utf-8"))
            except Exception:
                continue
            if not isinstance(d, dict): continue
            if (d.get("duplicate_of") or "").strip(): continue
            urls = set()
            for k in ("url", "url_resolved"):
                v = d.get(k)
                if isinstance(v, str) and is_unwrap_candidate(v): urls.add(v)
            for s in d.get("streams") or []:
                if isinstance(s, dict):
                    su = s.get("url")
                    if isinstance(su, str) and is_unwrap_candidate(su): urls.add(su)
            if urls:
                out.append((p, sorted(urls)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=64)
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    t0 = time.time()
    print("[unwrap] scanning catalog…", flush=True)
    targets = collect_targets()
    if args.limit: targets = targets[:args.limit]
    total_urls = sum(len(urls) for _, urls in targets)
    print(f"  {len(targets)} stations with {total_urls} aggregator URLs", flush=True)

    # Dedup the URL set so we don't unwrap the same aggregator URL twice.
    unique_urls = {u for _, urls in targets for u in urls}
    print(f"  {len(unique_urls)} unique aggregator URLs to unwrap", flush=True)

    # Parallel unwrap
    print("[unwrap] fetching underlying URLs…", flush=True)
    resolved: dict[str, str] = {}
    failed = 0
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(unwrap, u): u for u in unique_urls}
        done = 0
        for f in as_completed(futs):
            url = futs[f]
            result = f.result()
            done += 1
            if result: resolved[url] = result
            else: failed += 1
            if done % 200 == 0:
                rate = done / max(time.time() - started, 0.001)
                print(f"  {done}/{len(unique_urls)}  ok={len(resolved)} fail={failed}  ({rate:.1f}/s)", flush=True)
    print(f"\n[unwrap] unwrap pass done")
    print(f"  resolved: {len(resolved)}")
    print(f"  failed:   {failed}")

    # Apply replacements
    print(f"\n[unwrap] applying replacements…", flush=True)
    rewrites = 0
    skipped = 0
    for path, urls in targets:
        applicable = {u: resolved[u] for u in urls if u in resolved}
        if not applicable:
            skipped += 1
            continue
        try:
            if patch_yaml(path, applicable):
                rewrites += 1
        except Exception as e:
            print(f"  warn: {path.name}: {e}")

    dur = time.time() - t0
    print(f"\n[unwrap] done in {dur:.1f}s")
    print(f"  YAMLs rewritten: {rewrites}")
    print(f"  YAMLs skipped (no resolvable URL): {skipped}")

    # Persist a quick report
    report = {
        "stations_with_aggregator_url": len(targets),
        "unique_urls_attempted": len(unique_urls),
        "urls_resolved": len(resolved),
        "urls_failed": failed,
        "yamls_rewritten": rewrites,
    }
    Path("/tmp/unwrap-report.json").write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
