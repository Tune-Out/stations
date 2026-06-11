import { z } from 'zod';

const nullableString = z.preprocess((v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}, z.string());

const nullableBool = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return Boolean(v);
}, z.boolean());

const nullableInt = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}, z.number().int());

const nullableFloat = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}, z.number().nullable());

const stringList = z.preprocess((v) => {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()));

// Single source of truth for the locale list lives in src/locales.ts. We
// re-export so the build scripts and the linter keep using the same name.
export { SUPPORTED_LOCALES, type Locale } from '../../src/locales.js';
import { SUPPORTED_LOCALES, type Locale } from '../../src/locales.js';

const LocalizedEntry = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  keywords: stringList.optional().default([]),
});

export type LocalizedEntry = z.infer<typeof LocalizedEntry>;

const LocalizedMap = z.preprocess(
  (v) => (v === null || v === undefined ? {} : v),
  z.record(z.enum(SUPPORTED_LOCALES), LocalizedEntry),
);

/**
 * One audio stream for a station. A station may have several — typically
 * different codec/bitrate variants of the same broadcast. The top-level
 * `url`/`codec`/`bitrate`/`hls`/`url_resolved` fields still describe the
 * primary/default stream; `streams:` (when populated) is the canonical
 * list and the build pipeline mirrors it into a join table. When `streams:`
 * is absent or empty, the build pipeline synthesises a single-row entry
 * from the top-level fields.
 */
const StreamEntry = z.object({
  url:          nullableString,
  url_resolved: nullableString.optional().default(''),
  codec:        nullableString.optional().default(''),
  bitrate:      nullableInt.optional().default(0),
  hls:          nullableBool.optional().default(false),
  /** Optional human label override; auto-derived from codec+bitrate otherwise. */
  label:        nullableString.optional().default(''),
});
export type StreamEntry = z.infer<typeof StreamEntry>;

/** Editorial research block migrated out of trailing YAML comments. */
const ResearchBlock = z.object({
  reviewed_at: nullableString.optional().default(''),
  nature: nullableString.optional().default(''),
  operator: nullableString.optional().default(''),
  affiliations: nullableString.optional().default(''),
  audience: nullableString.optional().default(''),
  format: nullableString.optional().default(''),
  notes: nullableString.optional().default(''),
  sources: nullableString.optional().default(''),
}).partial();

export type ResearchBlock = z.infer<typeof ResearchBlock>;

export const StationSchema = z.object({
  stationuuid: z.string().min(8),
  name: z.string().min(1),
  url: nullableString,
  url_resolved: nullableString.optional().default(''),
  homepage: nullableString,
  favicon: nullableString,
  tags: stringList,
  country: nullableString,
  countrycode: nullableString,
  state: nullableString,
  language: stringList,
  languagecodes: stringList,
  votes: nullableInt,
  codec: nullableString,
  bitrate: nullableInt,
  hls: nullableBool,
  lastcheckok: nullableBool,
  lastchangetime: nullableString.optional().default(''),
  clickcount: nullableInt.optional().default(0),
  geo_lat: nullableFloat,
  geo_long: nullableFloat,
  /**
   * Editorial quality score in the range −1.0 … +1.0. Positive values mark
   * notable / non-commercial / music-focused stations; negative values mark
   * ad-saturated, low-effort, or repetitive streams. Null means unscored.
   * Computed by scripts/score-curation.ts from the research block (with
   * any web-research deltas merged in from the popular-station workflow)
   * and written back into the YAML so the build pipeline is deterministic.
   */
  curation: nullableFloat
    .refine((v) => v === null || (v >= -1 && v <= 1), { message: 'curation must be between -1 and 1' })
    .optional()
    .default(null),
  /**
   * Points to the canonical (authoritative) `stationuuid` when this YAML
   * is a duplicate of another station — typically when two upstream feeds
   * share the same stream URL but were registered separately. The build
   * pipeline skips any station with a non-empty `duplicate_of`, so the
   * SQLite catalog only contains canonical entries. The YAML stays in the
   * tree as a redirect breadcrumb, so older bookmarks / links resolve to
   * the right entry rather than 404'ing.
   */
  duplicate_of: nullableString.optional().default(''),
  /**
   * Multiple stream variants (different codec/bitrate) for the same
   * broadcast. When non-empty, this is the canonical list and the build
   * pipeline writes one row per entry into the `station_streams` table.
   * The first entry is conventionally the "preferred" stream (high-bitrate
   * lossless if available, else highest-bitrate MP3/AAC). The top-level
   * `url`/`codec`/`bitrate`/`hls` fields mirror the preferred stream for
   * backward compatibility with consumers that read a single URL.
   */
  streams: z.preprocess((v) => (v == null ? [] : v), z.array(StreamEntry)).optional().default([]),
  localized: LocalizedMap.optional().default({}),
  research: ResearchBlock.optional().default({}),
});

export type Station = z.infer<typeof StationSchema>;

export function stationDisplayName(s: Station): string {
  return s.name.trim() || 'Untitled Station';
}

export function localizedField(
  s: Station,
  locale: Locale,
  field: 'name' | 'description' | 'summary' | 'keywords',
): string | string[] | undefined {
  return s.localized?.[locale]?.[field];
}
