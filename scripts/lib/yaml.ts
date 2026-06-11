import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse, stringify } from 'yaml';
import type { Station } from './schema.js';
import { StationSchema } from './schema.js';

export async function readStationYaml(absPath: string): Promise<Station> {
  const text = await readFile(absPath, 'utf8');
  const raw = parse(text);
  return StationSchema.parse(raw);
}

export async function writeStationYaml(absPath: string, s: Station): Promise<void> {
  await mkdir(dirname(absPath), { recursive: true });
  const yaml = stringify(s, {
    indent: 2,
    lineWidth: 0,
    blockQuote: 'literal',
    sortMapEntries: false,
  });
  await writeFile(absPath, yaml, 'utf8');
}
