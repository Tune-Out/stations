/**
 * Apply the user's theme + skin choices to <html>:
 *   theme   'light' / 'dark' / 'system'  → data-theme attribute on <html>
 *   skin    'classic' / 'minimal' / …    → <link id="theme-skin"> href
 *                                          + data-theme-skin attribute
 *
 * Both are persisted to localStorage by the signals in store.ts; an inline
 * pre-paint script in the shell HTML applies them BEFORE any CSS loads, so
 * the painted page never flashes the wrong colours.
 */
import type { Theme, Skin } from './store.js';
import { theme, skin, effect } from './store.js';

const DARK_COLOR = '#0a0d14';
const LIGHT_COLOR = '#fbfbfd';
const SKIN_LINK_ID = 'theme-skin';
const THEMES_INDEX_URL = '/themes/index.json';

function resolvedColor(t: Theme): string {
  if (t === 'dark') return DARK_COLOR;
  if (t === 'light') return LIGHT_COLOR;
  return matchMedia('(prefers-color-scheme: light)').matches ? LIGHT_COLOR : DARK_COLOR;
}

function setMetaThemeColor(color: string): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  setMetaThemeColor(resolvedColor(t));
}

export function applySkin(s: Skin): void {
  const root = document.documentElement;
  root.setAttribute('data-theme-skin', s);

  let link = document.getElementById(SKIN_LINK_ID) as HTMLLinkElement | null;
  // The "classic" skin's CSS is byte-for-byte the defaults already in app.css,
  // so we only need the extra stylesheet for non-classic skins. Removing the
  // link for classic guarantees a fast path back to defaults.
  if (s === 'classic') {
    if (link) link.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = SKIN_LINK_ID;
    document.head.appendChild(link);
  }
  const next = `/themes/${s}/theme.css`;
  if (link.getAttribute('href') !== next) link.href = next;
}

// ─── Themes catalogue (loaded once from /themes/index.json) ────────────

export interface ThemeFontEntry { family: string; src: string; weight?: string | number; style?: string }
export interface ThemeMeta {
  id: Skin;
  name_key: string;
  description_key: string;
  /** Single-color preview (legacy; falls back when bg/fg/accent missing). */
  preview_color: string;
  /** Mini-swatch background colour, used by the skin picker's card mock. */
  preview_bg?: string;
  /** Mini-swatch foreground/text colour. */
  preview_fg?: string;
  /** Mini-swatch accent (header stripe) colour. */
  preview_accent?: string;
  order: number;
  css: string;
  fonts: ThemeFontEntry[];
}

let themesCache: ThemeMeta[] | null = null;
let themesLoading: Promise<ThemeMeta[]> | null = null;

export async function loadThemes(): Promise<ThemeMeta[]> {
  if (themesCache) return themesCache;
  if (themesLoading) return themesLoading;
  themesLoading = (async () => {
    try {
      const r = await fetch(THEMES_INDEX_URL, { cache: 'force-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = (await r.json()) as { themes: ThemeMeta[] };
      themesCache = (data.themes ?? []).sort((a, b) => a.order - b.order);
      return themesCache;
    } catch {
      themesCache = [{
        id: 'classic',
        name_key: 'theme.skin.classic.name',
        description_key: 'theme.skin.classic.description',
        preview_color: '#3b82f6',
        order: 0,
        css: 'themes/classic/theme.css',
        fonts: [],
      }];
      return themesCache;
    } finally {
      themesLoading = null;
    }
  })();
  return themesLoading;
}

let mql: MediaQueryList | null = null;

export function bindTheme(): void {
  effect(() => applyTheme(theme.get()));
  effect(() => applySkin(skin.get()));
  if (!mql && typeof matchMedia === 'function') {
    mql = matchMedia('(prefers-color-scheme: light)');
    mql.addEventListener('change', () => {
      if (theme.get() === 'system') setMetaThemeColor(resolvedColor('system'));
    });
  }
}
