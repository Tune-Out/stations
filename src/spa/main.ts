import './styles/app.css';
import { el } from './dom.js';
import { configureRouter, dispatch, initRouter, parseLocation } from './router.js';
import { detectInitialLocale, isSupportedLocale, setLocale, t } from './i18n.js';
import { bindTheme } from './theme.js';
import { setupPwa } from './pwa.js';
import { dbStatus, effect, locale, signal } from './store.js';
import { topbar } from './components/topbar.js';
import { sidebar } from './components/sidebar.js';
import { playerBar } from './components/player.js';
import { renderHome } from './views/home.js';
import { renderBrowse } from './views/browse.js';
import { renderSearch } from './views/search.js';
import { renderStation } from './views/station.js';
import { renderDownloads } from './views/downloads.js';
import { renderLibrary } from './views/library.js';
import { renderAbout } from './views/about.js';
import { renderSettings } from './views/settings.js';
import type { Route } from './router.js';

async function bootstrap() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('No #app mount point.');
    return;
  }

  // Theme — reactive; also keeps <meta theme-color> in sync. The inline
  // pre-paint script in the shell already applied data-theme to avoid FOUC;
  // this binds future updates from the picker.
  bindTheme();

  // PWA: register the service worker and capture the install prompt event.
  setupPwa();

  // Locale FIRST — components below call t() during construction.
  const r0 = parseLocation();
  const detected = r0.locale || detectInitialLocale();

  // Normalize URL so the rest of the boot sees a /[locale]/... path.
  // Uses isSupportedLocale so adding a locale to src/locales.ts is enough —
  // no per-place edits.
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) {
    history.replaceState(null, '', `/${detected}/${location.search}`);
  } else if (!isSupportedLocale(parts[0]!)) {
    history.replaceState(null, '', `/${detected}/${parts.join('/')}${location.search}`);
  }

  await setLocale(detected);

  // Build shell (now that strings are loaded)
  const shell = el('div', { class: 'shell' });
  shell.appendChild(topbar());
  shell.appendChild(sidebar());
  const main = el('main', { class: 'main', id: 'main' });
  shell.appendChild(main);
  shell.appendChild(playerBar());

  // Replace boot splash with shell
  app.replaceChildren(shell);

  // Configure router with our view registry
  configureRouter({
    mount: main,
    render: async (route: Route, mountEl: HTMLElement) => {
      // Show a loading skeleton until the DB is ready
      if (dbStatus.get().kind !== 'ready') {
        renderLoader(mountEl);
      }
      // Wait for DB readiness before rendering data-heavy views
      await waitForDb();
      try {
        switch (route.view) {
          case 'home':      return await renderHome(route, mountEl);
          case 'browse':    return await renderBrowse(route, mountEl);
          case 'search':    return await renderSearch(route, mountEl);
          case 'station':   return await renderStation(route, mountEl);
          case 'downloads': return await renderDownloads(route, mountEl);
          case 'library':   return await renderLibrary(route, mountEl);
          case 'about':     return await renderAbout(route, mountEl);
          case 'settings':  return await renderSettings(route, mountEl);
        }
      } catch (e) {
        renderError(mountEl, (e as Error).message);
      }
    },
  });

  initRouter();

  // Kick off DB load early (don't await — views show loader until ready)
  void import('./db.js').then((m) => m.openDb()).catch(() => { /* error rendered by views */ });

  // First render
  await dispatch();

  // Re-render the current view whenever the DB becomes ready
  let lastKind: string | null = null;
  effect(() => {
    const k = dbStatus.get().kind;
    if (k !== lastKind) {
      lastKind = k;
      if (k === 'ready') void dispatch();
    }
  });
}

function waitForDb(): Promise<void> {
  const s = dbStatus.get();
  if (s.kind === 'ready') return Promise.resolve();
  if (s.kind === 'error') return Promise.reject(new Error(s.message));
  return new Promise<void>((resolve, reject) => {
    const dispose = dbStatus.subscribe((next) => {
      if (next.kind === 'ready') { dispose(); resolve(); }
      else if (next.kind === 'error') { dispose(); reject(new Error(next.message)); }
    });
  });
}

function renderLoader(mountEl: HTMLElement): void {
  const root = el('div', { class: 'loader' });
  root.appendChild(el('strong', { text: t('loading.title') }));
  root.appendChild(el('p', { text: t('loading.subtitle') }));
  const bar = el('div', { class: 'loader-bar' });
  const inner = el('div', { class: 'loader-bar-inner', attrs: { style: 'width:0%' } });
  bar.appendChild(inner);
  root.appendChild(bar);
  const pct = el('p', { class: 'muted' });
  root.appendChild(pct);

  const unsub = dbStatus.subscribe((s) => {
    if (s.kind === 'loading') {
      const p = s.total ? Math.round((s.received / s.total) * 100) : 0;
      inner.style.width = (s.total ? p : Math.min(99, Math.round(s.received / (5 * 1024 * 1024) * 30))) + '%';
      pct.textContent = `${(s.received / 1e6).toFixed(1)} MB${s.total ? ' / ' + (s.total / 1e6).toFixed(1) + ' MB' : ''}`;
    } else if (s.kind === 'opening') {
      inner.style.width = '100%';
      pct.textContent = t('loading.cached');
    } else if (s.kind === 'ready') {
      unsub();
    }
  });

  mountEl.replaceChildren(root);
}

function renderError(mountEl: HTMLElement, msg: string): void {
  const root = el('div', { class: 'container' });
  const panel = el('div', { class: 'error-panel' });
  panel.appendChild(el('strong', { text: t('error.title') }));
  panel.appendChild(el('p', { class: 'muted', text: msg }));

  // Plain "Reload" — gentle attempt, useful for transient network errors.
  // For schema-mismatch / cached-stale errors this won't help, hence the
  // separate Force-update button below.
  const retry = el('button', { class: 'btn btn-ghost', text: t('error.retry') });
  retry.addEventListener('click', () => location.reload());

  // Hard reset path: wipe every CacheAPI sqlite entry and pull a fresh
  // copy of /data/stations.sqlite. The loader's existing progress bar
  // picks up the dbStatus signal so the user sees the download.
  const force = el('button', { class: 'btn btn-primary', text: t('error.force_reload') });
  force.addEventListener('click', async () => {
    force.setAttribute('disabled', 'true');
    retry.setAttribute('disabled', 'true');
    try {
      const { forceReloadDb } = await import('./db.js');
      await forceReloadDb();
      // Re-dispatch the current route now that the DB is fresh.
      const { dispatch } = await import('./router.js');
      await dispatch();
    } catch (e) {
      // forceReloadDb already pushes the error into dbStatus → renderError
      // gets called again with the new message via the bootstrap subscriber.
      console.error('[force-reload]', e);
    }
  });

  const actions = el('div', { class: 'error-actions' });
  actions.appendChild(force);
  actions.appendChild(retry);
  panel.appendChild(actions);

  const help = el('p', { class: 'muted error-help', text: t('error.force_reload_help') });
  panel.appendChild(help);

  root.appendChild(panel);
  mountEl.replaceChildren(root);
}

bootstrap().catch((e) => {
  console.error('bootstrap failed', e);
});
