/* Tune Out — minimal service worker
 *
 * Strategy:
 *  - install:   pre-cache the shell HTML for each locale + the root redirector
 *  - activate:  drop old cache versions, claim clients
 *  - fetch:     stale-while-revalidate for same-origin static assets
 *               (HTML, JS, CSS, fonts, manifest, icons)
 *               bypass /data/* (it has its own Cache API caching in db.ts)
 *               bypass cross-origin (iTunes lookup etc.)
 */

// Bumped so an old in-flight SW gets replaced on the next navigation. If you
// keep modifying the SW, bump again.
// v6 — pre-deploy: ensures fresh shell + asset caches on first prod visit.
const VERSION = 'tuneout-v6';

// Self-unregister when we're being served by a dev host. Without this, the
// SW from a previous production-style run keeps intercepting fetches on
// localhost / 127.0.0.1 and the dev server's changes never reach the page.
const IS_DEV_HOST = (() => {
  try {
    const h = self.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
  } catch { return false; }
})();
if (IS_DEV_HOST) {
  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('tuneout-')).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll();
      for (const c of clients) c.navigate(c.url);
    })());
  });
  // Don't intercept any fetches in dev — let the page hit the dev server directly.
  // (Skipping the fetch listener registration is the whole point.)
} else {
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const PRECACHE_URLS = [
  '/',
  '/en/',
  '/fr/',
  '/ar/',
  '/404.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('tuneout-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith('/data/')) return true; // db.ts manages this
  return false;
}

function isHtmlRequest(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (shouldBypass(url)) return;

  // Navigation: shell-cache strategy. Always serve a shell so the SPA can hydrate.
  if (isHtmlRequest(req)) {
    event.respondWith(
      (async () => {
        // Prefer locale-specific cached shell when available.
        const locMatch = url.pathname.match(/^\/(en|fr|ar)\//);
        const fallback = locMatch ? `/${locMatch[1]}/` : '/en/';
        try {
          // network first for HTML so updates propagate
          const net = await fetch(req);
          if (net && net.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, net.clone());
            return net;
          }
          throw new Error('network not ok');
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match(req)) || (await cache.match(fallback)) || (await cache.match('/404.html')) || Response.error();
        }
      })(),
    );
    return;
  }

  // Assets: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await fetchPromise) || Response.error();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

} // end of !IS_DEV_HOST production-mode block
