#!/usr/bin/env tsx
/**
 * Render PNGs from public/icon-source.svg into public/:
 *   icon-192.png          — Android PWA
 *   icon-512.png          — Android PWA
 *   icon-maskable.png     — Android maskable (512 with safe-zone padding)
 *   apple-touch-icon.png  — iOS, 180×180
 *
 * Pure-WASM (no native binaries). Run as `npm run build:icons`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const PUBLIC = join(ROOT, 'public');
const SOURCE = join(PUBLIC, 'icon-source.svg');

async function loadWasm(): Promise<void> {
  // Load the .wasm binary directly from the installed package.
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
  const wasmBytes = await readFile(wasmPath);
  await initWasm(wasmBytes);
}

interface Output {
  outName: string;
  size: number;
  background?: string;
  padPct?: number; // for maskable safe zone — add transparent padding
}

const OUTPUTS: Output[] = [
  { outName: 'icon-192.png',         size: 192 },
  { outName: 'icon-512.png',         size: 512 },
  { outName: 'apple-touch-icon.png', size: 180, background: '#0a0d14' },
  { outName: 'icon-maskable.png',    size: 512, padPct: 12 },
];

async function renderOne(svg: string, o: Output): Promise<void> {
  let workingSvg = svg;
  if (o.padPct && o.padPct > 0) {
    // Wrap source in a larger viewBox with transparent padding.
    const pad = o.padPct;
    const total = 100 + pad * 2;
    workingSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}">
      <g transform="translate(${pad} ${pad}) scale(${100 / 512})">
        ${stripSvgWrapper(svg)}
      </g>
    </svg>`;
  }

  const opts: ConstructorParameters<typeof Resvg>[1] = {
    fitTo: { mode: 'width', value: o.size },
    background: o.background ?? 'rgba(0,0,0,0)',
  };
  const resvg = new Resvg(workingSvg, opts);
  const data = resvg.render().asPng();
  await writeFile(join(PUBLIC, o.outName), data);
  console.log(`[build-icons] wrote ${o.outName} (${o.size}×${o.size})`);
}

function stripSvgWrapper(svg: string): string {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return m?.[1] ?? svg;
}

async function main(): Promise<void> {
  await loadWasm();
  const svg = await readFile(SOURCE, 'utf8');
  for (const o of OUTPUTS) await renderOne(svg, o);
}

main().catch((e) => {
  console.error('[build-icons] fatal:', e);
  process.exit(1);
});
