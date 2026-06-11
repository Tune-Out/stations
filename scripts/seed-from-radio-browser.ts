#!/usr/bin/env tsx
/**
 * Seed data/stations/{shard}/{uuid}.yaml from the radio-browser.info catalog.
 *
 * Usage:
 *   tsx scripts/seed-from-radio-browser.ts             # full seed (~60k stations)
 *   tsx scripts/seed-from-radio-browser.ts --limit=500 # partial seed for dev
 *   tsx scripts/seed-from-radio-browser.ts --from-file=/path/to/all.json
 *
 * Idempotent: stations with unchanged content are skipped.
 */
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

// stream-json is CJS; the package's types are not bundled here.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - no type declarations
import streamJson from 'stream-json';
// @ts-expect-error - no type declarations
import streamArrayMod from 'stream-json/streamers/StreamArray.js';
const jsonParser = streamJson.parser as () => NodeJS.ReadWriteStream;
const streamArray = streamArrayMod.streamArray as () => NodeJS.ReadWriteStream;
import { stringify } from 'yaml';

import { shardForUuid } from './lib/shard.js';
import { StationSchema, type Station } from './lib/schema.js';
import { rawToStation } from './lib/radio-browser.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const DATA_DIR = join(ROOT, 'data', 'stations');
const CACHE_DIR = join(ROOT, '.astro', 'seed-cache');
const CACHE_FILE = join(CACHE_DIR, 'all.json');

const ARG_LIMIT = parseArg('--limit');
const ARG_FROM_FILE = parseArg('--from-file');
const ARG_URL =
  parseArg('--url') ?? process.env.RADIO_BROWSER_URL ?? 'https://de1.api.radio-browser.info/json/stations';
const ARG_REFRESH = process.argv.includes('--refresh');

const limit = ARG_LIMIT ? parseInt(ARG_LIMIT, 10) : Number.POSITIVE_INFINITY;
const startedAt = Date.now();

function parseArg(name: string): string | null {
  const prefix = `${name}=`;
  for (const a of process.argv) {
    if (a.startsWith(prefix)) return a.slice(prefix.length);
    if (a === name) {
      const idx = process.argv.indexOf(a);
      const next = process.argv[idx + 1];
      if (next && !next.startsWith('--')) return next;
    }
  }
  return null;
}

function fmtSeconds(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${(s % 60).toString().padStart(2, '0')}s`;
}

async function ensureSource(): Promise<string> {
  if (ARG_FROM_FILE) {
    if (!existsSync(ARG_FROM_FILE)) {
      throw new Error(`--from-file does not exist: ${ARG_FROM_FILE}`);
    }
    return ARG_FROM_FILE;
  }

  await mkdir(CACHE_DIR, { recursive: true });
  if (!ARG_REFRESH && existsSync(CACHE_FILE)) {
    const stats = await stat(CACHE_FILE);
    if (stats.size > 1_000_000) {
      console.log(`[seed] using cached ${CACHE_FILE} (${(stats.size / 1e6).toFixed(1)} MB)`);
      return CACHE_FILE;
    }
  }

  console.log(`[seed] downloading ${ARG_URL} → ${CACHE_FILE}`);
  const r = await fetch(ARG_URL, {
    headers: { 'user-agent': 'tune-out-catalog-seed/0.1', accept: 'application/json' },
  });
  if (!r.ok || !r.body) throw new Error(`fetch failed: HTTP ${r.status} ${r.statusText}`);

  const total = Number(r.headers.get('content-length') ?? 0);
  let received = 0;
  let lastLogged = 0;
  const reader = r.body.getReader();
  const node = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) return this.push(null);
        received += value.byteLength;
        if (received - lastLogged > 8 * 1024 * 1024) {
          lastLogged = received;
          const mb = (received / 1e6).toFixed(0);
          const pct = total ? ` (${Math.round((received / total) * 100)}%)` : '';
          process.stdout.write(`\r[seed] downloaded ${mb} MB${pct}`);
        }
        this.push(Buffer.from(value));
      } catch (e) {
        this.destroy(e as Error);
      }
    },
  });

  await pipeline(node, createWriteStream(CACHE_FILE));
  process.stdout.write('\n');
  return CACHE_FILE;
}

function sha1(s: string): string {
  return createHash('sha1').update(s).digest('hex');
}

async function writeYamlIfChanged(absPath: string, yamlText: string): Promise<'written' | 'skipped'> {
  if (existsSync(absPath)) {
    try {
      const existing = await readFile(absPath, 'utf8');
      if (sha1(existing) === sha1(yamlText)) return 'skipped';
    } catch {
      // fall through to write
    }
  }
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, yamlText, 'utf8');
  return 'written';
}

function toYaml(s: Station): string {
  return stringify(s, { indent: 2, lineWidth: 0, sortMapEntries: false });
}

async function main() {
  console.log('[seed] starting');
  const source = await ensureSource();

  let total = 0;
  let written = 0;
  let skipped = 0;
  let errors = 0;
  const shardCounts = new Map<string, number>();

  const readStream = (await import('node:fs')).createReadStream(source, { encoding: 'utf8' });
  const stream = readStream.pipe(jsonParser()).pipe(streamArray());

  for await (const chunk of stream as AsyncIterable<{ key: number; value: unknown }>) {
    if (total >= limit) break;
    total += 1;
    try {
      const partial = rawToStation(chunk.value as Parameters<typeof rawToStation>[0]);
      const parsed = StationSchema.parse(partial);
      if (!parsed.url) {
        // skip stations with no stream URL — they're not useful in the catalog
        skipped += 1;
        continue;
      }
      const shard = shardForUuid(parsed.stationuuid);
      const out = join(DATA_DIR, shard, `${parsed.stationuuid}.yaml`);
      const yaml = toYaml(parsed);
      const result = await writeYamlIfChanged(out, yaml);
      if (result === 'written') written += 1;
      else skipped += 1;
      shardCounts.set(shard, (shardCounts.get(shard) ?? 0) + 1);
    } catch (e) {
      errors += 1;
      if (errors < 5) console.warn(`[seed] error on station ${total}:`, (e as Error).message);
    }

    if (total % 5_000 === 0) {
      process.stdout.write(`\r[seed] processed ${total} (written=${written}, skipped=${skipped}, errors=${errors})`);
    }
  }

  process.stdout.write('\n');

  const shards = Array.from(shardCounts.values());
  const avg = shards.length ? Math.round(shards.reduce((a, b) => a + b, 0) / shards.length) : 0;
  const max = shards.length ? Math.max(...shards) : 0;
  const min = shards.length ? Math.min(...shards) : 0;

  console.log(`[seed] done in ${fmtSeconds(Date.now() - startedAt)}`);
  console.log(`        total processed: ${total}`);
  console.log(`        written:         ${written}`);
  console.log(`        skipped:         ${skipped}`);
  console.log(`        errors:          ${errors}`);
  console.log(`        shards used:     ${shards.length}/256 (avg ${avg}, min ${min}, max ${max})`);
}

main().catch((e) => {
  console.error('[seed] fatal:', e);
  process.exit(1);
});
