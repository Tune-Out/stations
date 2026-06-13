#!/usr/bin/env python3
"""
Merge the IPRD (International Public Radio Directory) catalog into Tune Out:

  1. Load all 41,286 canonical Tune Out stations into memory.
  2. Build matching indexes:
       - normalized stream URL (host + path, scheme/port/query stripped)
       - normalized homepage URL
       - (normalized name, country code)
  3. For each IPRD entry (23,088 total):
       - Try to match an existing canonical station.
       - On match → add "iprd-<id>" to that station's provenance array.
       - On no match → queue as NEW for write-out under data/stations/<shard>/.
  4. Apply provenance updates surgically (no full YAML reformat).
  5. Write NEW stations with fresh UUIDs, normalized fields, baseline curation.

Reports: matched, new, conflicting, skipped — and writes /tmp/iprd-merge-report.json
with per-decision detail.
"""
from __future__ import annotations

import hashlib, json, os, re, sys, time, unicodedata, uuid as uuid_mod
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlsplit

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"
IPRD_FILE = Path("/opt/src/github/Tune-Out/iprd/docs/site_data/metadata/catalog.json")

# ─── Reused from mark-duplicates.py / merge-stream-variants.py ────────────

def normalize_url(raw: str) -> str:
    """Stable key for stream-URL dedup. Empty/non-http returns ''."""
    if not raw or not isinstance(raw, str): return ""
    raw = raw.strip()
    if not raw.lower().startswith(("http://", "https://")): return ""
    try: sp = urlsplit(raw)
    except Exception: return ""
    if not sp.netloc: return ""
    host = sp.hostname or ""
    if not host: return ""
    port = sp.port
    if port == 80 and sp.scheme == "http": port = None
    if port == 443 and sp.scheme == "https": port = None
    netloc = host.lower() + (f":{port}" if port else "")
    path = sp.path.rstrip("/")
    return f"://{netloc}{path}"

def homepage_host(url: str) -> str:
    if not url: return ""
    try: return ((urlsplit(url).hostname or "").lower()).removeprefix("www.")
    except Exception: return ""

NAME_NOISE = re.compile(
    r"\b(hd|sd|opus|flac|mp3|aac|aacp|aac\+|ogg|vorbis|hls"
    r"|low|high|mobile|hq|lq|hi[-\s]?fi"
    r"|\d{1,3}\s*kbps|\d{1,3}\s*k\b|\d{1,3}\s*kb/s"
    r"|stream|live|listen|online|radio[-\s]?station)\b",
    re.I,
)
NAME_BRACKETED = re.compile(r"[\(\[\{][^\)\]\}]*[\)\]\}]")

def normalize_name(name: str) -> str:
    if not name: return ""
    s = name.strip()
    s = NAME_BRACKETED.sub(" ", s)
    s = NAME_NOISE.sub(" ", s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^\w\s]+", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()


# Aggregator hosts that proxy many real stations — same URL there does not
# mean "same station". Mirrors the list in merge-stream-variants.py.
AGGREGATOR_HOSTS = {
    "worldradio.online", "tunein.com", "radio.garden", "streamtheworld.com",
    "playerservices.streamtheworld.com", "radiojar.com", "live365.com",
    "myradiolist.fm", "zeno.fm", "mytuner.global.ssl.fastly.net",
    "onlineradiobox.com", "yandex.ru", "yandex.com",
}

def is_aggregator(url: str) -> bool:
    if not url: return False
    try: host = (urlsplit(url).hostname or "").lower()
    except Exception: return False
    return host in AGGREGATOR_HOSTS or host.endswith(tuple("." + d for d in AGGREGATOR_HOSTS))


# ─── Country → ISO mapping ────────────────────────────────────────────────

