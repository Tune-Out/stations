/**
 * SQLite-WASM wrapper + query helpers.
 *
 * Schema notes:
 *   - tags and languages are normalized: `tags`, `station_tags`, `languages`,
 *     `station_languages`. Use indexed JOINs for structured filtering.
 *   - stations_fts is FTS5 contentless ({@link content=''}). Always JOIN back
 *     to `stations` for the column data; FTS only confirms a match + supplies
 *     `rank` for ordering.
 *   - every helper returns rows enriched with `tags_text` and `langs_text`
 *     (comma-separated, in display order) computed by group_concat subqueries
 *     so card components don't need a second round-trip.
 *
 * Logging: every SQL run is `console.debug('[SQL] …')` so you can follow what
 * the UI is doing from the browser devtools.
 */
import sqlite3InitModule, {
  type Database,
  type SqlValue,
} from '@sqlite.org/sqlite-wasm';
import { dbStatus } from './store.js';
import type { Locale, StationRow } from './types.js';
import { SUPPORTED_LOCALES } from './types.js';

let dbRef: Database | null = null;
let opening: Promise<Database> | null = null;

const DB_URL = '/data/stations.sqlite';
const MANIFEST_URL = '/data/manifest.json';
// Bumped because the schema changed (normalized tags/languages). The browser's
// cached SQLite from a previous version would crash queries; this cache key
// change forces a fresh download.
const CACHE_NAME = 'tuneout-sqlite-v2';

async function fetchSqlite(url: string): Promise<ArrayBuffer> {
  if ('caches' in self) {
    try {
      const c = await caches.open(CACHE_NAME);
      const hit = await c.match(url);
      if (hit) {
        dbStatus.set({ kind: 'opening' });
        return await hit.arrayBuffer();
      }
    } catch { /* private mode etc. */ }
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const total = Number(r.headers.get('content-length') ?? 0);
  if (!r.body) return r.arrayBuffer();
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    dbStatus.set({ kind: 'loading', received, total });
  }
  const out = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  if ('caches' in self) {
    try {
      const c = await caches.open(CACHE_NAME);
      await c.put(url, new Response(out.slice(0).buffer, {
        headers: { 'content-type': 'application/octet-stream', 'content-length': String(out.byteLength) },
      }));
    } catch { /* quota; carry on */ }
  }
  dbStatus.set({ kind: 'opening' });
  return out.buffer;
}

export async function openDb(): Promise<Database> {
  if (dbRef) return dbRef;
  if (opening) return opening;
  opening = (async () => {
    dbStatus.set({ kind: 'loading', received: 0, total: 0 });
    try {
      // The current @sqlite.org/sqlite-wasm typings don't expose the optional
      // `print` / `printErr` config args; we silence the chatty WASM logger via
      // an `as any` rather than blow up the build.
      const [sqlite3, buf] = await Promise.all([
        (sqlite3InitModule as unknown as (cfg: { print?: () => void; printErr?: () => void }) => Promise<Awaited<ReturnType<typeof sqlite3InitModule>>>)({
          print: () => {},
          printErr: () => {},
        }),
        fetchSqlite(DB_URL),
      ]);
      const bytes = new Uint8Array(buf);
      const db = new sqlite3.oo1.DB('/tuneout.sqlite', 'ct');
      const p = sqlite3.wasm.allocFromTypedArray(bytes);
      try {
        const rc = sqlite3.capi.sqlite3_deserialize(
          db.pointer!,
          'main',
          p,
          bytes.byteLength,
          bytes.byteLength,
          sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE,
        );
        if (rc !== 0) throw new Error('sqlite3_deserialize failed: ' + rc);
      } catch (e) {
        sqlite3.wasm.dealloc(p);
        throw e;
      }
      dbRef = db;
      dbStatus.set({ kind: 'ready' });
      return db;
    } catch (e) {
      dbStatus.set({ kind: 'error', message: (e as Error).message });
      throw e;
    } finally {
      opening = null;
    }
  })();
  return opening;
}

export interface ManifestArtifact { path: string; size: number; sha256: string; }
export interface Manifest {
  generated_at?: string;
  count?: number;
  locales?: string[];
  artifacts?: Record<string, ManifestArtifact>;
  stations_hash?: string;
}

