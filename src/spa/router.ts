/**
 * Tiny History-API router for the SPA.
 *
 * URL shape: /<locale>/<view>/<param?>?<query>
 *   /en/             → home
 *   /en/browse       → browse
 *   /en/search       → search (?q=…)
 *   /en/station/UUID → station detail
 *   /en/downloads    → downloads
 *   /en/about        → about
 */
import { locale } from './store.js';
import { setLocale, isSupportedLocale } from './i18n.js';
import type { Locale } from './types.js';

export type ViewName = 'home' | 'browse' | 'search' | 'station' | 'downloads' | 'about' | 'settings' | 'library';

export interface Route {
  locale: Locale;
  view: ViewName;
  params: Record<string, string>;
  query: URLSearchParams;
}

type RenderFn = (route: Route, mount: HTMLElement) => Promise<void> | void;

let mount: HTMLElement | null = null;
let renderView: RenderFn = () => {};
let currentRoute: Route | null = null;

export function configureRouter(opts: { mount: HTMLElement; render: RenderFn }) {
  mount = opts.mount;
  renderView = opts.render;
}

export function parseLocation(): Route {
  const path = location.pathname.replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  let l: Locale = 'en';
  if (parts.length && isSupportedLocale(parts[0]!)) {
    l = parts.shift() as Locale;
  }
  const seg = parts.shift() ?? '';
  const param = parts.shift() ?? '';
  let view: ViewName = 'home';
  const params: Record<string, string> = {};
  switch (seg) {
    case '': view = 'home'; break;
    case 'browse': view = 'browse'; break;
    case 'search': view = 'search'; break;
    case 'downloads': view = 'downloads'; break;
    case 'library': view = 'library'; break;
    case 'about': view = 'about'; break;
    case 'settings': view = 'settings'; break;
    // /faq is folded into /about; redirect lazily by treating it as 'about'
    // so old bookmarks/links still land on the right content.
    case 'faq': view = 'about'; break;
    case 'station':
      view = 'station';
      params.uuid = param;
      break;
    default:
      view = 'home';
  }
  return { locale: l, view, params, query: new URLSearchParams(location.search) };
}

export async function dispatch(): Promise<void> {
  const route = parseLocation();
  // Locale change → load strings before rendering.
  if (route.locale !== locale.get()) {
    await setLocale(route.locale);
  }
  currentRoute = route;
  if (mount) {
    await renderView(route, mount);
  }
}

/**
 * Reset the SPA's main scroll container to the top. The visible scrollbar
 * is on `<main id="main">` (the document itself doesn't scroll on desktop
 * because the layout is a fixed-height grid). On mobile some skins let
 * the window itself scroll, so we cover both for safety.
 */
function scrollMainToTop(): void {
  const main = document.getElementById('main');
  if (main) main.scrollTop = 0;
  if (typeof window !== 'undefined' && window.scrollY > 0) {
    window.scrollTo(0, 0);
  }
}

export function go(href: string, replace = false): void {
  if (replace) history.replaceState(null, '', href);
  else history.pushState(null, '', href);
  void dispatch().then(scrollMainToTop);
}

/**
 * Navigate, wrapping the SPA re-render in `document.startViewTransition`
 * if the browser supports it. The optional `tag` callback is invoked
 * *between* the snapshot and the render so the caller can set
 * `view-transition-name` on outgoing elements (e.g. the clicked station
 * card's art + title). Falls back to a plain push+dispatch when the API
 * is missing.
 */
