#!/usr/bin/env node
/**
 * One-off: remove `ref=…` tracking parameters from the URL-shaped fields of
 * every station YAML (`url`, `url_resolved`, `homepage`, `favicon`).
 *
 * We operate on the file text directly with a small regex pass — no YAML
 * parse round-trip — so we leave every other byte untouched. The regex
 * handles all three positional cases:
 *   `?ref=foo`            (sole query) → drop `?ref=foo`
 *   `?ref=foo&rest=…`     (leading)    → keep `?rest=…`
 *   `…&ref=foo[&…]`       (middle/end) → drop the `&ref=foo`
 */
import fg from 'fast-glob';
import { readFile, writeFile } from 'node:fs/promises';
import pLimit from 'p-limit';
import { cpus } from 'node:os';

function stripRef(u) {
  if (!u) return u;
  let out = u;
  // ?ref=X (only query) → ""
  out = out.replace(/\?ref=[^&\s"]*(?=[\s"]|$)/g, '');
  // ?ref=X& → ?
  out = out.replace(/\?ref=[^&\s"]*&/g, '?');
  // &ref=X → ""
  out = out.replace(/&ref=[^&\s"]*/g, '');
  return out;
}

// Sanity-check the regex before walking 58k files.
const cases = [
  ['http://x.com/s?ref=radiobrowser', 'http://x.com/s'],
  ['http://x.com/s?ref=radiobrowser-remix-partybreaks-radio', 'http://x.com/s'],
  ['http://x.com/s?ref=rb&a=1', 'http://x.com/s?a=1'],
  ['http://x.com/s?a=1&ref=rb', 'http://x.com/s?a=1'],
  ['http://x.com/s?a=1&ref=rb&b=2', 'http://x.com/s?a=1&b=2'],
  ['http://x.com/s', 'http://x.com/s'],
  ['http://x.com/s?reference=keep', 'http://x.com/s?reference=keep'],
];
for (const [input, expected] of cases) {
  const got = stripRef(input);
  if (got !== expected) {
    console.error(`regex bug: stripRef(${JSON.stringify(input)}) = ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
    process.exit(2);
  }
}

const paths = await fg('data/stations/**/*.yaml');
console.log(`scanning ${paths.length} YAMLs`);

const URL_KEYS = /^(url|url_resolved|homepage|favicon):\s*(.+)$/gm;
const limit = pLimit(Math.max(4, cpus().length));
let changed = 0;

await Promise.all(paths.map((p) => limit(async () => {
  const original = await readFile(p, 'utf8');
  // Only touch lines that look like URL-bearing fields.
  let edited = original.replace(URL_KEYS, (line, key, valRaw) => {
    const val = valRaw.trimEnd();
    // YAML may have quoted the value; strip surrounding double-quotes for
    // the substitution and restore them after.
    const quoted = /^"(.*)"$/.test(val);
    const inner = quoted ? val.slice(1, -1) : val;
    const next = stripRef(inner);
    if (next === inner) return line;
    return `${key}: ${quoted ? `"${next}"` : next}`;
  });
  if (edited !== original) {
    await writeFile(p, edited);
    changed++;
  }
})));

console.log(`changed: ${changed} / ${paths.length}`);
