#!/usr/bin/env python3
"""
Bulk favicon discovery (stdlib only — no third-party deps).

For stations whose `favicon:` is empty / missing / non-http, fetch the
homepage once and try in order:
  1. <link rel="apple-touch-icon" href="…">
  2. <link rel="shortcut icon" href="…">
  3. <link rel="icon" href="…">
  4. <meta property="og:image" content="…">
  5. <homepage>/apple-touch-icon.png
  6. <homepage>/favicon.ico

Found URL is HEAD/GET-validated (2xx + image-ish Content-Type), then written
back to the YAML on the `favicon:` line. Parallelism via a thread pool —
network is the bottleneck, GIL doesn't matter.
"""
import argparse, os, re, ssl, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"
UA = "TuneOutFaviconBot/1.0 (+https://tune-out.app; contact via GitHub)"
HOMEPAGE_TIMEOUT = 6
HEAD_TIMEOUT = 4
RE_FAVICON_LINE = re.compile(r'^favicon:\s*(?:"[^"\n]*"|\S.*?)\s*$', re.M)

# Permissive SSL context — many small stations have expired/self-signed certs
# and rejecting them costs us real favicons we could have found.
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


class IconHrefExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.apple = self.icon = self.og = self.shortcut_icon = None
        self._in_head = False
    def handle_starttag(self, tag, attrs):
        if tag == "head": self._in_head = True
        if tag == "link":
            a = dict(attrs)
            rel = (a.get("rel") or "").lower()
            href = a.get("href")
            if not href: return
            if "apple-touch-icon" in rel and not self.apple: self.apple = href
            elif "shortcut" in rel and "icon" in rel and not self.shortcut_icon: self.shortcut_icon = href
            elif rel == "icon" and not self.icon: self.icon = href
            elif "icon" in rel and not self.icon: self.icon = href
        elif tag == "meta":
            a = dict(attrs)
            prop = (a.get("property") or a.get("name") or "").lower()
            if prop in ("og:image", "og:image:url", "og:image:secure_url") and not self.og:
                self.og = a.get("content")
    def handle_endtag(self, tag):
        if tag == "head" and self.apple and self.icon and self.og:
            # All slots filled; we can stop parsing.
            raise StopIteration


def _open(url: str, timeout: int, method: str = "GET", extra_headers=None):
    h = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.5", "Accept-Language": "en;q=0.8,*;q=0.5"}
    if extra_headers: h.update(extra_headers)
    req = Request(url, headers=h, method=method)
    return urlopen(req, timeout=timeout, context=SSL_CTX)


def head_ok(url: str) -> bool:
    try:
        r = _open(url, HEAD_TIMEOUT, method="HEAD")
        status = r.status
        ct = (r.headers.get("Content-Type") or "").lower()
        r.close()
    except HTTPError as e:
        if e.code == 405:
            # Try a ranged GET if HEAD is unsupported
            try:
                r = _open(url, HEAD_TIMEOUT, method="GET", extra_headers={"Range": "bytes=0-2047"})
                status = r.status
                ct = (r.headers.get("Content-Type") or "").lower()
                r.close()
            except Exception:
                return False
        else:
            return False
    except (URLError, ssl.SSLError, TimeoutError, ConnectionError, OSError):
        return False
    except Exception:
        return False
    if status not in (200, 206): return False
    if "image/" in ct: return True
    last = ct.rsplit("/", 1)[-1] if "/" in ct else ct
    return last in ("x-icon", "ico", "vnd.microsoft.icon")


def discover(homepage: str) -> str | None:
    try:
        r = _open(homepage, HOMEPAGE_TIMEOUT, method="GET")
        body = r.read(65536)
        base = r.geturl()
        r.close()
    except Exception:
        return None
    try:
        html = body.decode("utf-8", errors="replace")
    except Exception:
        return None
    p = IconHrefExtractor()
    try:
        p.feed(html)
    except StopIteration:
        pass
    except Exception:
        pass

    cands = []
    if p.apple:         cands.append(urljoin(base, p.apple))
    if p.shortcut_icon: cands.append(urljoin(base, p.shortcut_icon))
    if p.icon:          cands.append(urljoin(base, p.icon))
    if p.og:            cands.append(urljoin(base, p.og))
    parsed = urlparse(base)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    cands.append(f"{origin}/apple-touch-icon.png")
    cands.append(f"{origin}/favicon.ico")
    seen = set(); ordered = []
    for c in cands:
        if c and c not in seen: seen.add(c); ordered.append(c)
    for c in ordered:
        if head_ok(c): return c
    return None


def needs_lookup(data: dict) -> bool:
    fav = (data.get("favicon") or "")
    if isinstance(fav, str): fav = fav.strip().strip('"').strip("'")
    else: fav = ""
    if not fav: return True
    if not fav.startswith("http"): return True
    return False


def patch_yaml(path: Path, new_favicon: str) -> bool:
    text = path.read_text(encoding="utf-8")
    new_line = f"favicon: {new_favicon}"
    if RE_FAVICON_LINE.search(text):
        text2 = RE_FAVICON_LINE.sub(new_line, text, count=1)
        if text2 == text: return False
        path.write_text(text2, encoding="utf-8")
        return True
    return False


def process_one(path: Path) -> str:
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return "fail"
    if not isinstance(data, dict): return "fail"
    if not needs_lookup(data): return "skip"
    homepage = (data.get("homepage") or "").strip()
    if not homepage or not homepage.startswith("http"): return "noinfo"
    found = discover(homepage)
    if not found: return "fail"
    if patch_yaml(path, found): return "ok"
    return "fail"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=8000)
    ap.add_argument("--workers", type=int, default=64)
    ap.add_argument("--min-votes", type=int, default=10)
    args = ap.parse_args()

    targets: list[tuple[int, Path]] = []
    for p in STATIONS.glob("*/*.yaml"):
        try:
            d = yaml.safe_load(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(d, dict): continue
        if not needs_lookup(d): continue
        v = int(d.get("votes") or 0)
        if v < args.min_votes: continue
        if not (d.get("homepage") or "").startswith("http"): continue
        targets.append((v, p))
    targets.sort(key=lambda x: -x[0])
    targets = targets[:args.limit]
    print(f"[favicon] {len(targets)} candidates (votes>={args.min_votes}, limit={args.limit})", flush=True)

    counts = {"ok":0, "skip":0, "fail":0, "noinfo":0}
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one, p): p for _, p in targets}
        done = 0
        for f in as_completed(futs):
            counts[f.result()] += 1
            done += 1
            if done % 200 == 0:
                dur = time.time() - started
                rate = done / max(dur, 0.001)
                print(f"  {done:>5}/{len(targets)}  ok={counts['ok']:>4}  fail={counts['fail']:>4}  ({rate:.1f}/s)", flush=True)
    dur = time.time() - started
    print(f"\n[favicon] done in {dur:.0f}s")
    print(f"  ok:      {counts['ok']}")
    print(f"  failed:  {counts['fail']}")
    print(f"  skipped: {counts['skip']}")
    print(f"  no-info: {counts['noinfo']}")


if __name__ == "__main__":
    main()
