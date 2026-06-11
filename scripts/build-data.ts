#!/usr/bin/env tsx
/**
 * Read data/stations/**\/*.yaml and emit:
 *   public/data/stations.sqlite           — full DB + FTS5 index + locale columns
 *   public/data/manifest.json             — generated_at, count, sqlite SHA-256
 *
 * With --release, also emit:
 *   public/data/stations.zip              — all YAMLs (stored, not compressed)
 *   public/data/stations.json.gz          — single JSON array, gzipped
 *
 * Short-circuits when nothing changed: if the hash of data/stations/** matches
 * the previous manifest's `stations_hash`, we skip the rebuild.
 */
import { createReadStream, createWriteStream, existsSync, unlinkSync } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { cpus } from 'node:os';

import fg from 'fast-glob';
import pLimit from 'p-limit';
import archiver from 'archiver';
import { DatabaseSync } from 'node:sqlite';
import { parse } from 'yaml';

import { StationSchema, SUPPORTED_LOCALES, type Station, type Locale } from './lib/schema.js';
import { LOCALES } from '../src/locales.js';
import { shardForUuid } from './lib/shard.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const DATA_DIR = join(ROOT, 'data', 'stations');
const OUT_DIR = join(ROOT, 'public', 'data');

const FORCE = process.argv.includes('--force');
const RELEASE = process.argv.includes('--release');