# Seeded from the existing Tune Out catalog (which uses radio-browser's
# verbose names like "the united kingdom of …"). Extended with IPRD's
# short-form variants.
COUNTRY_ALIASES = {
    "united states": "US", "united states of america": "US",
    "united kingdom": "GB",
    "russian federation": "RU", "russia": "RU",
    "united arab emirates": "AE",
    "türkiye": "TR", "turkey": "TR",
    "south korea": "KR", "korea, republic of": "KR", "republic of korea": "KR",
    "north korea": "KP",
    "iran": "IR", "iran, islamic republic of": "IR",
    "syria": "SY", "syrian arab republic": "SY",
    "vietnam": "VN", "viet nam": "VN",
    "tanzania": "TZ", "united republic of tanzania": "TZ",
    "venezuela": "VE", "bolivarian republic of venezuela": "VE",
    "moldova": "MD", "republic of moldova": "MD",
    "macedonia": "MK", "north macedonia": "MK",
    "czechia": "CZ", "czech republic": "CZ",
    "swaziland": "SZ", "eswatini": "SZ",
    "myanmar": "MM", "burma": "MM",
    "ivory coast": "CI", "cote d'ivoire": "CI",
    "cape verde": "CV", "cabo verde": "CV",
    "east timor": "TL", "timor-leste": "TL",
    "saint barthelemy": "BL", "saint barthélemy": "BL",
    "saint kitts and nevis": "KN",
    "saint vincent and the grenadines": "VC",
    "trinidad and tobago": "TT",
    "antigua and barbuda": "AG",
    "bosnia and herzegovina": "BA",
    "vatican": "VA", "holy see (vatican city state)": "VA",
    "palestine": "PS", "palestine, state of": "PS",
    "laos": "LA", "lao people's democratic republic": "LA",
    "brunei": "BN", "brunei darussalam": "BN",
    "democratic republic of the congo": "CD",
    "republic of the congo": "CG", "congo": "CG",
    "central african republic": "CF",
    "south africa": "ZA",
    "ascension island": "AC",
    "kosovo": "XK",
}

def load_country_map() -> dict[str, str]:
    mapping = dict(COUNTRY_ALIASES)
    # Merge in canonical names harvested from the existing catalog.
    try:
        derived = json.loads(open("/tmp/country-map.json").read())
        for k, v in derived.items():
            mapping.setdefault(k.lower(), v)
    except Exception:
        pass
    return mapping


# ─── Tag/genre normalization ──────────────────────────────────────────────

def normalize_tag(t: str) -> str:
    if not t: return ""
    s = t.strip().lower()
    # IPRD genres are mostly already lowercase; collapse plurals + variants.
    s = re.sub(r"\s+", "-", s)
    return s.strip("-")


# ─── Loading existing catalog ─────────────────────────────────────────────

def load_existing() -> tuple[dict[str, dict], dict[str, list[str]]]:
    """Returns:
       * by_uuid: {uuid: {name, country, countrycode, homepage, streams, path}}
       * indexes: dict of various lookup tables
    """
    by_uuid: dict[str, dict] = {}
    print(f"[merge-iprd] scanning existing catalog…", flush=True)
    for shard_dir in sorted(STATIONS.iterdir()):
        if not shard_dir.is_dir(): continue
        for p in shard_dir.glob("*.yaml"):
            try:
                d = yaml.safe_load(p.read_text(encoding="utf-8"))
            except Exception:
                continue
            if not isinstance(d, dict): continue
            u = (d.get("stationuuid") or "").strip()
            if not u: continue
            # Collect streams: from `streams:` list if present, else from the
            # top-level url/url_resolved fields.
            stream_urls = []
            if isinstance(d.get("streams"), list):
                for entry in d["streams"]:
                    if isinstance(entry, dict):
                        for k in ("url", "url_resolved"):
                            v = entry.get(k)
                            if isinstance(v, str): stream_urls.append(v)
            for k in ("url", "url_resolved"):
                v = d.get(k)
                if isinstance(v, str) and v: stream_urls.append(v)
            by_uuid[u] = {
                "uuid": u,
                "path": p,
                "name": (d.get("name") or "").strip(),
                "country": (d.get("country") or "").strip(),
                "countrycode": (d.get("countrycode") or "").strip().upper(),
                "homepage": (d.get("homepage") or "").strip(),
                "streams": stream_urls,
                "duplicate_of": (d.get("duplicate_of") or "").strip(),
                "provenance": list(d.get("provenance") or []),
            }
    print(f"  loaded {len(by_uuid)} YAMLs", flush=True)
    return by_uuid


