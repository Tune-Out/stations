#!/usr/bin/env python3
"""
Identify duplicate station YAMLs and mark redirects.

Two YAMLs are considered duplicates when they share the same NORMALIZED
stream URL — i.e., the `url` field after:

  * lowercasing the scheme + host (paths are case-sensitive on most
    icecast servers, so left intact)
  * stripping trailing slash
  * stripping the query string (`?listeners=1`, `?sid=ABC` etc.)
  * stripping the URL fragment
  * collapsing `http://` and `https://` to `://` so the protocol doesn't
    fragment otherwise-identical groups
  * dropping a default port (:80 for http, :443 for https) if present

Within each cluster of ≥2 stations, one is chosen as the AUTHORITY by an
authority score (higher = more authoritative):

      authority = curation*100 + completeness*10 + log10(votes+1)

where `completeness` counts how many of these signal-rich fields are
populated: homepage, favicon, tags, language, codec, bitrate>0, country,
state, geo_lat, research.nature, research.notes, research.sources,
localized (any locale).

The losers are marked with `duplicate_of: <authority-uuid>` (surgical
line edit: inserted right after `curation:` so the diff is one line).
The build pipeline already skips any YAML with a non-empty duplicate_of,
so the SQLite catalog only ever sees authorities.

Re-running is idempotent — existing duplicate_of values are recomputed
against the current cluster and rewritten only when they change.
"""
from __future__ import annotations

import math, os, re, sys, time
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"


def normalize_url(raw: str) -> str:
    """Stable key for dedup matching. Empty/non-http URLs return ''."""
    if not raw or not isinstance(raw, str):
        return ""
    raw = raw.strip()
    if not raw.lower().startswith(("http://", "https://")):
        return ""
    try:
        sp = urlsplit(raw)
    except Exception:
        return ""
    if not sp.netloc:
        return ""
    host = sp.hostname or ""
    if not host:
        return ""
    # Drop default port
    port = sp.port
    if port == 80 and sp.scheme == "http":
        port = None
    if port == 443 and sp.scheme == "https":
        port = None
    netloc = host.lower() + (f":{port}" if port else "")
    # Keep path case-sensitive (mountpoints often are), strip trailing /
    path = sp.path.rstrip("/")
    # Protocol-agnostic key so http/https variants collapse
    return f"://{netloc}{path}"


COMPLETENESS_FIELDS = [
    "homepage", "favicon", "country", "state", "codec",
]


def completeness(d: dict) -> int:
    score = 0
    for f in COMPLETENESS_FIELDS:
        v = d.get(f)
        if isinstance(v, str) and v.strip():
            score += 1
    if d.get("tags"):           score += 1
    if d.get("language"):       score += 1
    if int(d.get("bitrate") or 0) > 0: score += 1
    if d.get("geo_lat") is not None:   score += 1
    r = d.get("research") or {}
    if (r.get("nature")  or "").strip(): score += 1
    if (r.get("notes")   or "").strip(): score += 2  # editorial work
    if (r.get("sources") or "").strip(): score += 2
    if d.get("localized"): score += 1
    return score


def authority_score(d: dict) -> tuple[float, int, float, str]:
    """Larger is better. Tuple form gives a stable total order."""
    cur = d.get("curation")
    cur = float(cur) if isinstance(cur, (int, float)) else 0.0
    comp = completeness(d)
    votes = int(d.get("votes") or 0)
    pop = math.log10(votes + 1)
    primary = cur * 100 + comp * 10 + pop
    # Tiebreakers: votes, clickcount, UUID for determinism
    return (
        primary,
        votes,
        float(d.get("clickcount") or 0),
        d.get("stationuuid") or "",
    )