let manifestCache: Manifest | null = null;
export async function loadManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  try {
    const r = await fetch(MANIFEST_URL, { cache: 'force-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    manifestCache = (await r.json()) as Manifest;
  } catch {
    manifestCache = {};
  }
  return manifestCache;
}

// ─── SQL helper with debug logging ─────────────────────────────────────

function compactSql(sql: string): string {
  return sql.trim().replace(/\s+/g, ' ');
}

function logSql(label: string, sql: string, binds: SqlValue[]): void {
  const compact = compactSql(sql);
  // Two-form log: a colored single-line summary for visual scanning, then the
  // raw SQL on its own line so it copies cleanly. Binds are an inspectable array.
  // eslint-disable-next-line no-console
  console.debug(
    `%c[SQL]%c ${label} %c${compact}`,
    'color:#60a5fa;font-weight:600',
    'color:#f59e0b;font-weight:600',
    'color:inherit',
    binds.length ? binds : '',
  );
  // eslint-disable-next-line no-console
  console.debug('[SQL]', label, compact, binds.length ? binds : '');
}

function rows<T = StationRow>(
  db: Database,
  label: string,
  sql: string,
  binds: SqlValue[] = [],
): T[] {
  logSql(label, sql, binds);
  return db.exec({ sql, bind: binds, rowMode: 'object', returnValue: 'resultRows' }) as T[];
}

// ─── Selection sub-query: station row + joined tags_text + langs_text ──

// Always include these subqueries when fetching station rows so the UI has
// the comma-separated display lists without an extra round-trip.
const STATION_TAGS_SUBQUERY = `
  (SELECT GROUP_CONCAT(t.slug, ',')
     FROM station_tags st JOIN tags t ON t.id = st.tag_id
     WHERE st.station_rowid = s.rowid) AS tags_text`;
const STATION_LANGS_SUBQUERY = `
  (SELECT GROUP_CONCAT(l.slug, ',')
     FROM station_languages sl JOIN languages l ON l.id = sl.language_id
     WHERE sl.station_rowid = s.rowid) AS langs_text`;

// "s.*" minus the columns no longer on stations:
// stations now has the relevant scalar fields directly; tags/lang text come
// from the two subqueries above.
// Locale columns are generated from SUPPORTED_LOCALES so adding a locale only
// touches src/spa/types.ts — previously this list was hard-coded to en/fr/ar
// and silently dropped the other 10 locales' name/desc/kw data.
const LOCALE_COLS = SUPPORTED_LOCALES.flatMap((l) => [
  `s.name_${l}`, `s.desc_${l}`, `s.kw_${l}`,
]).join(', ');

const SELECT_STATION_FULL = `
  SELECT
    s.uuid, s.name, s.url, s.url_resolved, s.homepage, s.favicon,
    s.country, s.countrycode, s.state, s.languagecodes,
    s.votes, s.codec, s.bitrate, s.hls, s.lastcheckok,
    s.lastchangetime, s.clickcount,
    s.geo_lat, s.geo_long, s.shard, s.yaml_path,
    s.r_reviewed_at, s.r_nature, s.r_operator, s.r_affiliations,
    s.r_audience, s.r_format, s.r_notes, s.r_sources,
    ${LOCALE_COLS},
    ${STATION_TAGS_SUBQUERY},
    ${STATION_LANGS_SUBQUERY}
`;

// ─── Query helpers ─────────────────────────────────────────────────────

export function topStations(db: Database, limit = 24): StationRow[] {
  return rows(
    db,
    'topStations',
    `${SELECT_STATION_FULL}
     FROM stations s
     WHERE s.lastcheckok = 1 AND s.url <> ''
     ORDER BY s.votes DESC, s.clickcount DESC
     LIMIT ?`,
    [limit],
  );
}

export function getStation(db: Database, uuid: string): StationRow | undefined {
  const r = rows(
    db,
    'getStation',
    `${SELECT_STATION_FULL} FROM stations s WHERE s.uuid = ? LIMIT 1`,
    [uuid],
  );
  return r[0];
}

export type SortKey =
  | 'relevance'   // FTS rank when there's a query, else votes
  | 'popular'    // votes DESC, clickcount DESC
  | 'trending'   // clickcount DESC
  | 'name'       // alphabetical
  | 'bitrate'    // bitrate DESC (audio quality)
  | 'fresh'      // lastchangetime DESC
  | 'shuffle';   // random — caller passes a `seed` so paging is stable

export interface SearchFilters {
  /** ISO 3166-1 alpha-2 country code (e.g. "CA"). */
  country?: string;
  codec?: string;
  /** One or more tag slugs (AND-combined). */
  tags?: string[];
  /** One or more language slugs/ISO 639-1 codes (AND-combined). */
  languages?: string[];
  /** Editorial "nature" filter — exact match against r_nature. */
  nature?: string;
  onlineOnly?: boolean;
  sort?: SortKey;
  /** Stable random-sort seed. Required when sort='shuffle'; ignored otherwise. */
  shuffleSeed?: number;
  limit?: number;
  offset?: number;
}

interface BuiltClauses {
  joins: string[];
  where: string[];
  binds: SqlValue[];
  hasFts: boolean;
}

import { buildFtsExpression } from './search-syntax.js';

function buildClauses(query: string, filters: SearchFilters): BuiltClauses {
  const joins: string[] = [];
  const where: string[] = [];
  const binds: SqlValue[] = [];
  let hasFts = false;

  const ftsExpr = buildFtsExpression(query);
  if (ftsExpr) {
    hasFts = true;
    joins.push('JOIN stations_fts f ON f.rowid = s.rowid');
    where.push('stations_fts MATCH ?');
    binds.push(ftsExpr);
  }

  if (filters.country)  { where.push('s.countrycode = ?'); binds.push(filters.country); }
  if (filters.codec)    { where.push('s.codec = ?');       binds.push(filters.codec); }
  if (filters.nature)   { where.push('s.r_nature LIKE ?'); binds.push(`%${filters.nature}%`); }
  if (filters.onlineOnly) where.push('s.lastcheckok = 1');

  // Multi-tag with AND semantics: each tag adds another JOIN against the
  // junction so the row only survives if every tag is present.
  for (const tag of filters.tags ?? []) {
    if (!tag) continue;
    const alias = `_t${binds.length}`;
    joins.push(`JOIN station_tags ${alias} ON ${alias}.station_rowid = s.rowid
                JOIN tags ${alias}t ON ${alias}t.id = ${alias}.tag_id AND ${alias}t.slug = ?`);
    binds.push(tag.toLowerCase());
  }
  for (const lang of filters.languages ?? []) {
    if (!lang) continue;
    const alias = `_l${binds.length}`;
    joins.push(`JOIN station_languages ${alias} ON ${alias}.station_rowid = s.rowid
                JOIN languages ${alias}l ON ${alias}l.id = ${alias}.language_id AND ${alias}l.slug = ?`);
    binds.push(lang.toLowerCase());
  }

  if (!where.length) where.push('1=1');
  return { joins, where, binds, hasFts };
}

function orderByFor(sort: SortKey | undefined, hasFts: boolean, shuffleSeed?: number): string {
  switch (sort) {
    case 'popular':  return 's.votes DESC, s.clickcount DESC';
    case 'trending': return 's.clickcount DESC, s.votes DESC';
    case 'name':     return 's.name COLLATE NOCASE ASC';
    case 'bitrate':  return 's.bitrate DESC, s.votes DESC';
    case 'fresh':    return 's.lastchangetime DESC, s.votes DESC';
    case 'shuffle':
      // Deterministic shuffle so pagination doesn't double-show rows. Uses
      // the seed so two callers with the same seed get the same ordering.
      // (SQLite's RANDOM() is non-deterministic; the (rowid * seed) % large
      // prime hash gives a stable per-page pseudo-random order.)
      return `((s.rowid * ${shuffleSeed ?? 1}) % 2147483647)`;
    case 'relevance':
    default:
      return hasFts ? 'rank' : 's.votes DESC, s.clickcount DESC';
  }
}

export function searchStations(
  db: Database,
  query: string,
  _locale: Locale,
  filters: SearchFilters = {},
): StationRow[] {
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const { joins, where, binds, hasFts } = buildClauses(query, filters);
  binds.push(limit, offset);
  const orderBy = orderByFor(filters.sort, hasFts, filters.shuffleSeed);
  return rows(
    db,
    'searchStations',
    `${SELECT_STATION_FULL}
     FROM stations s
     ${joins.join('\n     ')}
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    binds,
  );
}

export function countSearch(db: Database, query: string, filters: SearchFilters): number {
  const { joins, where, binds } = buildClauses(query, filters);
  const r = rows<{ c: number }>(
    db,
    'countSearch',
    `SELECT COUNT(*) AS c FROM stations s
     ${joins.join('\n     ')}
     WHERE ${where.join(' AND ')}`,
    binds,
  );
  return r[0]?.c ?? 0;
}

export function byCountry(db: Database, countrycode: string, limit = 100, offset = 0): StationRow[] {
  return rows(
    db,
    'byCountry',
    `${SELECT_STATION_FULL}
     FROM stations s
     WHERE s.countrycode = ? AND s.url <> ''
     ORDER BY s.votes DESC, s.clickcount DESC
     LIMIT ? OFFSET ?`,
    [countrycode, limit, offset],
  );
}

export function byTag(db: Database, tag: string, limit = 100, offset = 0): StationRow[] {
  return rows(
    db,
    'byTag',
    `${SELECT_STATION_FULL}
     FROM stations s
     JOIN station_tags st ON st.station_rowid = s.rowid
     JOIN tags t ON t.id = st.tag_id
     WHERE t.slug = ? AND s.url <> ''
     ORDER BY s.votes DESC, s.clickcount DESC
     LIMIT ? OFFSET ?`,
    [tag.toLowerCase(), limit, offset],
  );
}

export function topCountries(db: Database, limit = 30): { countrycode: string; country: string; n: number }[] {
  return rows<{ countrycode: string; country: string; n: number }>(
    db,
    'topCountries',
    `SELECT countrycode, country, COUNT(*) AS n FROM stations
     WHERE countrycode <> '' AND lastcheckok = 1
     GROUP BY countrycode ORDER BY n DESC LIMIT ?`,
    [limit],
  );
}

export function topTags(db: Database, limit = 60): { tag: string; n: number }[] {
  return rows<{ tag: string; n: number }>(
    db,
    'topTags',
    `SELECT t.slug AS tag, COUNT(*) AS n
     FROM tags t JOIN station_tags st ON st.tag_id = t.id
     GROUP BY t.id ORDER BY n DESC LIMIT ?`,
    [limit],
  );
}

export function totalCount(db: Database): number {
  const r = rows<{ c: number }>(db, 'totalCount', `SELECT COUNT(*) AS c FROM stations`);
  return r[0]?.c ?? 0;
}

/** Look up a tag's slug case-insensitively. Returns null if unknown. */
export function findTagSlug(db: Database, input: string): string | null {
  const r = rows<{ slug: string }>(
    db,
    'findTagSlug',
    `SELECT slug FROM tags WHERE slug = ? LIMIT 1`,
    [input.trim().toLowerCase()],
  );
  return r[0]?.slug ?? null;
}

/**
 * Resolve a user-supplied country reference (`Canada`, `CA`, `canada`,
 * `the netherlands`) to an ISO 3166-1 alpha-2 code. Used by the search
 * parser so `country:canada` works in addition to `country:CA`.
 */
export function resolveCountryCode(db: Database, input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  const r = rows<{ countrycode: string }>(
    db,
    'resolveCountryCode',
    `SELECT countrycode FROM stations
     WHERE LOWER(country) = LOWER(?)
        OR LOWER(country) = LOWER('The ' || ?)
        OR LOWER(country) LIKE LOWER(? || '%')
     LIMIT 1`,
    [v, v, v],
  );
  return r[0]?.countrycode ?? null;
}

/** Top languages used by stations (after canonicalization). */
export function topLanguages(db: Database, limit = 60): { lang: string; n: number }[] {
  return rows<{ lang: string; n: number }>(
    db,
    'topLanguages',
    `SELECT l.slug AS lang, COUNT(*) AS n
     FROM languages l JOIN station_languages sl ON sl.language_id = l.id
     GROUP BY l.id ORDER BY n DESC LIMIT ?`,
    [limit],
  );
}

/** Stations by language slug or ISO 639-1 code. */
export function byLanguage(db: Database, lang: string, limit = 100, offset = 0): StationRow[] {
  return rows(
    db,
    'byLanguage',
    `${SELECT_STATION_FULL}
     FROM stations s
     JOIN station_languages sl ON sl.station_rowid = s.rowid
     JOIN languages l ON l.id = sl.language_id
     WHERE l.slug = ? AND s.url <> ''
     ORDER BY s.votes DESC, s.clickcount DESC
     LIMIT ? OFFSET ?`,
    [lang.toLowerCase(), limit, offset],
  );
}

/** Distinct r_nature values + their counts. Drives the nature facet picker. */
export function topNatures(db: Database, limit = 12): { nature: string; n: number }[] {
  return rows<{ nature: string; n: number }>(
    db,
    'topNatures',
    `SELECT r_nature AS nature, COUNT(*) AS n
     FROM stations WHERE r_nature <> ''
     GROUP BY r_nature ORDER BY n DESC LIMIT ?`,
    [limit],
  );
}
