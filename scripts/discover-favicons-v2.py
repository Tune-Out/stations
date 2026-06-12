#!/usr/bin/env python3
"""
Enhanced bulk favicon discovery (v2 — second-pass).

Builds on scripts/discover-favicons.py with a wider URL hunt and broader
HTML/meta-tag patterns. Designed to pick up the stations the v1 pass
missed — typically sites that:
  * serve their main icon as PNG instead of ICO
  * use Apple-touch-icon-precomposed.png or sized variants
  * advertise an icon only via Twitter or MS-tile meta tags
  * are HTTP-only but allow HTTPS to fetch the same page
  * use an SVG mask-icon
  * serve through cloudflare/cdn where /favicon.ico 404s but a per-page
    `<link rel="icon">` points at the real asset

Fallback order (first 2xx + image-ish content-type wins):

  1.  <link rel="apple-touch-icon"          href="…">      (highest preference)
  2.  <link rel="apple-touch-icon-precomposed" href="…">
  3.  <link rel="shortcut icon"             href="…">
  4.  <link rel="icon" sizes=…              href="…">      (largest declared)
  5.  <link rel="icon"                      href="…">
  6.  <link rel="mask-icon"                 href="…">      (Safari pinned — SVG)
  7.  <link rel="image_src"                 href="…">
  8.  <meta property="og:image:secure_url"  content="…">
  9.  <meta property="og:image"             content="…">
  10. <meta name="twitter:image"            content="…">
  11. <meta name="twitter:image:src"        content="…">
  12. <meta name="msapplication-TileImage"  content="…">
  13. <origin>/apple-touch-icon-180x180.png
  14. <origin>/apple-touch-icon-152x152.png
  15. <origin>/apple-touch-icon-precomposed.png
  16. <origin>/apple-touch-icon.png
  17. <origin>/favicon-96x96.png
  18. <origin>/favicon-32x32.png
  19. <origin>/favicon.png
  20. <origin>/icon.png
  21. <origin>/favicon.ico

For HTTP-only homepages we also retry the GET via HTTPS (some servers
redirect to HTTPS but fail the initial HTTP fetch on flaky links).
"""
import argparse, os, re, ssl, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import yaml

ROOT = Path(__file__).resolve().parents[1]
STATIONS = ROOT / "data" / "stations"
UA = "TuneOutFaviconBot/2.0 (+https://tune-out.app; contact via GitHub)"
HOMEPAGE_TIMEOUT = 7
HEAD_TIMEOUT = 5
MAX_PAGE_BYTES = 96 * 1024
RE_FAVICON_LINE = re.compile(r'^favicon:\s*(?:"[^"\n]*"|\S.*?)\s*$', re.M)

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


