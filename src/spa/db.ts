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

// ─── UUID ↔ BLOB conversion ───────────────────────────────────────────
// The DB stores uuid as a 16-byte BLOB (the binary form of the standard
// 8-4-4-4-12 hex layout). We translate at the SPA boundary so application
// code keeps using the familiar string form everywhere.

const HEX = '0123456789abcdef';

function uuidToBlob(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) throw new Error(`invalid uuid: ${uuid}`);
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function blobToUuid(blob: Uint8Array): string {
  if (blob.length !== 16) return '';
  let s = '';
  for (let i = 0; i < 16; i++) {
    const b = blob[i]!;
    s += HEX[b >>> 4] + HEX[b & 0x0f];
    if (i === 3 || i === 5 || i === 7 || i === 9) s += '-';
  }
  return s;
}

let dbRef: Database | null = null;
let opening: Promise<Database> | null = null;

export interface ManifestArtifact { path: string; size: number; sha256: string; }
export interface Manifest {
  generated_at?: string;
  count?: number;
  locales?: string[];
  artifacts?: Record<string, ManifestArtifact>;
  stations_hash?: string;
}
let manifestCache: Manifest | null = null;

const DB_URL = '/data/stations.sqlite';
const MANIFEST_URL = '/data/manifest.json';
// Cache namespace. The actual cache key embeds the manifest's sqlite SHA-256,
// so a new build naturally invalidates the previous cache. The prefix lets
// us garbage-collect stale entries (older versions, the v1/v2 legacy names).
const CACHE_PREFIX = 'tuneout-sqlite:';
const LEGACY_CACHE_NAMES = ['tuneout-sqlite-v1', 'tuneout-sqlite-v2'];

/** Tables we expect to exist in any healthy build. If any is missing the
 *  cached DB is from an older build; we evict and redownload. */
const REQUIRED_TABLES = [
  'stations', 'stations_fts', 'tags', 'station_tags',
  'languages', 'station_languages', 'station_streams',
] as const;

async function evictAllSqliteCaches(): Promise<void> {
  if (!('caches' in self)) return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith(CACHE_PREFIX) || LEGACY_CACHE_NAMES.includes(n))
        .map((n) => caches.delete(n)),
    );
  } catch { /* private mode etc. */ }
}

async function evictAllSqliteCachesExcept(keep: string): Promise<void> {
  if (!('caches' in self)) return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => (n.startsWith(CACHE_PREFIX) && n !== keep) || LEGACY_CACHE_NAMES.includes(n))
        .map((n) => caches.delete(n)),
    );
  } catch { /* ignore */ }
}

async function fetchSqlite(cacheName: string, url: string): Promise<ArrayBuffer> {
  // Cache hit: serve straight from CacheAPI. cacheName already embeds the
  // current build's sha256 so a stale cache can't be served here.
  if ('caches' in self) {
    try {
      const c = await caches.open(cacheName);
      const hit = await c.match(url);
      if (hit) {
        dbStatus.set({ kind: 'opening' });
        return await hit.arrayBuffer();
      }
    } catch { /* private mode etc. */ }
  }
  // Cache miss: download, stream progress to the loader UI.
  const r = await fetch(url, { cache: 'no-store' });
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
      const c = await caches.open(cacheName);
      await c.put(url, new Response(out.slice(0).buffer, {
        headers: { 'content-type': 'application/octet-stream', 'content-length': String(out.byteLength) },
      }));
    } catch { /* quota; carry on */ }
  }
  dbStatus.set({ kind: 'opening' });
  return out.buffer;
}

/** Returns the build's sqlite SHA-256 from the live manifest, or null if
 *  the manifest is unreachable / malformed. We don't fail the boot on a
 *  network blip — fall back to a generic cache key in that case. */
async function fetchLiveManifest(): Promise<Manifest | null> {
  try {
    const r = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as Manifest;
  } catch {
    return null;
  }
}

/** Sniff the freshly-opened DB for required tables. Throws on mismatch so
 *  the caller can react (evict cache + redownload). */