def build_indexes(by_uuid: dict) -> dict:
    print("[merge-iprd] building dedup indexes…", flush=True)
    by_stream: dict[str, str] = {}        # normalized URL → uuid (canonical only)
    by_homepage: dict[str, set[str]] = defaultdict(set)   # homepage host → {uuid}
    by_name_cc: dict[tuple[str, str], str] = {}    # (norm_name, cc) → uuid
    by_name_only: dict[str, set[str]] = defaultdict(set)  # norm_name → {uuid}

    for u, s in by_uuid.items():
        if s["duplicate_of"]: continue  # only index canonical entries
        cc = s["countrycode"]
        for url in s["streams"]:
            key = normalize_url(url)
            if not key: continue
            if is_aggregator(url): continue
            # First write wins so we don't clobber a more authoritative entry.
            by_stream.setdefault(key, u)
        hp = homepage_host(s["homepage"])
        if hp: by_homepage[hp].add(u)
        nn = normalize_name(s["name"])
        if nn:
            by_name_only[nn].add(u)
            if cc:
                by_name_cc.setdefault((nn, cc), u)
    print(f"  by_stream:   {len(by_stream)}")
    print(f"  by_homepage: {len(by_homepage)}")
    print(f"  by_name_cc:  {len(by_name_cc)}")
    return {
        "stream":   by_stream,
        "homepage": by_homepage,
        "name_cc":  by_name_cc,
        "name_only": by_name_only,
    }


# ─── Matching ─────────────────────────────────────────────────────────────

def iprd_match(iprd_station: dict, idx: dict, country_map: dict) -> tuple[str, str] | None:
    """Returns (match_kind, existing_uuid) or None."""
    # 1. Exact stream URL match
    for stream in iprd_station.get("streams") or []:
        url = (stream or {}).get("url") if isinstance(stream, dict) else stream
        if not isinstance(url, str): continue
        key = normalize_url(url)
        if not key or is_aggregator(url): continue
        hit = idx["stream"].get(key)
        if hit: return ("stream", hit)

    # 2. Homepage URL match
    site = iprd_station.get("website")
    site_host = homepage_host(site) if isinstance(site, str) else ""

    # 3. Name + country
    name = iprd_station.get("name") or ""
    cn = (iprd_station.get("country") or "").lower().strip()
    cc = country_map.get(cn, "")
    nn = normalize_name(name)
    if nn and cc:
        hit = idx["name_cc"].get((nn, cc))
        if hit: return ("name_country", hit)

    # 4. Homepage host + same name (loose)
    if site_host and nn:
        for u in idx["homepage"].get(site_host, []):
            return ("homepage_name", u)

    # 5. Name alone (very loose — only if unambiguous AND there's a homepage
    #    hint that aligns).
    if nn and site_host:
        candidates = idx["name_only"].get(nn, set())
        if len(candidates) == 1:
            return ("name_only", next(iter(candidates)))

    return None


# ─── YAML rewriting for provenance updates ────────────────────────────────

RE_PROV_BLOCK = re.compile(r"^provenance:\s*$\n((?:  -.*\n)+)", re.M)
RE_PROV_ENTRY = re.compile(r"^  -\s*(.+)$", re.M)

def add_provenance_entry(path: Path, new_entry: str) -> bool:
    """Insert `new_entry` into the YAML's provenance: array if not already
    there. Surgical — no full reformat. Returns True if changed."""
    text = path.read_text(encoding="utf-8")
    m = RE_PROV_BLOCK.search(text)
    if not m:
        return False  # YAML missing provenance — schema invariant says it should exist
    block_body = m.group(1)
    existing = [line.strip().lstrip("-").strip() for line in block_body.splitlines() if line.strip()]
    if new_entry in existing:
        return False
    # Append as a new list item, preserving the body's indentation style.
    new_block_body = block_body + f"  - {new_entry}\n"
    new_text = text[: m.start()] + f"provenance:\n{new_block_body}" + text[m.end():]
    path.write_text(new_text, encoding="utf-8")
    return True


