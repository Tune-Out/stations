import type { Locale } from './types.js';
import { LOCALES, SUPPORTED_LOCALES } from './types.js';
import { locale } from './store.js';

let strings: Record<string, string> = {};
let tags: Record<string, string> = {};

export async function setLocale(l: Locale): Promise<void> {
  // Eager-import the JSON modules so the bundler can split them.
  // Tag labels are loaded for *every* locale including English — the
  // dictionary turns canonical slugs (`pop-rock`, `r-and-b`, `k-pop`) into
  // user-friendly labels (`Pop Rock`, `R&B`, `K-Pop`).
  const [s, t] = await Promise.all([
    import(`./i18n/strings/${l}.json`).then((m) => m.default as Record<string, string>),
    import(`./i18n/tags/${l}.json`).then((m) => m.default as Record<string, string>),
  ]);
  strings = s;
  tags = t;
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

export function isSupportedLocale(s: string | null | undefined): s is Locale {
  return !!s && (SUPPORTED_LOCALES as string[]).includes(s);
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
