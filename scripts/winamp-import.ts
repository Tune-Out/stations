#!/usr/bin/env tsx
/**
 * Convert a classic Winamp .wsz skin into a Tune Out theme folder.
 *
 *   npm run winamp:import -- path/to/Skin.wsz <new-theme-id>
 *
 * What this does:
 *   1. Unzips Skin.wsz (it's a renamed zip) into a temp folder.
 *   2. Looks for main.bmp / titlebar.bmp / pledit.txt / viscolor.txt and
 *      pulls four anchor colours:
 *        - body         (centre pixel of main.bmp)
 *        - titlebar     (centre pixel of titlebar.bmp)
 *        - text         (pledit.txt Normal=#rrggbb, or sniffed from main.bmp)
 *        - accent       (pledit.txt Current=#rrggbb, or sniffed)
 *   3. Stamps those into a copy of themes/winamp/theme.css and writes
 *      themes/<new-id>/ with the matching theme.yaml.
 *
 * This is a best-effort scaffold — real Winamp skins have many more
 * elements than four colours. Run `npm run build:themes` afterwards to
 * pick up the new theme.
 *
 * Dependencies: keeps `adm-zip` optional. If it's not installed, the
 * script tells you and exits without crashing the main build.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, cp, rm, readdir } from 'node:fs/promises';
import { dirname, join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const TEMPLATE_DIR = join(ROOT, 'themes', 'winamp');

interface Palette {
  body: string;       // main background
  titlebar: string;   // banner/strip
  text: string;       // foreground LED colour
  accent: string;     // selection / highlight
}

// ─── BMP reader — just the centre pixel ────────────────────────────────

/**
 * Returns the colour at (cx, cy) of a Windows BMP. Handles 24-bit and
 * 32-bit DIBs (the two Winamp uses); anything else returns null.
 */
function bmpCenterColor(buf: Uint8Array): string | null {
  if (buf.length < 54 || buf[0] !== 0x42 || buf[1] !== 0x4D) return null; // 'BM'
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const pixelOffset = view.getUint32(10, true);
  const width  = view.getInt32(18, true);
  const heightRaw = view.getInt32(22, true);
  const bpp    = view.getUint16(28, true);
  if (bpp !== 24 && bpp !== 32) return null;

  const bytesPerPixel = bpp / 8;
  const rowStride = Math.floor((bpp * width + 31) / 32) * 4;
  const topDown = heightRaw < 0;
  const height = Math.abs(heightRaw);
  const cx = Math.max(0, Math.floor(width / 2));
  const cy = Math.max(0, Math.floor(height / 2));
  const rowIndex = topDown ? cy : (height - 1 - cy);
  const off = pixelOffset + rowIndex * rowStride + cx * bytesPerPixel;
  if (off + 3 > buf.length) return null;
  const b = buf[off];
  const g = buf[off + 1];
  const r = buf[off + 2];
  return `#${[r, g, b].map((n) => n!.toString(16).padStart(2, '0')).join('')}`;
}

// ─── pledit.txt parser ─────────────────────────────────────────────────