const t0 = Date.now();

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${(s % 60).toString().padStart(2, '0')}s`;
}

async function hashFiles(paths: string[]): Promise<string> {
  const h = createHash('sha1');
  for (const p of paths) {
    const s = await stat(p);
    h.update(p);
    h.update(String(s.size));
    h.update(String(s.mtimeMs));
  }
  return h.digest('hex');
}

async function fileSha256(p: string): Promise<string> {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(p)) {
    h.update(chunk as Buffer);
  }
  return h.digest('hex');
}

async function parseAll(paths: string[]): Promise<Station[]> {
  const limit = pLimit(Math.max(4, cpus().length));
  const out: Station[] = new Array(paths.length);
  let parsed = 0;
  let errored = 0;
  await Promise.all(
    paths.map((p, i) =>
      limit(async () => {
        try {
          const text = await readFile(p, 'utf8');
          const raw = parse(text);
          out[i] = StationSchema.parse(raw);
        } catch (e) {
          errored += 1;
          if (errored < 5) console.warn(`[build-data] parse error ${p}:`, (e as Error).message);
          return;
        }
        parsed += 1;
        if (parsed % 5000 === 0) {
          process.stdout.write(`\r[build-data] parsed ${parsed}/${paths.length}`);
        }
      }),
    ),
  );
  process.stdout.write('\n');
  if (errored) console.warn(`[build-data] ${errored} parse errors (skipped)`);
  return out.filter(Boolean);
}

function pickLocale(s: Station, locale: Locale, field: 'name' | 'description' | 'summary'): string {
  const v = s.localized?.[locale]?.[field];
  if (typeof v === 'string' && v.length) return v;
  return '';
}

function pickLocaleKeywords(s: Station, locale: Locale): string {
  const v = s.localized?.[locale]?.keywords;
  if (Array.isArray(v) && v.length) return v.join(' ');
  return '';
}

function normalizeTag(s: string): string {
  return s.trim().toLowerCase();
}

function buildSqlite(stations: Station[], dbPath: string) {
  if (existsSync(dbPath)) {
    try { unlinkSync(dbPath); } catch {}
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = MEMORY');
  db.exec('PRAGMA synchronous = OFF');
  db.exec('PRAGMA temp_store = MEMORY');
  db.exec('PRAGMA foreign_keys = ON');

  // Locale columns are added dynamically so adding a locale is a one-line change.
  const localeCols = SUPPORTED_LOCALES.flatMap((l) => [
    `name_${l} TEXT`,
    `desc_${l} TEXT`,
    `kw_${l} TEXT`,
  ]).join(',\n      ');
  const ftsLocaleCols = SUPPORTED_LOCALES.flatMap((l) => [
    `name_${l}`,
    `desc_${l}`,
    `kw_${l}`,
  ]).join(', ');

  // ── Schema ──────────────────────────────────────────────────────────
  // Tags and languages are normalized into junction tables. The stations
  // table holds the per-station scalar fields only. The FTS5 virtual table
  // is contentless — we feed it joined text strings on every rebuild.
  db.exec(`
    CREATE TABLE stations (
      rowid         INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid          TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      url           TEXT,
      url_resolved  TEXT,
      homepage      TEXT,
      favicon       TEXT,
      country       TEXT,
      countrycode   TEXT,
      state         TEXT,
      languagecodes TEXT,
      votes         INTEGER,
      codec         TEXT,
      bitrate       INTEGER,
      hls           INTEGER,
      lastcheckok   INTEGER,
      lastchangetime TEXT,
      clickcount    INTEGER,
      geo_lat       REAL,
      geo_long      REAL,
      shard         TEXT,
      yaml_path     TEXT,
      -- ── Editorial research (migrated from YAML comments) ──
      r_reviewed_at  TEXT,
      r_nature       TEXT,
      r_operator     TEXT,
      r_affiliations TEXT,
      r_audience     TEXT,
      r_format       TEXT,
      r_notes        TEXT,
      r_sources      TEXT,
      ${localeCols}
    );

    CREATE TABLE tags (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      slug  TEXT UNIQUE NOT NULL
    );
    CREATE TABLE station_tags (
      station_rowid INTEGER NOT NULL,
      tag_id        INTEGER NOT NULL,
      PRIMARY KEY (station_rowid, tag_id),
      FOREIGN KEY (station_rowid) REFERENCES stations(rowid) ON DELETE CASCADE,
      FOREIGN KEY (tag_id)        REFERENCES tags(id)        ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE TABLE languages (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      slug  TEXT UNIQUE NOT NULL
    );
    CREATE TABLE station_languages (
      station_rowid INTEGER NOT NULL,
      language_id   INTEGER NOT NULL,
      PRIMARY KEY (station_rowid, language_id),
      FOREIGN KEY (station_rowid) REFERENCES stations(rowid) ON DELETE CASCADE,
      FOREIGN KEY (language_id)   REFERENCES languages(id)   ON DELETE CASCADE
    ) WITHOUT ROWID;

    CREATE INDEX idx_st_tag      ON station_tags(tag_id);
    CREATE INDEX idx_sl_language ON station_languages(language_id);

    CREATE INDEX idx_countrycode ON stations(countrycode);
    CREATE INDEX idx_votes       ON stations(votes DESC);
    CREATE INDEX idx_codec       ON stations(codec);
    CREATE INDEX idx_clickcount  ON stations(clickcount DESC);
    CREATE INDEX idx_lastcheckok ON stations(lastcheckok);
    CREATE INDEX idx_nature      ON stations(r_nature);

    -- Contentless FTS5: stores only the search index, not the text itself.
    -- Smallest on-disk footprint. We always JOIN back to stations for the
    -- row data so the lack of stored text is invisible to consumers.
    -- country/state/codec are filtered via SQL indexes — not FTS columns.
    -- research_text is the searchable concatenation of operator+affiliations+
    -- notes+format so "tag:jazz state media" works as expected.
    CREATE VIRTUAL TABLE stations_fts USING fts5(
      name, tags_text, languages_text, research_text,
      ${ftsLocaleCols},
      content='',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);

  // ── 1. Collect unique tag + language slugs ───────────────────────────
  const allTags = new Set<string>();
  const allLangs = new Set<string>();
  for (const s of stations) {
    for (const t of s.tags) {
      const slug = normalizeTag(t);
      if (slug) allTags.add(slug);
    }
    for (const lang of s.language) {
      const slug = normalizeTag(lang);
      if (slug) allLangs.add(slug);
    }
  }
  console.log(`[build-data]   ${allTags.size} unique tags, ${allLangs.size} unique languages`);

  const tagId = new Map<string, number>();
  const langId = new Map<string, number>();

  const insertTag  = db.prepare('INSERT INTO tags (slug) VALUES (?)');
  const insertLang = db.prepare('INSERT INTO languages (slug) VALUES (?)');

  db.exec('BEGIN');
  try {
    for (const slug of [...allTags].sort()) {
      const info = insertTag.run(slug);
      tagId.set(slug, Number(info.lastInsertRowid));
    }
    for (const slug of [...allLangs].sort()) {
      const info = insertLang.run(slug);
      langId.set(slug, Number(info.lastInsertRowid));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  // ── 2. Insert stations + junction rows + FTS5 rows ───────────────────
  const baseCols = [
    'uuid','name','url','url_resolved','homepage','favicon','country','countrycode',
    'state','languagecodes','votes','codec','bitrate','hls','lastcheckok',
    'lastchangetime','clickcount','geo_lat','geo_long','shard','yaml_path',
    'r_reviewed_at','r_nature','r_operator','r_affiliations','r_audience','r_format','r_notes','r_sources',
  ];
  const localeColsList = SUPPORTED_LOCALES.flatMap((l) => [`name_${l}`, `desc_${l}`, `kw_${l}`]);
  const allCols = [...baseCols, ...localeColsList];
  const placeholders = allCols.map(() => '?').join(',');

  const insertStation = db.prepare(
    `INSERT INTO stations (${allCols.join(',')}) VALUES (${placeholders})`,
  );
  const insertStationTag  = db.prepare('INSERT OR IGNORE INTO station_tags (station_rowid, tag_id) VALUES (?, ?)');
  const insertStationLang = db.prepare('INSERT OR IGNORE INTO station_languages (station_rowid, language_id) VALUES (?, ?)');

  const ftsCols = ['rowid','name','tags_text','languages_text','research_text', ...localeColsList];
  const ftsPlaceholders = ftsCols.map(() => '?').join(',');
  const insertFts = db.prepare(
    `INSERT INTO stations_fts (${ftsCols.join(',')}) VALUES (${ftsPlaceholders})`,
  );

  db.exec('BEGIN');
  try {
    for (const s of stations) {
      const shard = shardForUuid(s.stationuuid);
      const localeValues: (string | null)[] = [];
      for (const l of SUPPORTED_LOCALES) {
        localeValues.push(pickLocale(s, l, 'name') || null);
        localeValues.push(pickLocale(s, l, 'description') || null);
        localeValues.push(pickLocaleKeywords(s, l) || null);
      }
      const r = s.research ?? {};
      const info = insertStation.run(
        s.stationuuid,
        s.name,
        s.url,
        s.url_resolved ?? '',
        s.homepage,
        s.favicon,
        s.country,
        s.countrycode,
        s.state,
        s.languagecodes.join(','),
        s.votes,
        s.codec,
        s.bitrate,
        s.hls ? 1 : 0,
        s.lastcheckok ? 1 : 0,
        s.lastchangetime ?? '',
        s.clickcount ?? 0,
        s.geo_lat,
        s.geo_long,
        shard,
        `data/stations/${shard}/${s.stationuuid}.yaml`,
        r.reviewed_at ?? '',
        r.nature ?? '',
        r.operator ?? '',
        r.affiliations ?? '',
        r.audience ?? '',
        r.format ?? '',
        r.notes ?? '',
        r.sources ?? '',
        ...localeValues,
      );
      const stationRowid = Number(info.lastInsertRowid);

      const stationTagSlugs: string[] = [];
      for (const t of s.tags) {
        const slug = normalizeTag(t);
        if (!slug) continue;
        const id = tagId.get(slug);
        if (id == null) continue;
        insertStationTag.run(stationRowid, id);
        stationTagSlugs.push(slug);
      }
      const stationLangSlugs: string[] = [];
      for (const lang of s.language) {
        const slug = normalizeTag(lang);
        if (!slug) continue;
        const id = langId.get(slug);
        if (id == null) continue;
        insertStationLang.run(stationRowid, id);
        stationLangSlugs.push(slug);
      }

      // FTS5 row — joined text gives full-text matching across tags/languages
      // while the canonical relational data lives in the junction tables.
      const researchText = [
        r.nature, r.operator, r.affiliations, r.format, r.notes,
      ].filter(Boolean).join(' ');
      insertFts.run(
        stationRowid,
        s.name,
        stationTagSlugs.join(' '),
        stationLangSlugs.join(' '),
        researchText,
        ...localeValues,
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  db.exec(`PRAGMA optimize;`);
  db.exec(`VACUUM;`);
  db.close();
}

async function buildZip(yamlPaths: string[], outZip: string) {
  await new Promise<void>(async (res, rej) => {
    const out = createWriteStream(outZip);
    const arch = archiver('zip', { store: true });
    out.on('close', () => res());
    arch.on('warning', (e) => console.warn('[zip]', e));
    arch.on('error', rej);
    arch.pipe(out);
    for (const p of yamlPaths) {
      arch.file(p, { name: relative(ROOT, p) });
    }
    await arch.finalize();
  });
}

async function buildJsonGz(stations: Station[], outPath: string) {
  const gzip = createGzip({ level: 6 });
  const out = createWriteStream(outPath);
  async function* gen() {
    yield '[';
    for (let i = 0; i < stations.length; i++) {
      if (i > 0) yield ',';
      yield JSON.stringify(stations[i]);
    }
    yield ']';
  }
  await pipeline(Readable.from(gen()), gzip, out);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('[build-data] scanning data/stations/**/*.yaml');
  const yamlPaths = await fg('**/*.yaml', { cwd: DATA_DIR, absolute: true });
  console.log(`[build-data] found ${yamlPaths.length} stations`);

  if (yamlPaths.length === 0) {
    console.warn('[build-data] no data — run `npm run seed` first');
    await writeFile(join(OUT_DIR, 'manifest.json'),
      JSON.stringify({ empty: true, count: 0, locales: SUPPORTED_LOCALES }, null, 2));
    return;
  }

  const stationsHash = await hashFiles(yamlPaths);
  const manifestPath = join(OUT_DIR, 'manifest.json');
  const dbPath = join(OUT_DIR, 'stations.sqlite');

  if (!FORCE && existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(await readFile(manifestPath, 'utf8'));
      const wantedExist =
        existsSync(dbPath) &&
        (!RELEASE ||
          (existsSync(join(OUT_DIR, 'stations.zip')) &&
           existsSync(join(OUT_DIR, 'stations.json.gz'))));
      if (prev?.stations_hash === stationsHash && wantedExist) {
        console.log('[build-data] data unchanged — skipping rebuild');
        return;
      }
    } catch {
      // fall through to rebuild
    }
  }

  console.log(`[build-data] parsing ${yamlPaths.length} YAMLs`);
  const stations = await parseAll(yamlPaths);
  console.log(`[build-data] parsed ${stations.length} stations in ${fmt(Date.now() - t0)}`);

  console.log('[build-data] writing sqlite');
  buildSqlite(stations, dbPath);

  const manifest: Record<string, unknown> = {
    generated_at: new Date().toISOString(),
    count: stations.length,
    stations_hash: stationsHash,
    locales: SUPPORTED_LOCALES,
    artifacts: {} as Record<string, { path: string; size: number; sha256: string }>,
  };

  const [dbSha, dbSize] = await Promise.all([fileSha256(dbPath), stat(dbPath).then((s) => s.size)]);
  (manifest.artifacts as Record<string, { path: string; size: number; sha256: string }>).sqlite = {
    path: 'data/stations.sqlite',
    size: dbSize,
    sha256: dbSha,
  };

  if (RELEASE) {
    const zipPath = join(OUT_DIR, 'stations.zip');
    const gzPath = join(OUT_DIR, 'stations.json.gz');
    console.log('[build-data] writing zip (--release)');
    await buildZip(yamlPaths, zipPath);
    console.log('[build-data] writing json.gz (--release)');
    await buildJsonGz(stations, gzPath);
    const [zipSha, zipSize] = await Promise.all([fileSha256(zipPath), stat(zipPath).then((s) => s.size)]);
    const [gzSha, gzSize] = await Promise.all([fileSha256(gzPath), stat(gzPath).then((s) => s.size)]);
    (manifest.artifacts as Record<string, { path: string; size: number; sha256: string }>).zip = {
      path: 'data/stations.zip',
      size: zipSize,
      sha256: zipSha,
    };
    (manifest.artifacts as Record<string, { path: string; size: number; sha256: string }>).jsongz = {
      path: 'data/stations.json.gz',
      size: gzSize,
      sha256: gzSha,
    };
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  // Locales index — consumed by the service worker at install time so it can
  // pre-cache exactly the shells that exist. Tiny file, ~1 KB.
  await writeFile(
    join(OUT_DIR, 'locales.json'),
    JSON.stringify({
      locales: SUPPORTED_LOCALES,
      meta: Object.fromEntries(
        SUPPORTED_LOCALES.map((l) => [l, {
          name: LOCALES[l].name,
          nativeName: LOCALES[l].nativeName,
          dir: LOCALES[l].dir,
        }]),
      ),
    }, null, 2),
  );

  console.log(`[build-data] done in ${fmt(Date.now() - t0)}`);
  console.log(`             sqlite: ${(dbSize / 1e6).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error('[build-data] fatal:', e);
  process.exit(1);
});