# ─── New-station YAML emission ────────────────────────────────────────────

def shard_for_uuid(u: str) -> str:
    """SHA-1 prefix shard matching scripts/lib/shard.ts."""
    return hashlib.sha1(u.encode("utf-8")).hexdigest()[:2]

def emit_new_yaml(iprd: dict, country_map: dict) -> tuple[Path, str] | None:
    """Build a YAML for an IPRD-only station. Returns (path, new_uuid)."""
    new_uuid = str(uuid_mod.uuid4())
    shard = shard_for_uuid(new_uuid)
    out_dir = STATIONS / shard
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{new_uuid}.yaml"

    name = (iprd.get("name") or "").strip() or "Untitled Station"
    cn = (iprd.get("country") or "").strip()
    cc = country_map.get(cn.lower(), "")
    homepage = (iprd.get("website") or "").strip()
    logo = (iprd.get("logo") or "").strip()

    # Pick the highest-reliability stream as the primary.
    streams = [s for s in (iprd.get("streams") or []) if isinstance(s, dict) and (s.get("url") or "")]
    streams.sort(key=lambda s: -float(s.get("reliability") or 0))
    primary = streams[0] if streams else {}
    primary_url = primary.get("url") or ""
    primary_codec = (primary.get("format") or "").upper()
    if primary_codec == "UNKNOWN": primary_codec = ""
    primary_bitrate = int(primary.get("bitrate") or 0)

    # Tag normalisation: lowercase, dash-joined; drop empties via the set.
    raw_tags = {normalize_tag(t) for t in (iprd.get("tags") or []) + (iprd.get("genres") or []) if t}
    raw_tags.discard("")
    tags = sorted(raw_tags)

    # Language: leave empty unless explicit (IPRD's language field is noisy).
    languages = []
    for l in (iprd.get("language") or []):
        if isinstance(l, str) and 1 <= len(l) <= 20:
            languages.append(l.lower())
    languages = sorted(set(languages))

    def yq(v) -> str:
        """Quote a YAML scalar value safely (always single-quote URLs)."""
        if v is None: return '""'
        s = str(v)
        if not s: return '""'
        if any(c in s for c in ':#?&"\\') or s.startswith(('-', '"', "'", '{', '[')):
            return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
        return s

    lines = [
        f"stationuuid: {new_uuid}",
        f"name: {yq(name)}",
        f"url: '{primary_url}'" if primary_url else 'url: ""',
        f"url_resolved: '{primary_url}'" if primary_url else 'url_resolved: ""',
        f"homepage: {yq(homepage)}",
        f"favicon: {yq(logo)}",
    ]
    if tags:
        lines.append("tags:")
        for t in tags:
            lines.append(f"  - {yq(t)}")
    else:
        lines.append("tags: []")
    lines.append(f"country: {yq(cn)}")
    lines.append(f"countrycode: {yq(cc)}")
    lines.append('state: ""')
    if languages:
        lines.append("language:")
        for l in languages:
            lines.append(f"  - {yq(l)}")
    else:
        lines.append("language: []")
    lines.append("languagecodes: []")
    lines.append("votes: 0")
    lines.append(f"codec: {primary_codec}" if primary_codec else 'codec: ""')
    lines.append(f"bitrate: {primary_bitrate}")
    lines.append("hls: false")
    lines.append("lastcheckok: true")
    lc = (iprd.get("lastChecked") or "")[:19]
    lines.append(f"lastchangetime: '{lc}'" if lc else 'lastchangetime: ""')
    lines.append("clickcount: 0")
    lines.append("geo_lat: null")
    lines.append("geo_long: null")
    lines.append("curation: 0.0")
    lines.append("provenance:")
    iprd_id = iprd.get("id") or ""
    lines.append(f"  - iprd-{iprd_id}")
    # Streams block when there's >1 stream variant — mirror Tune Out's format.
    if len(streams) > 1:
        lines.append("streams:")
        for s in streams:
            su = s.get("url") or ""
            if not su: continue
            lines.append(f"  - url: '{su}'")
            fmt = (s.get("format") or "").upper()
            if fmt and fmt != "UNKNOWN":
                lines.append(f"    codec: {fmt}")
            br = int(s.get("bitrate") or 0)
            if br: lines.append(f"    bitrate: {br}")
    # Research block with the IPRD source line
    lines.append("research:")
    lines.append("  reviewed_at: ''")
    lines.append("  nature: ''")
    lines.append("  operator: ''")
    lines.append("  affiliations: ''")
    lines.append("  audience: ''")
    lines.append("  format: ''")
    lines.append("  notes: 'Imported from IPRD catalog.'")
    src = (iprd.get("source") or "").replace("\\", "/")
    lines.append(f"  sources: 'IPRD: {src}'")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path, new_uuid


# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("[merge-iprd] loading IPRD…", flush=True)
    iprd = json.loads(IPRD_FILE.read_text(encoding="utf-8"))
    iprd_stations = iprd.get("stations") or []
    print(f"  {len(iprd_stations)} IPRD stations", flush=True)

    country_map = load_country_map()
    print(f"  country map: {len(country_map)} entries", flush=True)

    by_uuid = load_existing()
    indexes = build_indexes(by_uuid)

    matched = {"stream": 0, "name_country": 0, "homepage_name": 0, "name_only": 0}
    new_stations = []
    provenance_updates = []  # (path, "iprd-<id>")
    duplicate_iprd_to_iprd = 0  # multiple IPRD entries → same Tune Out station

    seen_canonical: dict[str, str] = {}  # canonical uuid → first iprd_id matched

    print("[merge-iprd] matching…", flush=True)
    for i, s in enumerate(iprd_stations):
        if i and i % 5000 == 0:
            print(f"  {i}/{len(iprd_stations)} processed", flush=True)
        iprd_id = (s.get("id") or "").strip()
        if not iprd_id: continue
        hit = iprd_match(s, indexes, country_map)
        if hit:
            kind, canonical_uuid = hit
            matched[kind] += 1
            if canonical_uuid in seen_canonical:
                duplicate_iprd_to_iprd += 1
            seen_canonical[canonical_uuid] = iprd_id
            yaml_path = by_uuid[canonical_uuid]["path"]
            provenance_updates.append((yaml_path, f"iprd-{iprd_id}"))
        else:
            new_stations.append(s)

    print()
    print("[merge-iprd] match summary:")
    print(f"  matched (total):       {sum(matched.values())}")
    for k, v in matched.items():
        print(f"    by {k:>14}: {v}")
    print(f"  IPRD→same TuneOut:    {duplicate_iprd_to_iprd}")
    print(f"  NEW stations:          {len(new_stations)}")

    # Apply provenance updates
    print(f"\n[merge-iprd] adding provenance to {len(provenance_updates)} existing YAMLs…", flush=True)
    prov_written = 0
    for path, entry in provenance_updates:
        try:
            if add_provenance_entry(path, entry):
                prov_written += 1
        except Exception as e:
            print(f"  warn: {path.name}: {e}")
    print(f"  written: {prov_written}")

    # Emit new YAMLs
    print(f"\n[merge-iprd] writing {len(new_stations)} new YAMLs…", flush=True)
    new_paths = []
    for s in new_stations:
        try:
            res = emit_new_yaml(s, country_map)
            if res: new_paths.append(res)
        except Exception as e:
            print(f"  warn: {s.get('id')}: {e}")
    print(f"  written: {len(new_paths)}")

    dur = time.time() - t0
    print(f"\n[merge-iprd] done in {dur:.1f}s")

    # Persist a report
    report = {
        "matched_by_kind": matched,
        "matched_total": sum(matched.values()),
        "duplicate_iprd_to_iprd": duplicate_iprd_to_iprd,
        "new_count": len(new_stations),
        "provenance_added": prov_written,
        "iprd_total": len(iprd_stations),
    }
    Path("/tmp/iprd-merge-report.json").write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
