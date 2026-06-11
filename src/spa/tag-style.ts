/**
 * Visual style map for every canonical tag — icon + color.
 *
 * Design principle: conceptually-similar tags share a hue so the UI reads as
 * a coherent taxonomy at a glance.
 *   - Rock family   → deep reds
 *   - Pop family    → warm pinks
 *   - Latin family  → warm oranges
 *   - Electronic    → violets
 *   - Jazz/Blues    → deep blues
 *   - Religious     → sacred gold + purple
 *   - News/Talk     → cool slates
 *   - Public/Comm.  → sage greens
 *   - Decades       → warm-→-cool gradient (50s sepia … 2010s teal)
 *
 * The icon names are Material Symbols Rounded. SVGs are pre-downloaded into
 * src/spa/icons/tags/<icon>.svg by `scripts/download-tag-icons.ts` and
 * imported at build time via Vite's `?raw`. Nothing is fetched at runtime.
 */

import type { CanonicalTag } from '../../scripts/lib/canonical.js';

export interface TagStyle {
  /** Material Symbols Rounded icon name. */
  icon: string;
  /** Base accent color (hex). Chip background/border are color-mixed. */
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Tag style table. Keys must exactly match CANONICAL_TAGS in canonical.ts.
// ─────────────────────────────────────────────────────────────────────────

export const TAG_STYLES: Record<CanonicalTag, TagStyle> = {
  // ── Pop family ─────────────────────────────────────────────── pink/rose
  pop:                 { icon: 'music_note',       color: '#ec4899' },
  hits:                { icon: 'trending_up',      color: '#f472b6' },
  'top-40':            { icon: 'trending_up',      color: '#db2777' },
  'classic-hits':      { icon: 'star',             color: '#be185d' },
  'adult-contemporary':{ icon: 'coffee',           color: '#d946ef' },
  'pop-rock':          { icon: 'music_note',       color: '#f43f5e' },
  romantic:            { icon: 'favorite',         color: '#fb7185' },
  ballad:              { icon: 'favorite',         color: '#fda4af' },

  // ── Rock family ──────────────────────────────────────────────── reds
  rock:                { icon: 'graphic_eq',       color: '#dc2626' },
  'classic-rock':      { icon: 'history',          color: '#b91c1c' },
  'hard-rock':         { icon: 'bolt',             color: '#991b1b' },
  'soft-rock':         { icon: 'music_note',       color: '#ef4444' },
  'prog-rock':         { icon: 'architecture',     color: '#c2410c' },
  metal:               { icon: 'bolt',             color: '#7f1d1d' },
  hardcore:            { icon: 'flash_on',         color: '#450a0a' },
  punk:                { icon: 'flash_on',         color: '#ea580c' },
  indie:               { icon: 'diversity_3',      color: '#f97316' },
  alternative:         { icon: 'swap_horizontal_circle', color: '#fb923c' },

  // ── Country / Folk ───────────────────────────────────────────── amber
  country:             { icon: 'cottage',          color: '#a16207' },
  folk:                { icon: 'forest',           color: '#92400e' },

  // ── Latin family ────────────────────────────────────────── warm orange
  latin:               { icon: 'local_fire_department', color: '#ea580c' },
  salsa:               { icon: 'festival',         color: '#dc2626' },
  cumbia:              { icon: 'festival',         color: '#f59e0b' },
  merengue:            { icon: 'festival',         color: '#facc15' },
  tropical:            { icon: 'beach_access',     color: '#f97316' },
  'regional-mexican':  { icon: 'festival',         color: '#b45309' },

  // ── World / Asian Pop ──────────────────────────────── magenta/gold mix
  world:               { icon: 'public',           color: '#ca8a04' },
  bollywood:           { icon: 'theater_comedy',   color: '#e11d48' },
  'arabic-music':      { icon: 'mosque',           color: '#b45309' },
  anime:               { icon: 'animation',        color: '#f43f5e' },
  'k-pop':             { icon: 'favorite',         color: '#ec4899' },
  'j-pop':             { icon: 'music_note',       color: '#d946ef' },

  // ── Hip-Hop / R&B / Soul ────────────────────────────── gold/amber/funk
  'hip-hop':           { icon: 'mic',              color: '#eab308' },
  rap:                 { icon: 'mic',              color: '#ca8a04' },
  'r-and-b':           { icon: 'mic_external_on',  color: '#f59e0b' },
  soul:                { icon: 'favorite',         color: '#d97706' },
  funk:                { icon: 'vibration',        color: '#facc15' },
  disco:               { icon: 'blur_circular',    color: '#fbbf24' },

  // ── Reggae family ─────────────────────────────────────── Jamaica green
  reggae:              { icon: 'eco',              color: '#16a34a' },
  reggaeton:           { icon: 'eco',              color: '#22c55e' },
  ska:                 { icon: 'eco',              color: '#15803d' },

  // ── Electronic family ───────────────────────────────────────── violets
  electronic:          { icon: 'equalizer',        color: '#7c3aed' },
  dance:               { icon: 'nightlife',        color: '#a855f7' },
  house:               { icon: 'house',            color: '#9333ea' },
  techno:              { icon: 'equalizer',        color: '#6d28d9' },
  trance:              { icon: 'waves',            color: '#8b5cf6' },
  edm:                 { icon: 'bolt',             color: '#c026d3' },
  dubstep:             { icon: 'bolt',             color: '#581c87' },
  'drum-and-bass':     { icon: 'graphic_eq',       color: '#4c1d95' },
  synthpop:            { icon: 'equalizer',        color: '#a21caf' },
  'new-wave':          { icon: 'waves',            color: '#c084fc' },

  // ── Chillout / Ambient ───────────────────────────────── cyan/calm teal
  ambient:             { icon: 'spa',              color: '#0891b2' },
  chillout:            { icon: 'bedtime',          color: '#0e7490' },
  downtempo:           { icon: 'water_drop',       color: '#155e75' },
  lounge:              { icon: 'wine_bar',         color: '#06b6d4' },
  lofi:                { icon: 'headphones',       color: '#67e8f9' },

  // ── Jazz / Blues / Soundtrack ────────────────────────────── deep blues
  jazz:                { icon: 'piano',            color: '#1e40af' },
  blues:               { icon: 'piano',            color: '#1e3a8a' },
  'smooth-jazz':       { icon: 'wine_bar',         color: '#2563eb' },
  instrumental:        { icon: 'piano',            color: '#3b82f6' },
  soundtrack:          { icon: 'movie',            color: '#1d4ed8' },

  // ── Classical / Opera ────────────────────────────────────── royal/indigo
  classical:           { icon: 'piano',            color: '#6366f1' },
  opera:               { icon: 'theater_comedy',   color: '#4f46e5' },

  // ── Religious family ──────────────────────────── sacred purple/gold/green
  religious:           { icon: 'church',           color: '#7c3aed' },
  catholic:            { icon: 'church',           color: '#5b21b6' },
  islamic:             { icon: 'mosque',           color: '#047857' },
  gospel:              { icon: 'volunteer_activism', color: '#b45309' },
  'christian-music':   { icon: 'church',           color: '#1e40af' },

  // ── News / Talk family ──────────────────────────────────────── slates
  news:                { icon: 'newspaper',        color: '#475569' },
  'news-talk':         { icon: 'newspaper',        color: '#64748b' },
  talk:                { icon: 'forum',            color: '#94a3b8' },
  'local-news':        { icon: 'location_on',      color: '#334155' },
  'sports-talk':       { icon: 'sports_basketball', color: '#1e293b' },
  politics:            { icon: 'gavel',            color: '#0f172a' },
  business:            { icon: 'business_center',  color: '#1e3a8a' },

  // ── Public service / Community ────────────────────────── sage / lime
  'public-radio':      { icon: 'radio',            color: '#16a34a' },
  'community-radio':   { icon: 'groups',           color: '#65a30d' },
  culture:             { icon: 'palette',          color: '#84cc16' },
  education:           { icon: 'school',           color: '#15803d' },
  podcast:             { icon: 'podcasts',         color: '#14b8a6' },

  // ── Sports ─────────────────────────────────────────────── athletic teal
  sports:              { icon: 'sports_basketball', color: '#0891b2' },

  // ── Kids / Comedy ──────────────────────────────────────── cheerful yellow
  kids:                { icon: 'toys',             color: '#facc15' },
  comedy:              { icon: 'mood',             color: '#f59e0b' },

  // ── Misc ──────────────────────────────────────────────────────────────
  party:               { icon: 'celebration',      color: '#ec4899' },
  lifestyle:           { icon: 'spa',              color: '#84cc16' },
  sleep:               { icon: 'bedtime',          color: '#312e81' },
  experimental:        { icon: 'science',          color: '#6b7280' },
  oldies:              { icon: 'history',          color: '#92400e' },
  retro:               { icon: 'history',          color: '#b45309' },

  // ── Decades — warm → cool gradient ────────────────────────────────────
  '50s':               { icon: 'calendar_month',   color: '#b45309' },
  '60s':               { icon: 'calendar_month',   color: '#d97706' },
  '70s':               { icon: 'calendar_month',   color: '#ca8a04' },
  '80s':               { icon: 'calendar_month',   color: '#db2777' },
  '90s':               { icon: 'calendar_month',   color: '#7c3aed' },
  '2000s':             { icon: 'calendar_month',   color: '#2563eb' },
  '2010s':             { icon: 'calendar_month',   color: '#06b6d4' },
};

// ─────────────────────────────────────────────────────────────────────────
// Vite import.meta.glob pulls every SVG under icons/tags/ at build time so
// adding a new icon to TAG_STYLES is one edit + one download + a rebuild.
// ─────────────────────────────────────────────────────────────────────────
const TAG_ICON_SVG: Record<string, string> = import.meta.glob(
  './icons/tags/*.svg',
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function svgFor(iconName: string): string | null {
  const key = `./icons/tags/${iconName}.svg`;
  return TAG_ICON_SVG[key] ?? null;
}

const DEFAULT_STYLE: TagStyle = { icon: 'tag', color: '#94a3b8' };

export function tagStyle(slug: string): TagStyle {
  return (TAG_STYLES as Record<string, TagStyle>)[slug] ?? DEFAULT_STYLE;
}

/** Return the icon SVG markup for a tag with `currentColor` fill and a size. */
export function tagIconSvg(slug: string, size = 16): string {
  const s = tagStyle(slug);
  const raw = svgFor(s.icon);
  if (!raw) return '';
  return raw
    .replace(/width="\d+"/g, `width="${size}"`)
    .replace(/height="\d+"/g, `height="${size}"`)
    .replace(/<svg(?![^>]*\bfill=)/, `<svg fill="currentColor"`);
}

/** All unique icon names — used by the download script and for sanity tests. */
export function uniqueTagIconNames(): string[] {
  const seen = new Set<string>();
  for (const s of Object.values(TAG_STYLES)) seen.add(s.icon);
  return [...seen].sort();
}
