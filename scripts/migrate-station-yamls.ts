#!/usr/bin/env tsx
/**
 * One-shot data migration over data/stations/**\/*.yaml:
 *
 *  1. Parse the appended `# === Public research ===` comment block into a
 *     structured `research:` block at the bottom of the YAML.
 *  2. Normalize the station `name` (whitespace, ALL-CAPS → Title Case).
 *  3. Canonicalize tags via canonicalizeTag(); drop anything that doesn't
 *     map. Target: <100 unique tag slugs across the corpus.
 *  4. Canonicalize `language` list to ISO 639-1 where possible (preserves
 *     the original `languagecodes` field separately).
 *  5. Idempotent: re-running on an already-migrated YAML is a no-op (the
 *     research block is detected and skipped).
 *
 * Usage: tsx scripts/migrate-station-yamls.ts [--dry-run] [--limit=N]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import fg from 'fast-glob';
import pLimit from 'p-limit';
import { parse, stringify } from 'yaml';

import {
  canonicalizeTags, canonicalizeLanguages, canonicalizeNature,
  normalizeStationName,
} from './lib/canonical.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const DATA_DIR = join(ROOT, 'data', 'stations');

const DRY = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : Infinity;
const VERBOSE = process.argv.includes('--verbose');

interface Research {
  reviewed_at?: string;
  nature?: string;
  operator?: string;
  affiliations?: string;
  audience?: string;
  format?: string;
  notes?: string;
  sources?: string;
}

const RESEARCH_KEYS = ['reviewed_at', 'nature', 'operator', 'affiliations', 'audience', 'format', 'notes', 'sources'] as const;

/**
 * Split a station YAML's text into (body, researchBlock). The researchBlock
 * is the trailing comment block starting with `# === Public research ===`.
 */
function splitResearchBlock(text: string): { body: string; researchLines: string[] } {
  const marker = text.indexOf('# === Public research ===');
  if (marker === -1) return { body: text, researchLines: [] };
  // Walk back to start of the marker's line
  const lineStart = text.lastIndexOf('\n', marker) + 1;
  const before = text.slice(0, lineStart);
  const after = text.slice(lineStart);
  return { body: before, researchLines: after.split('\n').filter((l) => l.trimStart().startsWith('#')) };
}

