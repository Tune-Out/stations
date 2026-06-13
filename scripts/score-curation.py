#!/usr/bin/env python3
"""
Heuristic baseline curation scorer.

Reads every data/stations/<shard>/<uuid>.yaml, derives a curation score in
[-1.0, 1.0] from the existing research block + station metadata, and writes
the value back as a `curation:` field on the YAML.

Why line-based: a full pyyaml round-trip would reformat every file (dates,
quoted strings, list styles), creating noisy diffs. We instead PARSE the
file with yaml for scoring, but EDIT it as plain text — either updating
an existing `curation:` line or inserting one right after `geo_long:`.

Scoring signals (additive, then clamped):
  POSITIVE
   +0.30  nature includes: public broadcaster / non-commercial / community /
          college / university / cooperative / state media
   +0.25  sources mention Wikipedia / major editorial outlet (BBC/NPR/...)
   +0.15  format/notes mention commercial-free / no commercials / listener-
          supported / classical / jazz / curated music
   +0.15  affiliations reference a major network (BBC/NPR/CBC/Radio
          France/Deutschlandfunk/ARD/NHK/etc.)
   +0.10  votes >= 5000 AND at least one independent positive signal
   +0.05  votes >= 1000 AND at least one independent positive signal
   +0.05  reviewed_at present (someone actually looked at this station)
   +0.10  notes call out music as curated / specialised / hand-picked
   +0.05  tag set includes jazz / classical / ambient / underground / world /
          opera / folk / experimental
  NEGATIVE
   -0.20  notes mention commercial-breaks / ad-saturated / automated playlist /
          repetitive / hit-radio churn
   -0.10  No homepage AND no research at all (minimum-effort entry)
   -0.10  nature == "commercial" with no positive signals
   -0.05  Generic name (e.g., "<city> FM") with no research body
   -0.05  Tag set is purely top-40 / hits / holiday and no positive signals

Final value is clamped to [-1.0, 1.0] and rounded to two decimal places.
"""
import os, re, sys, time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"

RE_PUBLIC      = re.compile(r"\b(public broadcaster|public radio|public-radio|state-?owned|state media|community|non[- ]?commercial|non[- ]?profit|cooperative|college radio|university radio|listener[- ]supported)\b", re.I)
RE_FAMOUS_SRC  = re.compile(r"(wikipedia|en\.wikipedia\.org|bbc\.co\.uk|npr\.org|pbs\.org|cbc\.ca|deutschlandradio|france(?:\s+)?(?:inter|culture|musique|info)|radiofrance|nhk\.|rai\.it|nrk\.no|svt\.se|sverigesradio\.se|abc\.net\.au)", re.I)
RE_FORMAT_POS  = re.compile(r"\b(commercial[- ]free|ad[- ]free|no\s+commercials|listener[- ]supported|public[- ]radio|classical music|jazz|nonstop music|continuous music|curated|specialized|art music|world music|indie|underground)\b", re.I)
RE_AFFIL_NET   = re.compile(r"\b(BBC|NPR|PBS|CBC|ABC|DR|SRF|NRK|SR\s|Radio\s?France|France\s?(?:Inter|Culture|Musique|Info)|Deutschlandfunk|Deutschlandradio|ARD|ORF|RAI|RFI|NHK|VOA|Radio\s?Free\s?Europe|Sveriges Radio|Yle|Vatican)\b")
RE_NEG_NOTES   = re.compile(r"\b(commercial breaks|saturated with ads|frequent ads|frequent commercials|automated playlist|repetitive|hit[- ]radio churn|lots of ads|heavy advertising)\b", re.I)
RE_MUSIC_CURATED = re.compile(r"\bmusic\b.*\b(curated|selected|specialized|hand[- ]picked|expertly)\b|\b(curated|selected|specialized|hand[- ]picked)\b.*\bmusic\b", re.I)
RE_GENERIC_NAME = re.compile(r"^\s*(?:radio\s+)?[\w\s\-]+\s+(?:FM|AM)\s*$", re.I)
RE_INTERESTING_TAGS = re.compile(r"\b(jazz|classical|ambient|underground|indie|world|folk|reggae|electronic|art|experimental|opera|baroque|blues|gospel|spiritual|drone|noise)\b", re.I)
RE_BORING_TAGS = re.compile(r"\b(top\s?40|hits?|adult contemporary|hot ac|country pop|christmas music|holiday)\b", re.I)


def _s(v) -> str:
    """Coerce YAML scalar to safe string (dates → ISO, ints → str)."""
    if v is None: return ""
    if isinstance(v, str): return v.strip()
    return str(v).strip()


