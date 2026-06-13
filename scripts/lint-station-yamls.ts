#!/usr/bin/env tsx
/**
 * Station-YAML linter.
 *
 * Locally:   npm run lint:yaml [-- path1 path2 …]
 * In CI:     npm run lint:yaml -- --github  (emits GitHub Actions annotations)
 *
 * Errors (fail the run, exit 1):
 *   - YAML parse error
 *   - unknown top-level key
 *   - missing required field (uuid, name, url)
 *   - tag not in the canonical set
 *   - language not ISO 639-1 (or known multi-char language code)
 *   - countrycode missing or not a valid ISO 3166-1 alpha-2
 *   - name fails normalization (leading/trailing whitespace, control chars)
 *
 * Warnings (do not fail by default):
 *   - missing research block
 *   - empty url or url not http(s)
 *   - countrycode <> country mismatch (best-effort lookup)
 *   - country in the freeform `country` field doesn't decode via Intl.DisplayNames
 *
 * The linter is designed to be FAST on the full 58 k corpus: it reads files
 * in parallel and only parses YAML once. Typical full-corpus run: ~10 s on a
 * laptop, well under a minute in CI.
 */
import { readFile } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import fg from 'fast-glob';
import pLimit from 'p-limit';
import { parse, parseDocument } from 'yaml';

import { StationSchema } from './lib/schema.js';
import { CANONICAL_TAGS, isCanonicalTag } from './lib/canonical.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const DATA_DIR = join(ROOT, 'data', 'stations');

const GITHUB = process.argv.includes('--github');
const WARN_AS_ERROR = process.argv.includes('--strict');
const FAIL_ON_WARN = WARN_AS_ERROR;
const argPaths = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// ─────────────────────────────────────────────────────────────────────────
// Reference data
// ─────────────────────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 country codes (the same set Intl.DisplayNames knows).
const ISO_COUNTRY_CODES = new Set(
  // Build at runtime from a constant list so we don't depend on Intl runtime
  // shape. This is the IANA region list (~250 entries).
  ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
   'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO ' +
   'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE ' +
   'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO ' +
   'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW ' +
   'PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM ' +
   'TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(/\s+/),
);

// Accepted language slugs: ISO 639-1 (two letters) covers most. Some entries
// in the corpus use 3-letter macrolanguage codes; we accept those too. This is
// a soft check — we don't want to fail on legitimate but obscure languages.
const ISO_639_1_RE = /^[a-z]{2}$/;
const ISO_639_3_RE = /^[a-z]{3}$/;

// Known top-level keys we permit. Anything else is a typo or stale field.
const ALLOWED_KEYS = new Set([
  'stationuuid', 'name', 'url', 'url_resolved', 'homepage', 'favicon',
  'tags', 'country', 'countrycode', 'state',
  'language', 'languagecodes',
  'votes', 'codec', 'bitrate', 'hls', 'lastcheckok', 'lastchangetime',
  'clickcount', 'geo_lat', 'geo_long',
  'curation', 'duplicate_of', 'streams', 'provenance',
  'localized', 'research',
]);

// ─────────────────────────────────────────────────────────────────────────
// Diagnostic types + emit
// ─────────────────────────────────────────────────────────────────────────

type Severity = 'error' | 'warning';
interface Diag {
  file: string;
  line?: number;
  col?: number;
  severity: Severity;
  rule: string;
  message: string;
}

