/**
 * Pure search-syntax helpers — extracted so they're trivially unit-testable
 * (no DOM, no SQLite, no router). Used by:
 *   - src/spa/views/search.ts   → parseInput()
 *   - src/spa/db.ts             → buildFtsExpression()
 */

export interface ParsedInput {
  query: string;
  tags: string[];
  languages: string[];
  country?: string;
  codec?: string;
  nature?: string;
}

/**
 * Parse a free-form search input into a structured filter set.
 *
 * Supported prefixes (case-insensitive):
 *   tag:NAME          → tags filter
 *   lang:CODE         → language filter (also accepts language:NAME)
 *   country:CC|NAME   → country filter (resolution to ISO code happens later)
 *   codec:NAME        → codec filter
 *   nature:VALUE      → editorial nature (use quotes for multi-word values)
 *
 * Example accepted by the user spec:
 *   tag:country language:en country:canada StationName
 *
 * Multi-word values can be quoted:
 *   nature:"public broadcaster"
 */
export function parseInput(input: string): ParsedInput {
  const tags: string[] = [];
  const languages: string[] = [];
  const words: string[] = [];
  let country: string | undefined;
  let codec: string | undefined;
  let nature: string | undefined;

  // Tokenizer that honors quoted values: `nature:"public broadcaster"` becomes
  // a single token. Without this, the inner space would split it apart.
  const tokens: string[] = [];
  const re = /(?:[a-z]+:)?(?:"[^"]*"|\S+)/gi;
  for (const m of input.matchAll(re)) tokens.push(m[0]);

  for (const tok of tokens) {
    const m = tok.match(/^(tag|lang|language|country|codec|nature):(.+)$/i);
    if (!m) { words.push(tok); continue; }
    const key = m[1]!.toLowerCase();
    let val = m[2]!.trim().toLowerCase();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!val) continue;
    if      (key === 'tag')      tags.push(val);
    else if (key === 'lang' || key === 'language') languages.push(val);
    else if (key === 'country')  country = val;
    else if (key === 'codec')    codec   = val.toUpperCase();
    else if (key === 'nature')   nature  = val;
  }
  return { query: words.join(' '), tags, languages, country, codec, nature };
}

/**
 * Build an FTS5 MATCH expression that's safe against syntax injection.
 * FTS5 treats `^ * AND OR NOT ( )` and friends as operators; if the user typed
 * `rock NOT(jazz)` we'd produce a syntax error. Strategy: drop FTS5 operator
 * characters, then phrase-quote each remaining token and append `*` so prefix
 * matching still works.
 *
 * Returns "" when the cleaned input is empty (caller skips the JOIN).
 */
export function buildFtsExpression(query: string): string {
  const cleaned = query
    .trim()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')  // drop punctuation including " ^ * ( )
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.split(/\s+/)
    .map((tok) => `"${tok.replace(/"/g, '')}"*`)
    .join(' ');
}
