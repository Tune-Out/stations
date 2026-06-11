/**
 * ─────────────────────────────────────────────────────────────────────────
 *                THE SOURCE OF TRUTH FOR EVERY SUPPORTED LOCALE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Adding a new locale (e.g. Vietnamese) takes three steps:
 *
 *   1. Add an entry to LOCALES below — code, English name, native name,
 *      script direction, page title, page description.
 *   2. Drop a UI-strings translation into  src/spa/i18n/strings/<code>.json
 *      (copy en.json, translate the values, keep the keys).
 *   3. Add a tag-label dictionary into     src/spa/i18n/tags/<code>.json
 *      (or add a column to TAG_TRANSLATIONS in scripts/build-tag-i18n.ts
 *      and run `npm run build:tag-i18n`).
 *
 * Everything else — the SPA router, the Astro page shells, the YAML linter,
 * the SQLite locale columns, the PWA service worker, the redirector — picks
 * up the new locale on the next build, with no code changes elsewhere.
 *
 * This file is intentionally minimal — no React/Astro/Vite imports — so it
 * can be loaded from anywhere: Astro `.astro` frontmatter, the SPA bundle,
 * the build scripts under `scripts/`, and the YAML linter.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const SUPPORTED_LOCALES = [
  'en', 'fr', 'ar',
  'de', 'it', 'es', 'pt',
  'hi', 'ja', 'zh', 'ko', 'id', 'ru',
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface LocaleMeta {
  /** BCP-47 short code; matches the file names in i18n/strings/<code>.json. */
  code: Locale;
  /** Locale name in English — used in admin/UI fall-backs and the language menu. */
  name: string;
  /** The endonym (locale name in its own script). What users see in the menu. */
  nativeName: string;
  /** Text direction — only `ar` is RTL today. */
  dir: 'ltr' | 'rtl';
  /** Page <title> for the locale's index shell. */
  title: string;
  /** <meta name="description"> for the locale's index shell. */
  description: string;
}

export const LOCALES: Record<Locale, LocaleMeta> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    title: 'Tune Out — Stream internet radio.',
    description: 'A public-domain catalog of ~60,000 internet radio stations — browse, search, and listen.',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    dir: 'ltr',
    title: 'Tune Out — Écoutez la radio en ligne.',
    description: 'Un catalogue public d’environ 60 000 radios en ligne — parcourez, cherchez et écoutez.',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    title: 'تيون أوت — استمع إلى الراديو عبر الإنترنت.',
    description: 'كتالوج مجاني لحوالي 60٬000 محطة راديو عبر الإنترنت — تصفّح وابحث واستمع.',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    dir: 'ltr',
    title: 'Tune Out — Internetradio hören.',
    description: 'Ein gemeinfreier Katalog von rund 60 000 Internetradiosendern — stöbern, suchen, hören.',
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    dir: 'ltr',
    title: 'Tune Out — Ascolta la radio su Internet.',
    description: 'Un catalogo di pubblico dominio di circa 60 000 web radio — sfoglia, cerca e ascolta.',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    dir: 'ltr',
    title: 'Tune Out — Escucha radio por Internet.',
    description: 'Un catálogo de dominio público con unas 60 000 radios por internet — explora, busca y escucha.',
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português (BR)',
    dir: 'ltr',
    title: 'Tune Out — Ouça rádio pela Internet.',
    description: 'Um catálogo de domínio público com cerca de 60 000 rádios online — navegue, pesquise e ouça.',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    dir: 'ltr',
    title: 'ट्यून आउट — इंटरनेट रेडियो सुनें।',
    description: 'लगभग 60,000 इंटरनेट रेडियो स्टेशनों का सार्वजनिक डोमेन कैटलॉग — ब्राउज़ करें, खोजें और सुनें।',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    dir: 'ltr',
    title: 'チューンアウト — インターネットラジオを聴く。',
    description: '約60,000のインターネットラジオ局を集めたパブリックドメインのカタログ — 見て、探して、聴く。',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '简体中文',
    dir: 'ltr',
    title: '调出 — 收听互联网广播。',
    description: '约 6 万家互联网广播电台的公共领域目录——浏览、搜索并收听。',
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    dir: 'ltr',
    title: '튠 아웃 — 인터넷 라디오를 들어보세요.',
    description: '약 60,000개의 인터넷 라디오 방송국이 담긴 퍼블릭 도메인 카탈로그 — 둘러보고, 검색하고, 들어보세요.',
  },
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    dir: 'ltr',
    title: 'Tune Out — Dengarkan radio Internet.',
    description: 'Katalog domain publik berisi sekitar 60.000 stasiun radio Internet — jelajahi, cari, dan dengarkan.',
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    dir: 'ltr',
    title: 'Tune Out — Слушайте интернет-радио.',
    description: 'Каталог в общественном достоянии примерно 60 000 интернет-радиостанций — просматривайте, ищите и слушайте.',
  },
};

/** Narrow a runtime string to a known Locale. */
export function isSupportedLocale(s: string | null | undefined): s is Locale {
  return !!s && (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

/** Pick the best locale for a browser language list. */
export function detectLocaleFrom(langs: readonly string[], fallback: Locale = 'en'): Locale {
  for (const raw of langs) {
    const short = raw.slice(0, 2).toLowerCase();
    if (isSupportedLocale(short)) return short;
  }
  return fallback;
}
