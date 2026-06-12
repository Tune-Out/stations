#!/usr/bin/env tsx
/**
 * Process every folder under `themes/` into a stylesheet + asset bundle
 * deposited at `public/themes/<id>/`, and emit `public/themes/index.json`
 * — the runtime manifest the SPA uses to populate the skin picker.
 *
 * Each theme MUST contain:
 *   - theme.yaml   metadata (id, name_key, description_key, preview_color,
 *                  optional order, optional fonts[])
 *   - theme.css    actual style tokens
 *   - fonts/       (optional)
 *   - icons/       (optional)
 *
 * The script just copies bytes around — it never reads the theme CSS — so
 * theme authors can iterate freely and re-run `npm run build:themes` to
 * republish.
 */
import { mkdir, readFile, writeFile, cp, stat, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const SRC_DIR = join(ROOT, 'themes');
const OUT_DIR = join(ROOT, 'public', 'themes');

const FontEntry = z.object({
  family: z.string().min(1),
  src: z.string().min(1),
  weight: z.union([z.string(), z.number()]).optional(),
  style: z.string().optional(),
});

const ColorHex = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'must be a #rrggbb hex colour');
const ThemeYaml = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, 'id must be kebab-case ASCII'),
  name_key: z.string().min(1),
  description_key: z.string().min(1),
  // Legacy single-color preview. Still emitted so older clients keep working.
  preview_color: ColorHex,
  // Optional three-color sample (background, foreground, accent). The SPA
  // renders these as a mini "card" swatch in the skin picker, which is much
  // more representative of the theme's feel than the single preview_color.
  preview_bg:     ColorHex.optional(),
  preview_fg:     ColorHex.optional(),
  preview_accent: ColorHex.optional(),
  order: z.number().optional().default(100),
  fonts: z.array(FontEntry).optional().default([]),
});

type Theme = z.infer<typeof ThemeYaml>;

/**
 * Pull every top-level @font-face block out of the source CSS so we can put
 * it before the @layer wrapper. The remainder is returned unchanged.
 */
function splitFontFaces(css: string): { fontFaces: string; rest: string } {
  const fontFaces: string[] = [];
  let rest = '';
  let i = 0;
  while (i < css.length) {
    const ff = css.indexOf('@font-face', i);
    if (ff === -1) {
      rest += css.slice(i);
      break;
    }
    rest += css.slice(i, ff);
    const open = css.indexOf('{', ff);
    if (open === -1) {
      rest += css.slice(ff);
      break;
    }
    // Skip balanced braces (no nested @font-face content has nested braces in practice).
    let depth = 1, j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    fontFaces.push(css.slice(ff, j));
    i = j;
  }
  return { fontFaces: fontFaces.join('\n'), rest };
}

async function listThemeIds(): Promise<string[]> {
  if (!existsSync(SRC_DIR)) return [];
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

async function processOne(id: string): Promise<Theme | null> {
  const themeDir = join(SRC_DIR, id);
  const yamlPath = join(themeDir, 'theme.yaml');
  const cssPath  = join(themeDir, 'theme.css');
  if (!existsSync(yamlPath)) {
    console.warn(`[build-themes]   skip ${id}: missing theme.yaml`);
    return null;
  }
  if (!existsSync(cssPath)) {
    console.warn(`[build-themes]   skip ${id}: missing theme.css`);
    return null;
  }
  const raw = parse(await readFile(yamlPath, 'utf8'));
  const theme = ThemeYaml.parse(raw);
  if (theme.id !== id) {
    throw new Error(`[build-themes] ${id}/theme.yaml id="${theme.id}" doesn't match folder name`);
  }
  const outThemeDir = join(OUT_DIR, id);

  // Wipe + repopulate the output folder for this theme.
  await rm(outThemeDir, { recursive: true, force: true });
  await mkdir(outThemeDir, { recursive: true });

  // Copy the CSS, wrapping it in @layer theme so its rules always beat the
  // matching base rules in app.css regardless of stylesheet load order.
  // @font-face declarations are hoisted out because they don't participate
  // in the cascade and some browsers reject them inside layered rules when
  // the layer hasn't been declared.
  const css = await readFile(cssPath, 'utf8');
  const { fontFaces, rest } = splitFontFaces(css);
  const wrapped =
    `@layer base, theme;\n` +
    `${fontFaces}\n` +
    `@layer theme {\n${rest}\n}\n`;
  await writeFile(join(outThemeDir, 'theme.css'), wrapped);

  // Copy auxiliary folders (fonts/, icons/) if present.
  for (const sub of ['fonts', 'icons']) {
    const from = join(themeDir, sub);
    if (existsSync(from)) {
      await cp(from, join(outThemeDir, sub), { recursive: true });
    }
  }

  const cssSize = (await stat(cssPath)).size;
  console.log(`  ✓ ${id.padEnd(12)} (theme.css ${cssSize}B${theme.fonts.length ? `, ${theme.fonts.length} font${theme.fonts.length === 1 ? '' : 's'}` : ''})`);

  return theme;
}

async function main(): Promise<void> {
  console.log('[build-themes] processing', SRC_DIR);
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const ids = await listThemeIds();
  const themes: Theme[] = [];
  for (const id of ids) {
    const t = await processOne(id);
    if (t) themes.push(t);
  }
  themes.sort((a, b) => a.order - b.order);

  const index = {
    generated_at: new Date(0).toISOString().slice(0, 10), // stable for caching
    count: themes.length,
    themes: themes.map((t) => ({
      id: t.id,
      name_key: t.name_key,
      description_key: t.description_key,
      preview_color:  t.preview_color,
      preview_bg:     t.preview_bg     ?? t.preview_color,
      preview_fg:     t.preview_fg     ?? t.preview_color,
      preview_accent: t.preview_accent ?? t.preview_color,
      order: t.order,
      css: `themes/${t.id}/theme.css`,
      fonts: t.fonts,
    })),
  };
  await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`[build-themes] wrote ${themes.length} themes → public/themes/index.json`);
}

main().catch((e) => {
  console.error('[build-themes] fatal:', e);
  process.exit(1);
});
