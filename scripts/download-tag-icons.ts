#!/usr/bin/env tsx
/**
 * Download all unique Material Symbols Rounded SVGs referenced by
 * src/spa/tag-style.ts into src/spa/icons/tags/<name>.svg.
 *
 * Idempotent — existing files are skipped. Run with `npm run build:tag-icons`.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const ICONS_DIR = join(ROOT, 'src', 'spa', 'icons', 'tags');

const ENDPOINT = (name: string) =>
  `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/${name}/default/24px.svg`;

/**
 * Extract the unique icon names from src/spa/tag-style.ts without importing
 * it (the file uses import.meta.glob which won't resolve under tsx/node).
 */
async function readIconNames(): Promise<string[]> {
  const src = await readFile(join(ROOT, 'src/spa/tag-style.ts'), 'utf8');
  const out = new Set<string>();
  for (const m of src.matchAll(/icon:\s*'([a-z0-9_]+)'/g)) {
    out.add(m[1]!);
  }
  return [...out].sort();
}

async function fetchIcon(name: string): Promise<string> {
  const r = await fetch(ENDPOINT(name));
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${name}`);
  return r.text();
}

async function main(): Promise<void> {
  await mkdir(ICONS_DIR, { recursive: true });
  const names = await readIconNames();
  console.log(`[tag-icons] ${names.length} unique icons`);

  let downloaded = 0, skipped = 0, failed = 0;
  for (const name of names) {
    const out = join(ICONS_DIR, `${name}.svg`);
    if (existsSync(out)) { skipped++; continue; }
    try {
      const svg = await fetchIcon(name);
      await writeFile(out, svg);
      downloaded++;
      process.stdout.write(`  ✓ ${name}\n`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${name}: ${(e as Error).message}`);
    }
  }
  console.log(`[tag-icons] downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error('[tag-icons] fatal:', e);
  process.exit(1);
});
