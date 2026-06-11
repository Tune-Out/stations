// Locale config moved to src/locales.ts (the single source of truth used by
// the Astro shell, the SPA, the build scripts, and the linter). We re-export
// here so the SPA's "import from '../types.js'" calls keep working.
export {
  SUPPORTED_LOCALES,
  LOCALES,
  isSupportedLocale,
  type Locale,
  type LocaleMeta,
} from '../locales.js';
import type { Locale } from '../locales.js';

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
