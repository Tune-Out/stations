#!/usr/bin/env python3
"""
Merge codec/bitrate variants of the same station into one authoritative
record carrying ALL its streams.

Heuristic: two station YAMLs are variants of one station when they
share the SAME normalized name, country, and homepage host BUT have
different stream URLs (with different codec or bitrate).

Examples this catches:
  * "Adroit Jazz Underground" + "Adroit Jazz Underground HD Opus"
    (same WALM Radio jazz stream in MP3 + Opus)
  * "BBC Radio 1" MP3 64k + AAC 96k variants from the same homepage
  * stations with "(MP3)" / "(AAC)" / "[256k]" suffixes in the name

For each cluster:
  1. Pick the AUTHORITY by the same authority_score used in
     mark-duplicates.py (curation + completeness + popularity).
  2. Collect every variant's stream — url, codec, bitrate, hls,
     url_resolved — into the authority's `streams:` array, sorted by a
     preference order (Opus/FLAC > AAC > MP3, higher bitrate first).
  3. Mark the loser variants as `duplicate_of: <authority-uuid>` so
     build-data skips them. (The mark-duplicates URL-equality pass has
     already handled identical-URL duplicates; this pass handles
     URL-differing-but-same-station duplicates.)

Aggregator-URL blocklist: stream URLs whose host points to a known
aggregator/proxy (worldradio.online, tunein-redirect, etc.) are NOT
used for the URL-equality dedup pass elsewhere, and we also skip them
here as a defensive measure — they don't identify a real broadcast.
"""
from __future__ import annotations

import math, re, sys, time
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"

# Domains that proxy/multiplex many real stations — same URL there does
# NOT mean same station. The URL-equality dedup also defers to this list.
AGGREGATOR_HOSTS = {
    "worldradio.online", "tunein.com", "radio.garden", "streamtheworld.com",
    "playerservices.streamtheworld.com", "radiojar.com", "live365.com",
    "myradiolist.fm", "zeno.fm", "mytuner.global.ssl.fastly.net",
    "onlineradiobox.com",
}

# Tokens stripped when normalising a station's display name for variant
# grouping. Codec/bitrate noise — they vary by stream but not by station.
NAME_NOISE = re.compile(
    r"\b("
    r"hd|sd|opus|flac|mp3|aac|aacp|aac\+|ogg|vorbis|hls"
    r"|low|high|mobile|hq|lq"
    r"|\d{1,3}\s*kbps|\d{1,3}\s*k\b|\d{1,3}\s*kb/s"
    r"|hi[-\s]?fi"
    r"|stream|live|listen|online|radio[-\s]?station"
    r")\b",
    re.I,
)
NAME_BRACKETED = re.compile(r"[\(\[\{][^\)\]\}]*[\)\]\}]")
NAME_TRAILING_QUAL = re.compile(r"\s*[-–—:]\s*[A-Za-z0-9 ]{1,15}$")