def score_station(data: dict) -> float:
    research = data.get("research") or {}
    nature   = _s(research.get("nature"))
    notes    = _s(research.get("notes"))
    sources  = _s(research.get("sources"))
    format_  = _s(research.get("format"))
    affil    = _s(research.get("affiliations"))
    operator = _s(research.get("operator"))
    reviewed = _s(research.get("reviewed_at"))
    votes    = int(data.get("votes") or 0)
    homepage = _s(data.get("homepage"))
    name     = _s(data.get("name"))
    tags     = data.get("tags") or []
    # Coerce every element to str — some upstream catalogs surface numeric
    # genres (e.g. "80" → int) that break a naive join.
    tags_text = " ".join(str(t) for t in tags).lower() if isinstance(tags, list) else str(tags)

    body = " ".join(filter(None, [nature, notes, format_, operator, affil]))

    score = 0.0
    hit_positive = False
    if RE_PUBLIC.search(body):
        score += 0.30; hit_positive = True
    if sources and RE_FAMOUS_SRC.search(sources):
        score += 0.25; hit_positive = True
    elif sources and "wikipedia" in sources.lower():
        score += 0.20; hit_positive = True
    if RE_FORMAT_POS.search(body):
        score += 0.15; hit_positive = True
    if affil and RE_AFFIL_NET.search(affil):
        score += 0.15; hit_positive = True
    if RE_MUSIC_CURATED.search(body):
        score += 0.10; hit_positive = True
    if votes >= 5000 and hit_positive:
        score += 0.10
    elif votes >= 1000 and hit_positive:
        score += 0.05
    if reviewed:
        score += 0.05

    if RE_NEG_NOTES.search(body):
        score -= 0.20
    if not homepage and not body:
        score -= 0.10
    if nature.lower() == "commercial" and not hit_positive:
        score -= 0.10
    if RE_GENERIC_NAME.match(name) and not body:
        score -= 0.05

    if RE_INTERESTING_TAGS.search(tags_text):
        score += 0.05
    if RE_BORING_TAGS.search(tags_text) and not hit_positive:
        score -= 0.05

    if score >  1.0: score =  1.0
    if score < -1.0: score = -1.0
    return round(score, 2)


# Surgical line edit: insert/update `curation: X.XX` immediately after the
# `geo_long:` line so the diff is one-line-per-file when nothing existed.
RE_CURATION_LINE = re.compile(r"^curation:\s*(-?\d+(?:\.\d+)?)\s*$")
RE_GEOLONG_LINE  = re.compile(r"^geo_long:\s*\S.*$")


def rewrite_yaml(path: Path) -> tuple[float, bool]:
    try:
        text = path.read_text(encoding="utf-8")
        data = yaml.safe_load(text)
    except Exception:
        return (0.0, False)
    if not isinstance(data, dict):
        return (0.0, False)

    score = score_station(data)
    score_str = f"{score:.2f}"
    new_line = f"curation: {score_str}\n"

    lines = text.splitlines(keepends=True)
    # Update in place if a curation line already exists at top level.
    for i, line in enumerate(lines):
        if RE_CURATION_LINE.match(line):
            if line.strip() == f"curation: {score_str}":
                return (score, False)  # already correct
            lines[i] = new_line
            path.write_text("".join(lines), encoding="utf-8")
            return (score, True)
    # Insert after geo_long.
    for i, line in enumerate(lines):
        if RE_GEOLONG_LINE.match(line):
            lines.insert(i + 1, new_line)
            path.write_text("".join(lines), encoding="utf-8")
            return (score, True)
    # Fallback: append at end-ish (before `localized:` or `research:` if present),
    # else append at the very end.
    for i, line in enumerate(lines):
        if line.startswith("localized:") or line.startswith("research:"):
            lines.insert(i, new_line)
            path.write_text("".join(lines), encoding="utf-8")
            return (score, True)
    lines.append(new_line)
    path.write_text("".join(lines), encoding="utf-8")
    return (score, True)


def process_shard(shard: str) -> tuple[int, int, dict]:
    sd = STATIONS / shard
    total = changed = 0
    hist = {-1: 0, 0: 0, 1: 0}
    for p in sorted(sd.glob("*.yaml")):
        score, ch = rewrite_yaml(p)
        total += 1
        if ch: changed += 1
        if score < -0.05:   hist[-1] += 1
        elif score > 0.05:  hist[1]  += 1
        else:               hist[0]  += 1
    return total, changed, hist


def main():
    shards = sorted(d.name for d in STATIONS.iterdir() if d.is_dir())
    print(f"[score-curation] {len(shards)} shards", flush=True)
    started = time.time()
    grand_total = grand_changed = 0
    hist = {-1: 0, 0: 0, 1: 0}
    with ProcessPoolExecutor(max_workers=min(16, os.cpu_count() or 4)) as ex:
        futs = {ex.submit(process_shard, s): s for s in shards}
        done = 0
        for f in as_completed(futs):
            t, c, h = f.result()
            grand_total += t; grand_changed += c
            for k, v in h.items(): hist[k] += v
            done += 1
            if done % 32 == 0 or done == len(shards):
                print(f"  shards {done}/{len(shards)}  +{grand_changed} rewrites / {grand_total} total", flush=True)
    dur = time.time() - started
    print(f"\n[score-curation] done in {dur:.1f}s")
    print(f"  scored:    {grand_total}")
    print(f"  rewrites:  {grand_changed}")
    print(f"  positive:  {hist[1]}")
    print(f"  neutral:   {hist[0]}")
    print(f"  negative:  {hist[-1]}")


if __name__ == "__main__":
    main()