class IconExtractor(HTMLParser):
    """Streaming HTML head scanner. Captures every candidate icon source we
    know how to find on a page."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.apple = None
        self.apple_precomposed = None
        self.shortcut_icon = None
        self.icon = None
        self.icon_sized = []   # (max_dim, href)
        self.mask_icon = None
        self.image_src = None
        self.og = None
        self.og_secure = None
        self.twitter_img = None
        self.twitter_img_src = None
        self.ms_tile = None
        self._in_head = True

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self._in_head = False
            return
        if not self._in_head:
            return
        a = dict(attrs)
        if tag == "link":
            rels = (a.get("rel") or "").lower().split()
            href = a.get("href")
            if not href:
                return
            if "apple-touch-icon" in rels and "precomposed" in rels:
                if not self.apple_precomposed:
                    self.apple_precomposed = href
            elif "apple-touch-icon-precomposed" in rels and not self.apple_precomposed:
                self.apple_precomposed = href
            elif "apple-touch-icon" in rels and not self.apple:
                self.apple = href
            elif "shortcut" in rels and "icon" in rels and not self.shortcut_icon:
                self.shortcut_icon = href
            elif "icon" in rels:
                sizes = a.get("sizes") or ""
                # Parse "180x180" etc — pick the largest declared icon.
                m = re.search(r"(\d+)\s*x\s*(\d+)", sizes)
                if m:
                    self.icon_sized.append((max(int(m.group(1)), int(m.group(2))), href))
                elif not self.icon:
                    self.icon = href
            elif "mask-icon" in rels and not self.mask_icon:
                self.mask_icon = href
            elif "image_src" in rels and not self.image_src:
                self.image_src = href
        elif tag == "meta":
            prop = (a.get("property") or a.get("name") or "").lower()
            content = a.get("content")
            if not content:
                return
            if prop == "og:image:secure_url" and not self.og_secure:
                self.og_secure = content
            elif prop in ("og:image", "og:image:url") and not self.og:
                self.og = content
            elif prop == "twitter:image" and not self.twitter_img:
                self.twitter_img = content
            elif prop == "twitter:image:src" and not self.twitter_img_src:
                self.twitter_img_src = content
            elif prop == "msapplication-tileimage" and not self.ms_tile:
                self.ms_tile = content


def _open(url, timeout, method="GET", extra_headers=None):
    h = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.5",
        "Accept-Language": "en;q=0.8,*;q=0.5",
    }
    if extra_headers: h.update(extra_headers)
    return urlopen(Request(url, headers=h, method=method), timeout=timeout, context=SSL_CTX)


def head_ok(url):
    """200/206 + image-ish content-type (image/* or x-icon)."""
    try:
        r = _open(url, HEAD_TIMEOUT, method="HEAD")
        status, ct = r.status, (r.headers.get("Content-Type") or "").lower()
        r.close()
    except HTTPError as e:
        if e.code == 405:
            try:
                r = _open(url, HEAD_TIMEOUT, method="GET",
                          extra_headers={"Range": "bytes=0-2047"})
                status, ct = r.status, (r.headers.get("Content-Type") or "").lower()
                r.close()
            except Exception:
                return False
        else:
            return False
    except Exception:
        return False
    if status not in (200, 206):
        return False
    if "image/" in ct:
        return True
    last = ct.rsplit("/", 1)[-1] if "/" in ct else ct
    return last in ("x-icon", "ico", "vnd.microsoft.icon")


def fetch_homepage(homepage):
    """Try fetching the homepage; on TLS failure or 4xx try the alt scheme."""
    candidates = [homepage]
    sp = urlsplit(homepage)
    if sp.scheme == "http":
        candidates.append(urlunsplit(("https", sp.netloc, sp.path, sp.query, "")))
    elif sp.scheme == "https":
        candidates.append(urlunsplit(("http", sp.netloc, sp.path, sp.query, "")))
    body = base = None
    for url in candidates:
        try:
            r = _open(url, HOMEPAGE_TIMEOUT, method="GET")
            data = r.read(MAX_PAGE_BYTES)
            base = r.geturl()
            r.close()
            if data:
                body = data
                break
        except Exception:
            continue
    return body, base


def discover(homepage):
    body, base = fetch_homepage(homepage)
    if not body or not base:
        return None
    try:
        html = body.decode("utf-8", errors="replace")
    except Exception:
        return None
    p = IconExtractor()
    try: p.feed(html)
    except Exception: pass

    # Pick the largest declared sized icon, if any.
    if p.icon_sized:
        p.icon_sized.sort(reverse=True)  # largest first
        biggest_sized = p.icon_sized[0][1]
    else:
        biggest_sized = None

    parsed = urlsplit(base)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    cands = []
    for c in (
        p.apple, p.apple_precomposed, p.shortcut_icon, biggest_sized, p.icon,
        p.mask_icon, p.image_src,
        p.og_secure, p.og, p.twitter_img, p.twitter_img_src, p.ms_tile,
    ):
        if c: cands.append(urljoin(base, c))
    # Origin fallbacks
    cands += [
        f"{origin}/apple-touch-icon-180x180.png",
        f"{origin}/apple-touch-icon-152x152.png",
        f"{origin}/apple-touch-icon-precomposed.png",
        f"{origin}/apple-touch-icon.png",
        f"{origin}/favicon-96x96.png",
        f"{origin}/favicon-32x32.png",
        f"{origin}/favicon.png",
        f"{origin}/icon.png",
        f"{origin}/favicon.ico",
    ]
    seen = set(); ordered = []
    for c in cands:
        if c and c not in seen:
            seen.add(c); ordered.append(c)
    for c in ordered:
        if head_ok(c):
            return c
    return None


def needs_lookup(data):
    fav = data.get("favicon") or ""
    if isinstance(fav, str):
        fav = fav.strip().strip('"').strip("'")
    else:
        fav = ""
    if not fav: return True
    if not fav.startswith("http"): return True
    return False


def patch_yaml(path, new_favicon):
    text = path.read_text(encoding="utf-8")
    new_line = f"favicon: {new_favicon}"
    if RE_FAVICON_LINE.search(text):
        text2 = RE_FAVICON_LINE.sub(new_line, text, count=1)
        if text2 == text: return False
        path.write_text(text2, encoding="utf-8")
        return True
    return False


def process_one(path):
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return "fail"
    if not isinstance(data, dict): return "fail"
    if not needs_lookup(data): return "skip"
    # Skip duplicates — only canonical authorities should hold favicons
    if (data.get("duplicate_of") or "").strip(): return "skip-dup"
    homepage = (data.get("homepage") or "").strip()
    if not homepage or not homepage.startswith("http"): return "noinfo"
    found = discover(homepage)
    if not found: return "fail"
    return "ok" if patch_yaml(path, found) else "fail"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=15000)
    ap.add_argument("--workers", type=int, default=96)
    ap.add_argument("--min-votes", type=int, default=10)
    args = ap.parse_args()

    targets = []
    for p in STATIONS.glob("*/*.yaml"):
        try:
            d = yaml.safe_load(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(d, dict): continue
        if (d.get("duplicate_of") or "").strip(): continue
        if not needs_lookup(d): continue
        v = int(d.get("votes") or 0)
        if v < args.min_votes: continue
        if not (d.get("homepage") or "").startswith("http"): continue
        targets.append((v, p))
    targets.sort(key=lambda x: -x[0])
    targets = targets[:args.limit]
    print(f"[favicon-v2] {len(targets)} candidates (votes>={args.min_votes}, limit={args.limit})", flush=True)

    counts = {"ok": 0, "skip": 0, "skip-dup": 0, "fail": 0, "noinfo": 0}
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one, p): p for _, p in targets}
        done = 0
        for f in as_completed(futs):
            counts[f.result()] += 1
            done += 1
            if done % 500 == 0:
                dur = time.time() - started
                rate = done / max(dur, 0.001)
                print(f"  {done:>5}/{len(targets)}  ok={counts['ok']:>4}  fail={counts['fail']:>4}  ({rate:.1f}/s)", flush=True)
    dur = time.time() - started
    print(f"\n[favicon-v2] done in {dur:.0f}s")
    for k in ("ok", "fail", "skip", "skip-dup", "noinfo"):
        print(f"  {k:>10}: {counts[k]}")


if __name__ == "__main__":
    main()
