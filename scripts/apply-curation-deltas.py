#!/usr/bin/env python3
"""
Merge workflow results back into the YAMLs.

Input: a JSON file with shape:
  { "results": [
      { "uuid": "...", "delta": 0.2, "favicon": "...", "evidence": "..." },
      ...
    ]
  }

For each result:
  - Add `delta` to the existing `curation:` value (clamped to [-1, 1]).
  - If `favicon` is provided AND the station currently has no favicon,
    set it.

Same surgical line edits as score-curation.py — no full YAML reformat.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"

import yaml

RE_CURATION_LINE = re.compile(r"^curation:\s*(-?\d+(?:\.\d+)?)\s*$", re.M)
RE_FAVICON_LINE  = re.compile(r'^favicon:\s*(?:"[^"\n]*"|\S.*?)\s*$', re.M)


def find_shard(uuid: str) -> Path | None:
    # Try the obvious first-two-chars shard; fall back to a glob if missing.
    sd = STATIONS / uuid[:2] / f"{uuid}.yaml"
    if sd.exists(): return sd
    matches = list(STATIONS.glob(f"*/{uuid}.yaml"))
    return matches[0] if matches else None


def apply_one(uuid: str, delta: float, favicon: str | None) -> tuple[bool, str]:
    path = find_shard(uuid)
    if not path: return (False, "not-found")
    text = path.read_text(encoding="utf-8")

    # Curation delta
    changed = False
    m = RE_CURATION_LINE.search(text)
    if m:
        try: cur = float(m.group(1))
        except: cur = 0.0
        new = max(-1.0, min(1.0, round(cur + delta, 2)))
        if new != cur:
            text = RE_CURATION_LINE.sub(f"curation: {new:.2f}", text, count=1)
            changed = True
    else:
        # Insert after geo_long
        text2, n = re.subn(r"(^geo_long:.*$)", lambda mm: mm.group(1) + f"\ncuration: {delta:.2f}", text, count=1, flags=re.M)
        if n: text = text2; changed = True

    # Favicon (only if currently empty)
    if favicon:
        fm = RE_FAVICON_LINE.search(text)
        current = ""
        if fm:
            line = fm.group(0)
            after = line.split(":", 1)[1].strip().strip('"').strip("'")
            current = after
        if not current:
            new_line = f"favicon: {favicon}"
            text2, n = re.subn(RE_FAVICON_LINE, new_line, text, count=1)
            if n:
                text = text2
                changed = True
            elif not fm:
                # No favicon line at all; insert after homepage
                text2, n = re.subn(r"(^homepage:.*$)", lambda mm: mm.group(1) + f"\n{new_line}", text, count=1, flags=re.M)
                if n: text = text2; changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
    return (changed, "ok")


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "scripts/curation-deltas.json"
    data = json.loads(Path(src).read_text(encoding="utf-8"))
    results = data.get("results") or data
    if not isinstance(results, list):
        print(f"unexpected input shape: {type(results).__name__}")
        sys.exit(2)

    ok = miss = noop = 0
    by_status: dict[str, int] = {}
    for r in results:
        uuid = r.get("uuid") or ""
        delta = float(r.get("delta") or 0.0)
        favicon = r.get("favicon") or ""
        if not uuid: continue
        changed, status = apply_one(uuid, delta, favicon if favicon.startswith("http") else None)
        if status != "ok": miss += 1
        elif changed: ok += 1
        else: noop += 1
        by_status[status] = by_status.get(status, 0) + 1

    print(f"applied: {ok}  noop: {noop}  miss: {miss}")
    print(f"breakdown: {by_status}")


if __name__ == "__main__":
    main()
