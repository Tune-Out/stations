#!/usr/bin/env python3
"""
Restore the original StreamTheWorld aggregator URL to the `url:` field,
moving the previously-resolved CDN URL to `url_resolved:`.

The earlier unwrap script overwrote both fields with the CDN URL, which is
the wrong shape for catalog metadata — radio-browser's convention (which
this catalog inherits) is:

    url           = the registered / official aggregator URL
    url_resolved  = the URL after following redirects (direct stream)

Since the original aggregator URL was overwritten, we reconstruct it from
the CDN URL using the documented StreamTheWorld mount-point conventions:

    CDN path ends in `_SC`              → `pls/<stem>.pls` form
    CDN path ends in .mp3 / .aac / etc. → `api/livestream-redirect/<file>` form

The SPA's audio player now prefers `url_resolved` (the CDN URL), so the
ad-bypass benefit is preserved even though `url:` is reverted. See
refFromRow() in src/spa/types.ts.

This script ONLY touches the top-level url / url_resolved fields. The
streams: block (which carries multiple codec/bitrate variants) is left
alone — each entry there is a playable stream in its own right.
"""
import re, sys, time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"

RE_URL_LINE  = re.compile(r"^url:\s*(\S.*)$", re.M)
RE_URLR_LINE = re.compile(r"^url_resolved:\s*(\S.*)$", re.M)

# Match CDN URLs only — leave everything else alone.
RE_CDN_URL = re.compile(
    r"^(https?)://(\d+)\.live\.streamtheworld\.com(?::\d+)?/(.+)$",
    re.I,
)


def unquote(s: str) -> str:
    return s.strip().strip("'\"")


def build_aggregator_url(scheme: str, path: str) -> str:
    """Reverse the StreamTheWorld mount conventions to recover the
    aggregator URL that originally redirected to the CDN."""
    # Path forms observed:
    #   977_HITS_SC                 → /pls/977_HITS.pls
    #   LOS40.mp3 / LOS40.aac       → /api/livestream-redirect/LOS40.mp3
    #   STATION.m3u8                → /api/livestream-redirect/STATION.m3u8
    # Strip any leading slash (matched group already handles this).
    path = path.lstrip("/")
    # Drop trailing path segment if it's something like "stream" — unusual,
    # leave as-is; the StreamTheWorld API tolerates variants.
    if path.endswith("_SC"):
        stem = path[:-3]  # drop "_SC"
        return f"{scheme}://playerservices.streamtheworld.com/pls/{stem}.pls"
    return f"{scheme}://playerservices.streamtheworld.com/api/livestream-redirect/{path}"


def maybe_restore(path: Path) -> str:
    """Returns 'ok' | 'skip' | 'fail'."""
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return "fail"

    m_url = RE_URL_LINE.search(text)
    if not m_url:
        return "skip"
    url_val = unquote(m_url.group(1))
    cdn_match = RE_CDN_URL.match(url_val)
    if not cdn_match:
        return "skip"
    scheme = cdn_match.group(1).lower()
    cdn_path = cdn_match.group(3)
    aggregator = build_aggregator_url(scheme, cdn_path)

    # Rewrite url: → aggregator, url_resolved: → cdn (the previous url).
    new_text = RE_URL_LINE.sub(f"url: '{aggregator}'", text, count=1)
    # url_resolved: replace if present, else insert right after url:.
    if RE_URLR_LINE.search(new_text):
        new_text = RE_URLR_LINE.sub(f"url_resolved: '{url_val}'", new_text, count=1)
    else:
        new_text = RE_URL_LINE.sub(
            lambda m: m.group(0) + f"\nurl_resolved: '{url_val}'",
            new_text, count=1,
        )
    if new_text == text:
        return "skip"
    path.write_text(new_text, encoding="utf-8")
    return "ok"


def process_shard(shard_name: str) -> dict:
    counts = {"ok": 0, "skip": 0, "fail": 0}
    sd = STATIONS / shard_name
    for p in sd.glob("*.yaml"):
        r = maybe_restore(p)
        counts[r] = counts.get(r, 0) + 1
    return counts


def main():
    shards = sorted(d.name for d in STATIONS.iterdir() if d.is_dir())
    print(f"[restore-aggregator-url] scanning {len(shards)} shards…", flush=True)
    started = time.time()
    totals = {"ok": 0, "skip": 0, "fail": 0}
    with ProcessPoolExecutor(max_workers=min(16, os.cpu_count() or 4)) as ex:
        futs = {ex.submit(process_shard, s): s for s in shards}
        done = 0
        for f in as_completed(futs):
            for k, v in f.result().items(): totals[k] = totals.get(k, 0) + v
            done += 1
            if done % 32 == 0 or done == len(shards):
                print(f"  {done}/{len(shards)} shards  +{totals['ok']} restored", flush=True)
    dur = time.time() - started
    print(f"\n[restore-aggregator-url] done in {dur:.1f}s")
    print(f"  restored: {totals['ok']}")
    print(f"  skipped:  {totals['skip']}")
    print(f"  failed:   {totals['fail']}")


if __name__ == "__main__":
    main()
