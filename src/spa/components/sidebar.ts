import { el, escapeHtml } from '../dom.js';
import { iconEl } from '../icons.js';
import type { IconName } from '../icons.js';
import { t } from '../i18n.js';
import {
  current, effect, locale,
  recents, favorites,
  sidebarRecentsOpen, sidebarFavoritesOpen,
  signal,
  type Signal,
} from '../store.js';
import { parseLocation, url, go } from '../router.js';
import { play } from '../audio.js';
import type { StationRef } from '../types.js';

const NAV: { view: 'home' | 'browse' | 'search' | 'downloads' | 'settings' | 'about'; icon: IconName; key: string }[] = [
  { view: 'home',      icon: 'home',     key: 'nav.home' },
  { view: 'browse',    icon: 'explore',  key: 'nav.browse' },
  { view: 'search',    icon: 'search',   key: 'nav.search' },
  { view: 'downloads', icon: 'download', key: 'nav.downloads' },
  { view: 'settings',  icon: 'settings', key: 'nav.settings' },
  { view: 'about',     icon: 'info',     key: 'nav.about' },
];

export function sidebar(): HTMLElement {
  const root = el('aside', { class: 'sidebar' });

  // Nav
  const nav = el('nav', { class: 'sidebar-nav', attrs: { 'aria-label': 'Primary' } });
  const navLinks: HTMLAnchorElement[] = [];
  for (const item of NAV) {
    const a = el('a', {
      attrs: { href: url(item.view) },
      children: [iconEl(item.icon, 18), el('span', { text: t(item.key), attrs: { 'data-t': item.key } })],
    });
    nav.appendChild(a);
    navLinks.push(a);
  }
  root.appendChild(nav);

  const listsHost = el('div');
  root.appendChild(listsHost);

  // Recents + Favorites (collapsible). No more custom collections — Favorites
  // is the only persisted user list.
  effect(() => {
    // Re-render lists when any of these signals change
    locale.get();
    const r = recents.get();
    const f = favorites.get();
    const ro = sidebarRecentsOpen.get();
    const fo = sidebarFavoritesOpen.get();
    listsHost.replaceChildren(
      listSection(t('section.recents'),   r, { canRemove: 'recents',   open: ro, openSig: sidebarRecentsOpen   }),
      listSection(t('section.favorites'), f, { canRemove: 'favorites', open: fo, openSig: sidebarFavoritesOpen }),
    );
  });

  // Update nav text + URLs + active state on locale change or route change
  const routeChangeSig = signal<number>(0);
  window.addEventListener('popstate', () => routeChangeSig.set((n) => n + 1));
  // Intercept go(): we hook by listening on click bubble (router already updates history)
  document.addEventListener('click', () => {
    requestAnimationFrame(() => routeChangeSig.set((n) => n + 1));
  });

  effect(() => {
    locale.get();
    routeChangeSig.get();
    const here = parseLocation();
    for (const a of navLinks) {
      const span = a.querySelector('[data-t]') as HTMLElement | null;
      const item = NAV[navLinks.indexOf(a)]!;
      if (span) span.textContent = t(item.key);
      a.setAttribute('href', url(item.view));
      a.classList.toggle('is-active', here.view === item.view);
    }
  });

  return root;
}

interface ListSectionOpts {
  canRemove: 'recents' | 'favorites';
  open: boolean;
  openSig: Signal<boolean>;
}

function listSection(label: string, items: StationRef[], opts: ListSectionOpts): HTMLElement {
  const section = el('div', { class: 'sidebar-section' });

  // Collapsible header. The whole row is a button so the keyboard tab order
  // and aria semantics are correct. The chevron rotates via CSS.
  const header = el('button', {
    class: 'sidebar-section-head',
    attrs: { type: 'button', 'aria-expanded': String(opts.open), 'aria-controls': `sb-${opts.canRemove}` },
  });
  header.appendChild(el('span', { class: 'sidebar-section-chevron', text: '▸' }));
  header.appendChild(el('h4', { text: label }));
  header.appendChild(el('span', { class: 'sidebar-section-count muted', text: items.length ? String(items.length) : '' }));
  header.addEventListener('click', () => opts.openSig.set((v) => !v));
  section.appendChild(header);

  const body = el('div', {
    class: 'sidebar-section-body',
    attrs: { id: `sb-${opts.canRemove}`, hidden: !opts.open ? true : undefined },
  });
  if (!opts.open) {
    section.classList.add('is-collapsed');
    section.appendChild(body);
    return section;
  }

  if (!items.length) {
    body.appendChild(el('p', { class: 'empty', text: '—' }));
    section.appendChild(body);
    return section;
  }

  const ul = el('ul');
  const cur = current.get();
  for (const ref of items.slice(0, 12)) {
    const li = el('li', { attrs: { 'data-uuid': ref.uuid } });
    if (cur?.uuid === ref.uuid) li.classList.add('is-active');
    const art = ref.favicon
      ? `<img src="${escapeHtml(ref.favicon)}" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;ph&quot;>📻</span>'" alt="" />`
      : `<span class="ph">📻</span>`;
    li.innerHTML = `${art}<span class="name">${escapeHtml(ref.name)}</span>`;
    const x = el('button', { class: 'x', attrs: { 'aria-label': 'Remove', title: 'Remove' }, text: '✕' });
    li.appendChild(x);
    li.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.x')) return;
      void play(ref);
      // Update URL to station detail
      go(url('station', { uuid: ref.uuid }));
    });
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      if (opts.canRemove === 'recents') {
        recents.set((prev) => prev.filter((r) => r.uuid !== ref.uuid));
      } else if (opts.canRemove === 'favorites') {
        favorites.set((prev) => prev.filter((r) => r.uuid !== ref.uuid));
      }
    });
    ul.appendChild(li);
  }
  body.appendChild(ul);
  section.appendChild(body);
  return section;
}