function assertSchemaHealthy(db: Database): void {
  const rows = db.exec({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${REQUIRED_TABLES.map(() => '?').join(',')})`,
    bind: REQUIRED_TABLES as unknown as SqlValue[],
    rowMode: 'array',
    returnValue: 'resultRows',
  }) as [string][];
  const present = new Set(rows.map((r) => r[0]));
  const missing = REQUIRED_TABLES.filter((t) => !present.has(t));
  if (missing.length) {
    throw new Error(`stale cached database (missing tables: ${missing.join(', ')})`);
  }
}

async function loadAndDeserialize(cacheName: string) {
  const [sqlite3, buf] = await Promise.all([
    (sqlite3InitModule as unknown as (cfg: { print?: () => void; printErr?: () => void }) => Promise<Awaited<ReturnType<typeof sqlite3InitModule>>>)({
      print: () => {},
      printErr: () => {},
    }),
    fetchSqlite(cacheName, DB_URL),
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
  return db;
}

export async function openDb(): Promise<Database> {
  if (dbRef) return dbRef;
  if (opening) return opening;
  opening = (async () => {
    dbStatus.set({ kind: 'loading', received: 0, total: 0 });
    try {
      // Hit the live manifest first so we can key the cache by sha256. If
      // the manifest fetch fails (offline) we fall back to a generic key
      // and accept that we may serve a stale cache; the schema check
      // below catches stale-but-incompatible builds either way.
      const manifest = await fetchLiveManifest();
      const expectedSha = manifest?.artifacts?.sqlite?.sha256 ?? '';
      const cacheName = expectedSha
        ? `${CACHE_PREFIX}${expectedSha}`
        : `${CACHE_PREFIX}unknown`;
      // GC: drop every prior cache so disk doesn't grow unbounded across
      // many catalog rebuilds. This runs in parallel with the load so it
      // doesn't add latency to the user-visible path.
      void evictAllSqliteCachesExcept(cacheName);
      manifestCache = manifest ?? manifestCache;

      let db: Database;
      try {
        db = await loadAndDeserialize(cacheName);
        assertSchemaHealthy(db);
      } catch (e) {
        // Either the cached DB was structurally broken or the schema check
        // failed because the cached build was older than the SPA. Wipe
        // every sqlite cache and try a fresh download exactly once.
        console.warn('[db] cached load rejected, refreshing:', (e as Error).message);
        await evictAllSqliteCaches();
        dbStatus.set({ kind: 'loading', received: 0, total: 0 });
        db = await loadAndDeserialize(cacheName);
        assertSchemaHealthy(db);
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

/**
 * Explicit "reset everything" path: drop every sqlite cache + close the
 * in-memory DB, then re-run the boot. The loader UI's progress bar follows
 * automatically via dbStatus signals. Awaitable so the calling UI can
 * disable the button until the reload completes.
 */
export async function forceReloadDb(): Promise<Database> {
  try { dbRef?.close(); } catch { /* already closed */ }
  dbRef = null;
  opening = null;
  manifestCache = null;
  await evictAllSqliteCaches();
  dbStatus.set({ kind: 'loading', received: 0, total: 0 });
  return openDb();
}

export async function loadManifest(): Promise<Manifest> {
  if (manifestCache && Object.keys(manifestCache).length) return manifestCache;
  // Defer to the same network-first fetcher openDb() uses. On failure we
  // memoize an empty object so consumers (e.g. the Downloads view) don't
  // spin in a retry loop.
  const m = await fetchLiveManifest();
  manifestCache = m ?? {};
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
  const out = db.exec({ sql, bind: binds, rowMode: 'object', returnValue: 'resultRows' }) as T[];
  // Hydrate two things on every station row, once at the boundary:
  //   (1) uuid (stored as a 16-byte BLOB on disk) → the canonical
  //       8-4-4-4-12 hex string that the rest of the SPA expects.
  //   (2) streams_json (a string from json_group_array(…)) → a parsed
  //       streams[] array so views can iterate without re-parsing.
  for (const r of out as unknown as StationRow[]) {
    if (typeof r !== 'object' || r === null) continue;
    const rawUuid = (r as { uuid?: unknown }).uuid;
    if (rawUuid instanceof Uint8Array) {
      r.uuid = blobToUuid(rawUuid);
    }
    const raw = (r as { streams_json?: string | null }).streams_json;
    if (typeof raw === 'string' && raw.length) {
      try { r.streams = JSON.parse(raw) as StationRow['streams']; } catch { r.streams = []; }
    } else if (!r.streams) {
      // Synthesise a single-stream array from the top-level fields so the
      // UI can iterate uniformly. station_streams populates this for all
      // canonical stations, but a station_streams-less DB (e.g. tests with
      // a hand-built db) still works.
      if (r.url) {
        r.streams = [{
          url:          r.url,
          url_resolved: r.url_resolved ?? undefined,
          codec:        r.codec ?? undefined,
          bitrate:      r.bitrate ?? undefined,
          hls:          !!r.hls,
        }];
      } else {
        r.streams = [];
      }
    }
    delete (r as { streams_json?: string | null }).streams_json;
  }
  return out;
}

// ─── Selection sub-query: station row + joined tags_text + langs_text ──

// Always include these subqueries when fetching station rows so the UI has
// the comma-separated display lists without an extra round-trip.
const STATION_TAGS_SUBQUERY = `
  (SELECT GROUP_CONCAT(t.slug, ',')
     FROM station_tags st JOIN tags t ON t.id = st.tag_id
     WHERE st.station_uuid = s.uuid) AS tags_text`;
const STATION_LANGS_SUBQUERY = `
  (SELECT GROUP_CONCAT(l.slug, ',')
     FROM station_languages sl JOIN languages l ON l.id = sl.language_id
     WHERE sl.station_uuid = s.uuid) AS langs_text`;
// Streams come back as a single JSON string; the SPA parses it in
// hydrateStreams(). We use a stream-stable separator so unparseable URLs
// (which can contain almost anything) survive intact.
const STATION_STREAMS_SUBQUERY = `
  (SELECT json_group_array(
            json_object(
              'url',          ss.url,
              'url_resolved', ss.url_resolved,
              'codec',        ss.codec,
              'bitrate',      ss.bitrate,
              'hls',          ss.hls,
              'label',        ss.label
            )
          )
     FROM station_streams ss
     WHERE ss.station_uuid = s.uuid
     ORDER BY ss.sort_order) AS streams_json`;

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
    s.geo_lat, s.geo_long, s.curation, s.shard, s.yaml_path,
    s.r_reviewed_at, s.r_nature, s.r_operator, s.r_affiliations,
    s.r_audience, s.r_format, s.r_notes, s.r_sources,
    ${LOCALE_COLS},
    ${STATION_TAGS_SUBQUERY},
    ${STATION_LANGS_SUBQUERY},
    ${STATION_STREAMS_SUBQUERY}
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
    [uuidToBlob(uuid)],
  );
  return r[0];
}

export type SortKey =
  | 'relevance'  // FTS rank when there's a query, else votes
  | 'popular'   // votes DESC, clickcount DESC
  | 'trending'  // clickcount DESC
  | 'curated'   // editorial curation DESC then votes — drives the Home rails
  | 'name'      // alphabetical
  | 'bitrate'   // bitrate DESC (audio quality)
  | 'fresh'     // lastchangetime DESC
  | 'shuffle';  // random — caller passes a `seed` so paging is stable

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
    joins.push(`JOIN station_tags ${alias} ON ${alias}.station_uuid = s.uuid
                JOIN tags ${alias}t ON ${alias}t.id = ${alias}.tag_id AND ${alias}t.slug = ?`);
    binds.push(tag.toLowerCase());
  }
  for (const lang of filters.languages ?? []) {
    if (!lang) continue;
    const alias = `_l${binds.length}`;
    joins.push(`JOIN station_languages ${alias} ON ${alias}.station_uuid = s.uuid
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
    case 'curated':
      // Editorial quality first (unscored rows treated as 0 = neutral so
      // they fall between positive and negative), then popularity as the
      // tiebreaker within each curation band. This is what the Home rails
      // use — it surfaces public broadcasters, classical/jazz, and
      // commercial-free stations ahead of generic hit-rotation streams
      // even when the latter have higher vote counts.
      return 'COALESCE(s.curation, 0) DESC, s.votes DESC, s.clickcount DESC';
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
     JOIN station_tags st ON st.station_uuid = s.uuid
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
     JOIN station_languages sl ON sl.station_uuid = s.uuid
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