def collect() -> tuple[list[tuple[str, Path, dict]], dict[str, list[int]]]:
    """Read every YAML, return list of (uuid, path, data) and the url->indices map."""
    entries: list[tuple[str, Path, dict]] = []
    by_url: dict[str, list[int]] = defaultdict(list)
    paths = sorted(STATIONS.glob("*/*.yaml"))
    for p in paths:
        try:
            d = yaml.safe_load(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(d, dict):
            continue
        uuid = d.get("stationuuid") or ""
        if not uuid:
            continue
        idx = len(entries)
        entries.append((uuid, p, d))
        key = normalize_url(d.get("url") or "")
        if key:
            by_url[key].append(idx)
    return entries, by_url


RE_DUP_LINE = re.compile(r"^duplicate_of:\s*\S.*$", re.M)
RE_CURATION_LINE = re.compile(r"^curation:\s*(-?\d+(?:\.\d+)?)\s*$", re.M)
RE_GEOLONG_LINE = re.compile(r"^geo_long:.*$", re.M)


def write_duplicate_of(path: Path, target_uuid: str) -> bool:
    text = path.read_text(encoding="utf-8")
    line = f"duplicate_of: {target_uuid}"
    if RE_DUP_LINE.search(text):
        text2 = RE_DUP_LINE.sub(line, text, count=1)
        if text2 == text:
            return False
        path.write_text(text2, encoding="utf-8")
        return True
    # Insert after curation: if present, else after geo_long:.
    anchor = RE_CURATION_LINE.search(text) or RE_GEOLONG_LINE.search(text)
    if anchor:
        i = anchor.end()
        text2 = text[:i] + "\n" + line + text[i:]
        path.write_text(text2, encoding="utf-8")
        return True
    # Last resort: append before localized:/research:/EOF.
    for kw in ("localized:", "research:"):
        m = re.search(rf"^{kw}", text, re.M)
        if m:
            text2 = text[: m.start()] + line + "\n" + text[m.start():]
            path.write_text(text2, encoding="utf-8")
            return True
    if not text.endswith("\n"):
        text += "\n"
    text += line + "\n"
    path.write_text(text, encoding="utf-8")
    return True


def remove_duplicate_of(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if not RE_DUP_LINE.search(text):
        return False
    text2 = re.sub(r"^duplicate_of:\s*\S.*\n?", "", text, count=1, flags=re.M)
    path.write_text(text2, encoding="utf-8")
    return True


def main():
    started = time.time()
    print("[mark-duplicates] scanning…", flush=True)
    entries, by_url = collect()
    print(f"[mark-duplicates] {len(entries)} YAMLs loaded in {time.time()-started:.1f}s")

    # Build clusters keyed by normalized URL with ≥2 members.
    clusters = [idxs for idxs in by_url.values() if len(idxs) >= 2]
    print(f"[mark-duplicates] {len(clusters)} duplicate clusters covering "
          f"{sum(len(c) for c in clusters)} stations")

    # Authority selection per cluster + mark losers.
    rewrites_dup = 0
    rewrites_cleared = 0
    pre_existing_in_cluster = 0
    authority_clears = 0
    cluster_size_hist = defaultdict(int)
    rewrites_unchanged = 0

    chosen_authority: dict[str, str] = {}   # losing-uuid -> authority-uuid
    authority_uuids: set[str] = set()

    for idxs in clusters:
        cluster_size_hist[len(idxs)] += 1
        # Best authority score wins.
        ranked = sorted(
            idxs,
            key=lambda i: authority_score(entries[i][2]),
            reverse=True,
        )
        authority_idx = ranked[0]
        authority_uuid = entries[authority_idx][0]
        authority_uuids.add(authority_uuid)
        for i in ranked[1:]:
            uuid = entries[i][0]
            chosen_authority[uuid] = authority_uuid
            existing = (entries[i][2].get("duplicate_of") or "").strip()
            if existing == authority_uuid:
                rewrites_unchanged += 1
                continue
            if existing:
                pre_existing_in_cluster += 1
            if write_duplicate_of(entries[i][1], authority_uuid):
                rewrites_dup += 1

    # Cleanup pass: any station NOT in chosen_authority should have its
    # duplicate_of removed (it may have been one in a previous run that no
    # longer applies).
    for (uuid, path, d) in entries:
        existing = (d.get("duplicate_of") or "").strip()
        if not existing:
            continue
        if uuid in chosen_authority:
            continue  # already handled above
        # Either this is now an authority itself (cluster shrank) or its
        # group dissolved (the URL changed). Either way, clear the stale value.
        if remove_duplicate_of(path):
            rewrites_cleared += 1
            if uuid in authority_uuids:
                authority_clears += 1

    dur = time.time() - started
    print(f"\n[mark-duplicates] done in {dur:.1f}s")
    print(f"  marked as duplicate:        {rewrites_dup}")
    print(f"  already-correct (no diff):  {rewrites_unchanged}")
    print(f"  cleared stale duplicate_of: {rewrites_cleared}"
          + (f"  ({authority_clears} promoted to authority)" if authority_clears else ""))
    print(f"  pre-existing redirects updated to new authority: {pre_existing_in_cluster}")
    print(f"  cluster sizes:")
    for size in sorted(cluster_size_hist):
        print(f"    {size:>3}: {cluster_size_hist[size]} clusters")


if __name__ == "__main__":
    main()
