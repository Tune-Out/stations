import type { Locale } from './types.js';
import { LOCALES, isSupportedLocale as _isSupportedLocale } from './types.js';
import { locale } from './store.js';

// Re-export so main.ts can keep importing from ./i18n.js
export const isSupportedLocale = _isSupportedLocale;

interface LocaleBundle {
  strings: Record<string, string>;
  tags: Record<string, string>;
}

let strings: Record<string, string> = {};
let tags: Record<string, string> = {};

export async function setLocale(l: Locale): Promise<void> {
  // One YAML per locale (./i18n/<l>.yaml) carries both the UI strings and
  // the canonical-tag dictionary. Contributors edit a single file when
  // improving a translation; the Vite plugin in astro.config.mjs parses
  // YAML at build time and emits the bundle as a JSON-shaped JS module,
  // so no YAML parser ships to the browser.
  const bundle = (await import(`./i18n/${l}.yaml`).then((m) => m.default)) as LocaleBundle;
  strings = bundle.strings ?? {};
  tags = bundle.tags ?? {};
  document.documentElement.lang = l;
  document.documentElement.dir = LOCALES[l].dir;
  try { localStorage.setItem('tuneout.locale', l); } catch { /* quota */ }
  locale.set(l);
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let out = strings[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return out;
}

export function tTag(tag: string): string {
  return tags[tag.toLowerCase()] ?? tag;
}

export function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem('tuneout.locale');
    if (isSupportedLocale(saved)) return saved;
  } catch { /* empty */ }
  const fromUrl = location.pathname.split('/')[1];
  if (isSupportedLocale(fromUrl)) return fromUrl;
  const langs = (navigator.languages ?? [navigator.language ?? 'en']).map((l) => l.slice(0, 2).toLowerCase());
  for (const l of langs) if (isSupportedLocale(l)) return l;
  return 'en';
}

export function countryName(cc: string, l: Locale): string {
  try {
    return new Intl.DisplayNames([l], { type: 'region' }).of(cc.toUpperCase()) ?? cc;
  } catch {
    return cc;
  }
}

export function languageName(code: string, l: Locale): string {
  try {
    return new Intl.DisplayNames([l], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