def normalize_name(name: str) -> str:
    if not name: return ""
    s = name.strip()
    s = NAME_BRACKETED.sub(" ", s)
    s = NAME_NOISE.sub(" ", s)
    # Strip trailing qualifier like " - main mix" or "— old time"
    prev = None
    while prev != s:
        prev = s
        s = NAME_TRAILING_QUAL.sub("", s)
    s = re.sub(r"[^\w\s]+", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def homepage_host(url: str) -> str:
    if not url or not isinstance(url, str):
        return ""
    try:
        h = (urlsplit(url).hostname or "").lower()
    except Exception:
        return ""
    return h.removeprefix("www.")


def stream_url_host(url: str) -> str:
    if not url or not isinstance(url, str):
        return ""
    try:
        return (urlsplit(url).hostname or "").lower()
    except Exception:
        return ""


def completeness(d: dict) -> int:
    score = 0
    for f in ["homepage", "favicon", "country", "state", "codec"]:
        v = d.get(f)
        if isinstance(v, str) and v.strip():
            score += 1
    if d.get("tags"):           score += 1
    if d.get("language"):       score += 1
    if int(d.get("bitrate") or 0) > 0: score += 1
    if d.get("geo_lat") is not None:   score += 1
    r = d.get("research") or {}
    if (r.get("nature")  or "").strip(): score += 1
    if (r.get("notes")   or "").strip(): score += 2
    if (r.get("sources") or "").strip(): score += 2
    if d.get("localized"): score += 1
    return score


def authority_score(d: dict) -> tuple:
    cur = d.get("curation")
    cur = float(cur) if isinstance(cur, (int, float)) else 0.0
    comp = completeness(d)
    votes = int(d.get("votes") or 0)
    return (cur * 100 + comp * 10 + math.log10(votes + 1),
            votes, int(d.get("clickcount") or 0), d.get("stationuuid") or "")


# Codec preference order. Higher index = lower preference. Tied: bitrate
# DESC. Unknown codecs sort after known ones.
_CODEC_RANK = {
    "FLAC": 0, "OPUS": 1, "OGG": 2, "VORBIS": 2, "AAC": 3, "AAC+": 3, "AACP": 3,
    "MP3": 4, "MPEG": 4, "HLS": 5,
}


def stream_sort_key(s: dict) -> tuple:
    codec = (s.get("codec") or "").strip().upper().replace(" ", "")
    rank = _CODEC_RANK.get(codec, 9)
    bitrate = int(s.get("bitrate") or 0)
    return (rank, -bitrate)


def dedupe_streams(streams: list[dict]) -> list[dict]:
    """Drop entries with identical (url, codec, bitrate, hls)."""
    seen = set(); out = []
    for s in streams:
        k = (
            (s.get("url") or "").strip(),
            (s.get("codec") or "").strip().upper(),
            int(s.get("bitrate") or 0),
            bool(s.get("hls")),
        )
        if not k[0] or k in seen: continue
        seen.add(k); out.append(s)
    return out


def to_stream(d: dict) -> dict:
    """Turn a station YAML into a single-stream record."""
    return {
        "url":          (d.get("url") or "").strip(),
        "url_resolved": (d.get("url_resolved") or "").strip(),
        "codec":        (d.get("codec") or "").strip(),
        "bitrate":      int(d.get("bitrate") or 0),
        "hls":          bool(d.get("hls")),
    }


# ─── YAML rewriting (surgical) ─────────────────────────────────────────────
RE_HLS_LINE = re.compile(r"^hls:\s*\S.*$", re.M)
RE_LASTCHECK = re.compile(r"^lastcheckok:\s*\S.*$", re.M)
RE_LOCALIZED = re.compile(r"^localized:", re.M)
RE_RESEARCH = re.compile(r"^research:", re.M)
RE_STREAMS_BLOCK = re.compile(
    # Match `streams:` and any block-style children indented by spaces
    r"^streams:[\s\S]*?(?=^[^\s#-]|\Z)", re.M,
)
RE_DUP_LINE = re.compile(r"^duplicate_of:\s*\S.*$", re.M)
RE_CURATION_LINE = re.compile(r"^curation:\s*-?\d+(?:\.\d+)?\s*$", re.M)
RE_GEOLONG_LINE = re.compile(r"^geo_long:.*$", re.M)


def _quote_url(u: str) -> str:
    """YAML-quote a URL safely. URLs can contain colons, hashes, etc. that
    confuse the plain-scalar parser; single-quote everything for safety."""
    if not isinstance(u, str): return "''"
    if "'" in u:
        return '"' + u.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return f"'{u}'"


def yaml_block_for_streams(streams: list[dict]) -> str:
    out = ["streams:"]
    for s in streams:
        out.append(f"  - url: {_quote_url(s['url'])}")
        if s.get("url_resolved") and s["url_resolved"] != s["url"]:
            out.append(f"    url_resolved: {_quote_url(s['url_resolved'])}")
        if s.get("codec"):   out.append(f"    codec: {s['codec']}")
        if s.get("bitrate"): out.append(f"    bitrate: {s['bitrate']}")
        if s.get("hls"):     out.append("    hls: true")
        if s.get("label"):   out.append(f"    label: {s['label']}")
    return "\n".join(out) + "\n"


def patch_authority_streams(path: Path, streams: list[dict]) -> bool:
    """Write `streams:` block into the authority YAML (replace or insert)."""
    text = path.read_text(encoding="utf-8")
    block = yaml_block_for_streams(streams)
    if RE_STREAMS_BLOCK.search(text):
        text2 = RE_STREAMS_BLOCK.sub(block, text, count=1)
        if text2 == text: return False
        path.write_text(text2, encoding="utf-8")
        return True
    # Insert before localized: / research: / EOF.
    for rx in (RE_LOCALIZED, RE_RESEARCH):
        m = rx.search(text)
        if m:
            text2 = text[: m.start()] + block + text[m.start():]
            path.write_text(text2, encoding="utf-8")
            return True
    if not text.endswith("\n"): text += "\n"
    text += block
    path.write_text(text, encoding="utf-8")
    return True


def write_duplicate_of(path: Path, target_uuid: str) -> bool:
    text = path.read_text(encoding="utf-8")
    line = f"duplicate_of: {target_uuid}"
    if RE_DUP_LINE.search(text):
        text2 = RE_DUP_LINE.sub(line, text, count=1)
        if text2 == text: return False
        path.write_text(text2, encoding="utf-8")
        return True
    anchor = RE_CURATION_LINE.search(text) or RE_GEOLONG_LINE.search(text)
    if anchor:
        i = anchor.end()
        text2 = text[:i] + "\n" + line + text[i:]
        path.write_text(text2, encoding="utf-8")
        return True
    for kw in ("localized:", "research:"):
        m = re.search(rf"^{kw}", text, re.M)
        if m:
            text2 = text[: m.start()] + line + "\n" + text[m.start():]
            path.write_text(text2, encoding="utf-8")
            return True
    if not text.endswith("\n"): text += "\n"
    text += line + "\n"
    path.write_text(text, encoding="utf-8")
    return True


def main():
    started = time.time()
    print("[merge-variants] scanning…", flush=True)
    paths = sorted(STATIONS.glob("*/*.yaml"))
    entries: list[tuple[str, Path, dict]] = []
    for p in paths:
        try:
            d = yaml.safe_load(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(d, dict): continue
        if not d.get("stationuuid"): continue
        # Skip stations already marked as URL-equality duplicates
        if (d.get("duplicate_of") or "").strip(): continue
        entries.append((d["stationuuid"], p, d))
    print(f"[merge-variants] {len(entries)} canonical stations loaded in {time.time()-started:.1f}s")

    # Group by (normalised name, countrycode, homepage host)
    groups: dict[tuple[str, str, str], list[int]] = defaultdict(list)
    for i, (uuid, p, d) in enumerate(entries):
        n = normalize_name(d.get("name") or "")
        cc = (d.get("countrycode") or "").strip().upper()
        hp = homepage_host(d.get("homepage") or "")
        if not n or not hp:  # need both signals for a confident group
            continue
        groups[(n, cc, hp)].append(i)

    clusters = [idxs for idxs in groups.values() if len(idxs) >= 2]
    print(f"[merge-variants] {len(clusters)} variant clusters covering "
          f"{sum(len(c) for c in clusters)} stations")

    # Sanity check + merge
    rewrites_authority = 0
    rewrites_duplicate = 0
    skipped_aggregator = 0
    cluster_size_hist = defaultdict(int)
    for idxs in clusters:
        cluster_size_hist[len(idxs)] += 1
        # Sort by authority — first wins.
        ranked = sorted(idxs, key=lambda i: authority_score(entries[i][2]), reverse=True)
        a_idx = ranked[0]
        a_uuid, a_path, a_data = entries[a_idx]

        # Collect all streams across the cluster.
        all_streams = []
        # Authority's existing streams[] block first (preserves manual edits)
        if a_data.get("streams"):
            all_streams.extend(a_data["streams"])
        else:
            all_streams.append(to_stream(a_data))
        # Loser streams
        for i in ranked[1:]:
            d = entries[i][2]
            s = to_stream(d)
            if not s["url"]: continue
            if stream_url_host(s["url"]) in AGGREGATOR_HOSTS:
                skipped_aggregator += 1
                continue
            all_streams.append(s)
        all_streams = dedupe_streams(all_streams)
        # Only worth recording streams if there are at least 2 distinct ones.
        if len(all_streams) < 2:
            continue
        # Sort by preference (codec rank, bitrate DESC)
        all_streams.sort(key=stream_sort_key)
        if patch_authority_streams(a_path, all_streams):
            rewrites_authority += 1
        for i in ranked[1:]:
            l_uuid, l_path, l_data = entries[i]
            existing_dup = (l_data.get("duplicate_of") or "").strip()
            if existing_dup == a_uuid: continue
            if write_duplicate_of(l_path, a_uuid):
                rewrites_duplicate += 1

    dur = time.time() - started
    print(f"\n[merge-variants] done in {dur:.1f}s")
    print(f"  authority streams blocks written: {rewrites_authority}")
    print(f"  losers marked duplicate_of:       {rewrites_duplicate}")
    print(f"  aggregator-host streams skipped:  {skipped_aggregator}")
    print(f"  cluster size histogram:")
    for size in sorted(cluster_size_hist):
        print(f"    {size:>3}: {cluster_size_hist[size]} clusters")


if __name__ == "__main__":
    main()