function emit(d: Diag): void {
  const rel = relative(ROOT, d.file);
  if (GITHUB) {
    // GitHub Actions annotations: ::error file=…,line=… ::message
    const sev = d.severity;
    const parts = [`file=${rel}`];
    if (d.line) parts.push(`line=${d.line}`);
    if (d.col)  parts.push(`col=${d.col}`);
    parts.push(`title=${d.rule}`);
    // GitHub strips newlines — collapse them to %0A escape if needed.
    const msg = d.message.replace(/\n/g, '%0A');
    console.log(`::${sev} ${parts.join(',')}::${msg}`);
  } else {
    const where = d.line ? `${rel}:${d.line}${d.col ? `:${d.col}` : ''}` : rel;
    const colorOpen  = d.severity === 'error' ? '\x1b[31m' : '\x1b[33m';
    const colorReset = '\x1b[0m';
    console.log(`${colorOpen}${d.severity}${colorReset} [${d.rule}] ${where}: ${d.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Per-file lint
// ─────────────────────────────────────────────────────────────────────────

async function lintFile(path: string): Promise<Diag[]> {
  const out: Diag[] = [];
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    out.push({ file: path, severity: 'error', rule: 'read-failed', message: (e as Error).message });
    return out;
  }

  // Use parseDocument so we have line numbers on the AST.
  let doc;
  try {
    doc = parseDocument(text);
  } catch (e) {
    out.push({ file: path, severity: 'error', rule: 'yaml-parse', message: (e as Error).message });
    return out;
  }
  for (const e of doc.errors) {
    out.push({
      file: path,
      line: e.linePos?.[0]?.line,
      col: e.linePos?.[0]?.col,
      severity: 'error',
      rule: 'yaml-parse',
      message: e.message,
    });
  }
  for (const w of doc.warnings) {
    out.push({
      file: path,
      line: w.linePos?.[0]?.line,
      col: w.linePos?.[0]?.col,
      severity: 'warning',
      rule: 'yaml-parse',
      message: w.message,
    });
  }
  if (doc.errors.length) return out;

  // Plain-object view for content checks.
  let value: Record<string, unknown>;
  try {
    value = (parse(text) ?? {}) as Record<string, unknown>;
  } catch (e) {
    out.push({ file: path, severity: 'error', rule: 'yaml-parse', message: (e as Error).message });
    return out;
  }

  // Unknown top-level keys — usually typos or stale fields.
  for (const key of Object.keys(value)) {
    if (!ALLOWED_KEYS.has(key)) {
      out.push({ file: path, severity: 'error', rule: 'unknown-key',
        message: `Unknown top-level key "${key}". Allowed: ${[...ALLOWED_KEYS].sort().join(', ')}` });
    }
  }

  // Schema check (validates types + required fields).
  const parsed = StationSchema.safeParse(value);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      out.push({ file: path, severity: 'error', rule: 'schema',
        message: `${issue.path.join('.') || '<root>'}: ${issue.message}` });
    }
    // Don't return early — content checks below still give useful signal.
  }

  // Name normalization
  const name = String(value.name ?? '');
  if (name === '') {
    out.push({ file: path, severity: 'error', rule: 'empty-name', message: '`name` is empty' });
  } else {
    if (/^\s|\s$/.test(name)) {
      out.push({ file: path, severity: 'error', rule: 'name-whitespace',
        message: '`name` has leading/trailing whitespace — run `npm run migrate:yaml`' });
    }
    if (/\s{2,}/.test(name)) {
      out.push({ file: path, severity: 'error', rule: 'name-whitespace',
        message: '`name` contains multiple consecutive spaces' });
    }
    // ASCII control chars (0x00..0x1F) + DEL (0x7F). The migration script
    // strips these; lint surfaces any that snuck in via hand-edits.
    // \p{Cc} = Unicode general-category "Other, Control" — captures the same
    // range without putting raw control bytes into the source.
    if (/\p{Cc}/u.test(name)) {
      out.push({ file: path, severity: 'error', rule: 'name-control-chars',
        message: '`name` contains control characters' });
    }
  }

  // Tags must be in CANONICAL_TAGS
  const tags = Array.isArray(value.tags) ? value.tags : [];
  for (const t of tags) {
    const slug = String(t);
    if (!isCanonicalTag(slug)) {
      out.push({ file: path, severity: 'error', rule: 'unknown-tag',
        message: `Tag "${slug}" is not canonical. Run \`npm run migrate:yaml\` to canonicalize, or pick from: ${CANONICAL_TAGS.slice(0, 20).join(', ')}, …` });
    }
  }

  // Languages: ISO 639-1 / 639-3 is the canonical form. Anything else is a
  // warning — could be a legitimate dialect ("swiss german", "northern sami")
  // we haven't aliased yet, or could be dirty input. Editorial reviewers
  // decide which by either adding an alias to scripts/lib/canonical.ts or
  // re-running the migration.
  // Error path is reserved for blatantly wrong shapes (commas, colons,
  // capital letters mid-string after the lowercase pass).
  const langs = Array.isArray(value.language) ? value.language : [];
  for (const l of langs) {
    const slug = String(l).trim();
    if (!slug) continue;
    const low = slug.toLowerCase();
    if (ISO_639_1_RE.test(low) || ISO_639_3_RE.test(low)) continue;
    if (/[,:;()/\\]/.test(slug) || slug !== low) {
      out.push({ file: path, severity: 'error', rule: 'language-format',
        message: `Language "${l}" is not canonical (contains punctuation or upper-case). Run \`npm run migrate:yaml\`.` });
    } else {
      out.push({ file: path, severity: 'warning', rule: 'language-unknown',
        message: `Language "${l}" has no ISO code. Add an alias in scripts/lib/canonical.ts if it's a real language.` });
    }
  }

  // Country code — required and must be valid ISO 3166-1 alpha-2 if present
  const cc = String(value.countrycode ?? '').trim();
  if (cc === '') {
    out.push({ file: path, severity: 'warning', rule: 'missing-country',
      message: '`countrycode` is empty — search facets won\'t show this station' });
  } else if (!ISO_COUNTRY_CODES.has(cc.toUpperCase())) {
    out.push({ file: path, severity: 'error', rule: 'unknown-country',
      message: `countrycode "${cc}" is not a known ISO 3166-1 alpha-2 code` });
  }

  // Free-text country: warn only when the decoded short-name has nothing in
  // common with the supplied long-name. We tolerate the radio-browser "The X
  // Of Y" forms (e.g. "The Russian Federation" → ISO "Russia") because both
  // refer to the same country and either is a legitimate display value.
  const country = String(value.country ?? '').trim();
  if (country && cc) {
    try {
      const decoded = new Intl.DisplayNames(['en'], { type: 'region' }).of(cc.toUpperCase()) ?? '';
      const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\s]/gu, '').replace(/\bthe\b|\bof\b|\band\b/g, ' ').replace(/\s+/g, ' ').trim();
      const aToks = clean(country).split(/\s+/).filter(Boolean);
      const bToks = clean(decoded).split(/\s+/).filter(Boolean);
      // Tolerant overlap: any 3+ char token in either side prefix-matches one
      // in the other ("russia" prefixes "russian"; "korea" matches "korea").
      const prefixHit = aToks.some((a) => a.length >= 3 && bToks.some((b) => a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4))));
      if (decoded && !prefixHit) {
        out.push({ file: path, severity: 'warning', rule: 'country-mismatch',
          message: `country="${country}" but countrycode "${cc}" decodes to "${decoded}"` });
      }
    } catch { /* runtime without Intl region data — silently skip */ }
  }

  // URL must be http(s)
  const url = String(value.url ?? '').trim();
  if (!url) {
    out.push({ file: path, severity: 'warning', rule: 'missing-url',
      message: '`url` is empty — station is unplayable' });
  } else if (!/^https?:\/\//i.test(url)) {
    out.push({ file: path, severity: 'error', rule: 'bad-url',
      message: `url "${url}" must start with http:// or https://` });
  }

  // Research block: warn if missing
  if (!value.research || Object.keys(value.research as object).length === 0) {
    out.push({ file: path, severity: 'warning', rule: 'no-research',
      message: '`research:` block is missing — run wave annotator' });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Entrypoint
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  let paths: string[];
  if (argPaths.length) {
    paths = argPaths.map((p) => resolve(ROOT, p));
  } else {
    paths = await fg('**/*.yaml', { cwd: DATA_DIR, absolute: true });
  }
  paths.sort();
  if (!GITHUB) console.log(`[lint] checking ${paths.length} YAMLs`);

  const limit = pLimit(Math.max(4, cpus().length));
  let errors = 0, warnings = 0, errored = 0;

  await Promise.all(
    paths.map((p) => limit(async () => {
      const diags = await lintFile(p);
      let hadErr = false;
      for (const d of diags) {
        emit(d);
        if (d.severity === 'error') { errors++; hadErr = true; }
        else warnings++;
      }
      if (hadErr) errored++;
    })),
  );

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = `[lint] ${errors} errors, ${warnings} warnings across ${paths.length} files (${errored} files with errors) in ${dt}s`;
  if (GITHUB) console.log(`::notice::${summary}`);
  else console.log(summary);

  if (errors > 0 || (FAIL_ON_WARN && warnings > 0)) process.exit(1);
}

main().catch((e) => {
  console.error('[lint] fatal:', e);
  process.exit(2);
});