function parsePleditTxt(text: string): { normal?: string; current?: string } {
  const lines = text.split(/\r?\n/);
  const map: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^\s*(\w+)\s*=\s*(#?[0-9A-Fa-f]{6,8})/);
    if (m) map[m[1]!.toLowerCase()] = m[2]!.toLowerCase().startsWith('#') ? m[2]!.toLowerCase() : '#' + m[2]!.toLowerCase();
  }
  return { normal: map['normal'], current: map['current'] };
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('usage: tsx scripts/winamp-import.ts <skin.wsz> <new-theme-id>');
    process.exit(2);
  }
  const wszPath = resolve(args[0]!);
  const newId = args[1]!;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(newId)) {
    console.error('new-theme-id must be kebab-case ASCII');
    process.exit(2);
  }
  if (!existsSync(wszPath)) {
    console.error('not found:', wszPath);
    process.exit(2);
  }
  if (!existsSync(TEMPLATE_DIR)) {
    console.error('missing template at', TEMPLATE_DIR);
    process.exit(2);
  }

  let zipModule: typeof import('adm-zip').default | null = null;
  try {
    zipModule = (await import('adm-zip')).default as unknown as typeof import('adm-zip').default;
  } catch {
    console.error('adm-zip is not installed. Run:\n  npm install --no-save adm-zip\nthen try again.');
    process.exit(1);
  }

  const extractDir = await mkdir(join(tmpdir(), 'winamp-' + Date.now()), { recursive: true });
  const tempBase = (extractDir as string) ?? join(tmpdir(), 'winamp-' + Date.now());

  try {
    const zip = new zipModule(wszPath);
    zip.extractAllTo(tempBase, true);
  } catch (e) {
    console.error('failed to unzip skin:', (e as Error).message);
    process.exit(1);
  }

  // Case-insensitive file-finder over the extracted tree.
  async function find(name: string): Promise<string | null> {
    async function walk(dir: string): Promise<string | null> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          const sub = await walk(full);
          if (sub) return sub;
        } else if (e.name.toLowerCase() === name.toLowerCase()) {
          return full;
        }
      }
      return null;
    }
    return walk(tempBase);
  }

  const palette: Palette = {
    body: '#1d2227',
    titlebar: '#2a3038',
    text: '#1ec01e',
    accent: '#f3ff00',
  };

  const mainBmp = await find('main.bmp');
  if (mainBmp) {
    const buf = new Uint8Array(await readFile(mainBmp));
    const c = bmpCenterColor(buf);
    if (c) palette.body = c;
  }
  const titleBmp = await find('titlebar.bmp');
  if (titleBmp) {
    const buf = new Uint8Array(await readFile(titleBmp));
    const c = bmpCenterColor(buf);
    if (c) palette.titlebar = c;
  }
  const pledit = await find('pledit.txt');
  if (pledit) {
    const txt = await readFile(pledit, 'utf8');
    const p = parsePleditTxt(txt);
    if (p.normal)  palette.text   = p.normal;
    if (p.current) palette.accent = p.current;
  }

  console.log('[winamp-import] sniffed palette:', palette);

  // Copy the template, then rewrite the CSS with the new colours.
  const outDir = join(ROOT, 'themes', newId);
  await rm(outDir, { recursive: true, force: true });
  await cp(TEMPLATE_DIR, outDir, { recursive: true });

  const cssPath = join(outDir, 'theme.css');
  let css = await readFile(cssPath, 'utf8');
  // Map the four anchor colours from the WinAmp template to the sniffed values.
  // We rewrite only the most legible places to avoid breaking the rest of the CSS.
  css = css
    .replace(/--bg:\s*#[0-9a-fA-F]+;/, `--bg: ${palette.body};`)
    .replace(/--bg-elev:\s*#[0-9a-fA-F]+;/, `--bg-elev: ${palette.titlebar};`)
    .replace(/--fg:\s*#[0-9a-fA-F]+;/, `--fg: ${palette.text};`)
    .replace(/--accent:\s*#[0-9a-fA-F]+;/, `--accent: ${palette.accent};`);
  // Tweak the comment header so anyone reading the resulting file knows
  // where the colours came from.
  css = `/* Auto-generated from ${basename(wszPath)} by scripts/winamp-import.ts.\n` +
    ` * Edit by hand if you want to refine the palette. */\n` + css;
  await writeFile(cssPath, css);

  // Rewrite theme.yaml id + i18n keys.
  const yamlPath = join(outDir, 'theme.yaml');
  let yaml = await readFile(yamlPath, 'utf8');
  yaml = yaml
    .replace(/^id:\s*\S+/m, `id: ${newId}`)
    .replace(/^name_key:\s*\S+/m, `name_key: theme.skin.${newId}.name`)
    .replace(/^description_key:\s*\S+/m, `description_key: theme.skin.${newId}.description`)
    .replace(/^preview_color:\s*"[^"]+"/m, `preview_color: "${palette.accent}"`);
  await writeFile(yamlPath, yaml);

  console.log(`[winamp-import] wrote themes/${newId}/`);
  console.log(
    `[winamp-import] add these keys to src/spa/i18n/strings/<locale>.json then run npm run build:themes:\n` +
    `  "theme.skin.${newId}.name": "…",\n` +
    `  "theme.skin.${newId}.description": "…"\n`,
  );
}

main().catch((e) => {
  console.error('[winamp-import] fatal:', e);
  process.exit(1);
});