function startTransition(
  href: string,
  tag: () => void,
): void {
  type StartViewTransition = (cb: () => void | Promise<void>) => { finished: Promise<void> };
  const startVT = (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition;
  if (typeof startVT !== 'function') {
    tag();
    go(href);
    return;
  }
  tag();
  const transition = startVT.call(document, async () => {
    history.pushState(null, '', href);
    await dispatch();
    // Scroll BEFORE the browser captures the new state, so the snapshot
    // it interpolates toward shows the hero at the top of the page. The
    // morph then animates "card at the user's previous scroll position →
    // hero pinned at scrollTop=0" rather than "card mid-page → hero
    // mid-page".
    scrollMainToTop();
  });
  // After the morph completes, strip any names we set so the next nav
  // doesn't inherit a stale pairing. We don't await — fire-and-forget.
  void transition.finished.catch(() => { /* user-cancelled, ignore */ });
}

/** Extract the station UUID from `/<locale>/station/<uuid>` paths. */
function stationUuidFromHref(href: string): string | null {
  const m = /\/station\/([0-9a-f-]{16,})(?:[/?#]|$)/i.exec(href);
  return m ? m[1]! : null;
}

export function switchLocale(target: Locale): void {
  const route = currentRoute ?? parseLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (isSupportedLocale(parts[0]!)) parts[0] = target;
  else parts.unshift(target);
  const next = '/' + parts.join('/') + (location.search || '');
  go(next);
}

export interface SearchUrlOpts {
  query?: string;
  country?: string;
  /** Single tag (convenience). Combined with `tags` if both supplied. */
  tag?: string;
  /** Multi-tag AND filter. */
  tags?: string[];
  /** Single language slug. */
  language?: string;
  languages?: string[];
  codec?: string;
  /** Editorial r_nature filter (e.g. "public broadcaster"). */
  nature?: string;
}

export function searchQs(opts: SearchUrlOpts): string {
  const p = new URLSearchParams();
  if (opts.query)    p.set('q',        opts.query);
  if (opts.country)  p.set('country',  opts.country);
  if (opts.codec)    p.set('codec',    opts.codec);
  if (opts.nature)   p.set('nature',   opts.nature);
  const allTags = [
    ...(opts.tag ? [opts.tag] : []),
    ...(opts.tags ?? []),
  ];
  for (const t of allTags) p.append('tag', t);
  const allLangs = [
    ...(opts.language ? [opts.language] : []),
    ...(opts.languages ?? []),
  ];
  for (const l of allLangs) p.append('language', l);
  const s = p.toString();
  return s ? '?' + s : '';
}

export function url(
  view: ViewName,
  opts: { uuid?: string; locale?: Locale } & SearchUrlOpts = {},
): string {
  const l = opts.locale ?? locale.get();
  switch (view) {
    case 'home':      return `/${l}/`;
    case 'browse':    return `/${l}/browse`;
    case 'search':    return `/${l}/search${searchQs(opts)}`;
    case 'station':   return `/${l}/station/${opts.uuid}`;
    case 'downloads': return `/${l}/downloads`;
    case 'library':   return `/${l}/library`;
    case 'about':     return `/${l}/about`;
    case 'settings':  return `/${l}/settings`;
  }
}

export function initRouter(): void {
  window.addEventListener('popstate', () => { void dispatch(); });
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const a = target?.closest('a') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    if (a.dataset.external) return;
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) return;
    if (href.startsWith('#')) return;
    e.preventDefault();

    // View-Transitions hook for card → station navigation. If the click
    // originates inside a station card and lands on /station/<uuid>, tag
    // the card's art + title with paired view-transition-names so the
    // browser morphs them into the hero on the destination page. Names
    // are unique per UUID and the destination sets the same names during
    // render — see src/spa/views/station.ts.
    const uuid = stationUuidFromHref(href);
    const card = a.closest('.scard, .rail-card, .home-card') as HTMLElement | null;
    if (uuid && card) {
      startTransition(href, () => {
        const art   = card.querySelector<HTMLElement>('.scard-art, [data-station-art]');
        const title = card.querySelector<HTMLElement>('.scard-title, [data-station-title]');
        if (art)   art.style.viewTransitionName   = `station-art-${uuid}`;
        if (title) title.style.viewTransitionName = `station-title-${uuid}`;
      });
      return;
    }
    go(href);
  });
}
