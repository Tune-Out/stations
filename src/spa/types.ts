export type Locale =
  | 'en' | 'fr' | 'ar'
  | 'de' | 'it' | 'es' | 'pt'
  | 'hi' | 'ja' | 'zh' | 'ko' | 'id' | 'ru';

export const SUPPORTED_LOCALES: Locale[] = [
  'en', 'fr', 'ar',
  'de', 'it', 'es', 'pt',
  'hi', 'ja', 'zh', 'ko', 'id', 'ru',
];

export interface LocaleMeta {
  code: Locale;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALES: Record<Locale, LocaleMeta> = {
  en: { code: 'en', name: 'English',     nativeName: 'English',           dir: 'ltr' },
  fr: { code: 'fr', name: 'French',      nativeName: 'Français',          dir: 'ltr' },
  ar: { code: 'ar', name: 'Arabic',      nativeName: 'العربية',           dir: 'rtl' },
  de: { code: 'de', name: 'German',      nativeName: 'Deutsch',           dir: 'ltr' },
  it: { code: 'it', name: 'Italian',     nativeName: 'Italiano',          dir: 'ltr' },
  es: { code: 'es', name: 'Spanish',     nativeName: 'Español',           dir: 'ltr' },
  pt: { code: 'pt', name: 'Portuguese',  nativeName: 'Português (BR)',    dir: 'ltr' },
  hi: { code: 'hi', name: 'Hindi',       nativeName: 'हिन्दी',             dir: 'ltr' },
  ja: { code: 'ja', name: 'Japanese',    nativeName: '日本語',             dir: 'ltr' },
  zh: { code: 'zh', name: 'Chinese',     nativeName: '简体中文',           dir: 'ltr' },
  ko: { code: 'ko', name: 'Korean',      nativeName: '한국어',             dir: 'ltr' },
  id: { code: 'id', name: 'Indonesian',  nativeName: 'Bahasa Indonesia',  dir: 'ltr' },
  ru: { code: 'ru', name: 'Russian',     nativeName: 'Русский',           dir: 'ltr' },
};

/**
 * Base station-row shape. Localized columns are added via the mapped type
 * `LocaleColumns` below so the type and the SELECT list stay in sync as
 * SUPPORTED_LOCALES grows.
 */
interface StationRowBase {
  uuid: string;
  name: string;
  url: string;
  url_resolved?: string;
  homepage: string;
  favicon: string;
  country: string;
  countrycode: string;
  state: string;
  languagecodes: string;
  votes: number;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  lastchangetime?: string;
  clickcount: number;
  geo_lat: number | null;
  geo_long: number | null;
  shard: string;
  yaml_path: string;
  /** Comma-separated tag slugs in canonical order. Joined at query time. */
  tags_text: string | null;
  /** Comma-separated language slugs (long names: english, french). */
  langs_text: string | null;
  // Editorial research (migrated from YAML comments)
  r_reviewed_at?: string | null;
  r_nature?: string | null;
  r_operator?: string | null;
  r_affiliations?: string | null;
  r_audience?: string | null;
  r_format?: string | null;
  r_notes?: string | null;
  r_sources?: string | null;
}

type LocaleColumns = {
  [K in `name_${Locale}` | `desc_${Locale}` | `kw_${Locale}`]?: string | null;
};

export type StationRow = StationRowBase & LocaleColumns;

export interface StationRef {
  uuid: string;
  name: string;
  favicon: string;
  url: string;
  shard: string;
  countrycode: string;
}

export interface NowPlaying {
  artist?: string;
  title?: string;
  artworkUrl?: string;
  raw?: string;
}

function pickLocaleString(
  row: Partial<StationRow>,
  key: keyof LocaleColumns,
): string | null {
  const v = (row as LocaleColumns)[key];
  return v ?? null;
}

export function refFromRow(row: StationRow, locale: Locale): StationRef {
  const localized = pickLocaleString(row, `name_${locale}`) ?? '';
  return {
    uuid: row.uuid,
    name: (localized || row.name).trim(),
    favicon: row.favicon ?? '',
    url: row.url ?? '',
    shard: row.shard,
    countrycode: row.countrycode ?? '',
  };
}

export function localizedName(row: { name: string } & Partial<StationRow>, locale: Locale): string {
  const v = pickLocaleString(row, `name_${locale}`);
  return (v && v.trim()) || row.name;
}

export function localizedDesc(row: Partial<StationRow>, locale: Locale): string {
  return pickLocaleString(row, `desc_${locale}`) ?? '';
}