function parseResearchComments(lines: string[]): Research {
  const out: Research = {};
  for (const raw of lines) {
    const line = raw.replace(/^#\s?/, '').trim();
    if (!line || line.startsWith('=== ')) continue;
    const m = line.match(/^([a-z_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    let key = m[1]!.toLowerCase();
    if (key === 'researched') key = 'reviewed_at';
    const val = m[2]!.trim();
    if (!val) continue;
    if ((RESEARCH_KEYS as readonly string[]).includes(key)) {
      (out as Record<string, string>)[key] = val;
    }
  }
  return out;
}

/**
 * Re-render the YAML document with the canonical field order so newly-written
 * files diff cleanly even if the upstream order varied. We use the `yaml`
 * library's custom serialization to control quoting.
 */
function renderYaml(doc: Record<string, unknown>): string {
  const ORDER = [
    'stationuuid', 'name', 'url', 'url_resolved', 'homepage', 'favicon',
    'tags', 'country', 'countrycode', 'state',
    'language', 'languagecodes',
    'votes', 'codec', 'bitrate', 'hls', 'lastcheckok', 'lastchangetime',
    'clickcount', 'geo_lat', 'geo_long',
    'localized', 'research',
  ];
  // Build an ordered plain object
  const ordered: Record<string, unknown> = {};
  for (const k of ORDER) if (k in doc) ordered[k] = doc[k];
  // Append any unknown keys at the end so we don't lose data
  for (const k of Object.keys(doc)) if (!(k in ordered)) ordered[k] = doc[k];

  return stringify(ordered, {
    lineWidth: 0,           // never wrap long strings
    minContentWidth: 0,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  });
}

interface MigrateResult {
  changed: boolean;
  rawTags: number;
  canonTags: number;
  hadResearch: boolean;
}

async function migrateOne(path: string): Promise<MigrateResult> {
  const original = await readFile(path, 'utf8');
  const { body, researchLines } = splitResearchBlock(original);
  let parsed: Record<string, unknown>;
  try {
    parsed = (parse(body) ?? {}) as Record<string, unknown>;
  } catch (e) {
    console.warn(`[migrate] YAML parse error in ${path}: ${(e as Error).message}`);
    return { changed: false, rawTags: 0, canonTags: 0, hadResearch: false };
  }

  // Idempotency: if `research:` already exists AND the trailing comments
  // are absent, skip parsing comments. If both exist (mid-migration state),
  // prefer the existing structured block.
  const existingResearch = (parsed.research as Research | undefined) ?? undefined;
  const research: Research = existingResearch ?? parseResearchComments(researchLines);

  // Canonicalize the editorial nature into one of a small closed set so the
  // search filter dropdown isn't a wall of near-duplicates.
  if (research.nature) {
    const c = canonicalizeNature(research.nature);
    if (c) research.nature = c;
  }

  // 1. Normalize name. ALWAYS reassign — pre-fix the path was
  //   `if (newName !== rawName) next.name = newName;`
  // which left a YAML-quoted trailing-space name in place when trim() landed
  // on something that already matched the title-case rules (e.g. "Foo ").
  const rawName = String(parsed.name ?? '').trim();
  const newName = normalizeStationName(rawName);

  // 2. Canonicalize tags
  const rawTags = Array.isArray(parsed.tags) ? (parsed.tags as unknown[]).map((t) => String(t)) : [];
  const canonTags = canonicalizeTags(rawTags);

  // 3. Canonicalize languages
  const rawLangs = Array.isArray(parsed.language) ? (parsed.language as unknown[]).map((l) => String(l)) : [];
  const canonLangs = canonicalizeLanguages(rawLangs);

  // 4. Build new doc — keep everything else
  const next: Record<string, unknown> = { ...parsed };
  next.name = newName;
  next.tags = canonTags;
  next.language = canonLangs;
  if (Object.keys(research).length) next.research = research;

  // Render and compare
  const rendered = renderYaml(next);
  const changed = rendered !== original;

  if (changed && !DRY) {
    await writeFile(path, rendered);
  }
  return {
    changed,
    rawTags: rawTags.length,
    canonTags: canonTags.length,
    hadResearch: Object.keys(research).length > 0,
  };
}

async function main() {
  const t0 = Date.now();
  console.log('[migrate] scanning YAMLs');
  let paths = await fg('**/*.yaml', { cwd: DATA_DIR, absolute: true });
  paths.sort();
  if (Number.isFinite(LIMIT)) paths = paths.slice(0, LIMIT as number);
  console.log(`[migrate] ${paths.length} files`);

  const limit = pLimit(Math.max(4, cpus().length));
  let changed = 0, skipped = 0, errors = 0;
  let researched = 0;
  let droppedTags = 0;

  await Promise.all(
    paths.map((p, i) =>
      limit(async () => {
        try {
          const r = await migrateOne(p);
          if (r.changed) changed++; else skipped++;
          if (r.hadResearch) researched++;
          droppedTags += Math.max(0, r.rawTags - r.canonTags);
          if (VERBOSE && i % 5000 === 0) {
            process.stdout.write(`\r[migrate] ${i}/${paths.length}`);
          } else if (i % 5000 === 0) {
            process.stdout.write(`\r[migrate] ${i}/${paths.length}`);
          }
        } catch (e) {
          errors++;
          if (errors < 10) console.warn(`[migrate] error ${p}: ${(e as Error).message}`);
        }
      }),
    ),
  );
  process.stdout.write('\n');

  const dt = (Date.now() - t0) / 1000;
  console.log(`[migrate] changed=${changed} skipped=${skipped} errors=${errors} researched=${researched} dropped_tags=${droppedTags} time=${dt.toFixed(1)}s`);
}

main().catch((e) => {
  console.error('[migrate] fatal:', e);
  process.exit(1);
});
