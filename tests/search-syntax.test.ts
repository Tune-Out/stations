import { describe, expect, it } from 'vitest';
import { parseInput, buildFtsExpression } from '../src/spa/search-syntax.js';

describe('parseInput — structured search syntax', () => {
  it('returns empty filter set for empty input', () => {
    const p = parseInput('');
    expect(p).toEqual({ query: '', tags: [], languages: [] });
  });

  it('plain words become the FTS query', () => {
    const p = parseInput('smooth jazz');
    expect(p.query).toBe('smooth jazz');
    expect(p.tags).toEqual([]);
  });

  it('handles a single tag: prefix', () => {
    const p = parseInput('tag:jazz');
    expect(p).toMatchObject({ query: '', tags: ['jazz'] });
  });

  it('combines tag + free text', () => {
    const p = parseInput('smooth tag:jazz');
    expect(p).toMatchObject({ query: 'smooth', tags: ['jazz'] });
  });

  // The exact example from the user spec — must produce all four facets.
  it('parses "tag:country language:en country:canada StationName"', () => {
    const p = parseInput('tag:country language:en country:canada StationName');
    expect(p).toEqual({
      query: 'StationName',
      tags: ['country'],
      languages: ['en'],
      country: 'canada',
    });
  });

  it('supports both lang: and language: aliases', () => {
    const a = parseInput('lang:fr');
    const b = parseInput('language:fr');
    expect(a.languages).toEqual(['fr']);
    expect(b.languages).toEqual(['fr']);
  });

  it('treats multiple tag: tokens as AND filters', () => {
    const p = parseInput('tag:rock tag:80s');
    expect(p.tags).toEqual(['rock', '80s']);
  });

  it('accepts nature: prefix and quoted multi-word values', () => {
    const p = parseInput('nature:"public broadcaster"');
    expect(p.nature).toBe('public broadcaster');
  });

  it('upper-cases codec for SQL matching', () => {
    const p = parseInput('codec:mp3');
    expect(p.codec).toBe('MP3');
  });

  it('is case-insensitive in prefix names', () => {
    const p = parseInput('TAG:rock LANG:en COUNTRY:CA');
    expect(p).toMatchObject({ tags: ['rock'], languages: ['en'], country: 'ca' });
  });

  it('drops empty values', () => {
    // `tag:` immediately followed by a value is a structured filter; a stray
    // `tag:` with a space (and no value) falls through to free-text. This is
    // deliberate — we don't silently swallow random words.
    const p = parseInput('tag:rock');
    expect(p.tags).toEqual(['rock']);
    expect(p.query).toBe('');
    // No value attached: parsed as two literal tokens
    const p2 = parseInput('tag: rock');
    expect(p2.tags).toEqual([]);
    expect(p2.query).toBe('tag: rock');
  });
});

describe('buildFtsExpression — FTS5 safety', () => {
  it('returns empty string when input is whitespace', () => {
    expect(buildFtsExpression('')).toBe('');
    expect(buildFtsExpression('   ')).toBe('');
  });

  it('phrase-quotes each token and adds prefix wildcard', () => {
    expect(buildFtsExpression('rock')).toBe('"rock"*');
    expect(buildFtsExpression('rock jazz')).toBe('"rock"* "jazz"*');
  });

  it('strips FTS5 operator characters that would otherwise throw', () => {
    // Before the fix this would emit raw `NOT(jazz)*` and the SQL would throw
    // SQLITE_ERROR with "fts5: syntax error". After: parens are gone, the
    // word "NOT" survives as a literal token (FTS only treats UPPERCASE NOT
    // as an operator when surrounded by tokens — phrase-quoting makes that
    // moot here).
    const out = buildFtsExpression('rock NOT(jazz)');
    // No parentheses or carets should survive (the prefix `*` we emit is fine).
    expect(out).not.toMatch(/[()^]/);
    expect(out).toContain('"rock"*');
    expect(out).toContain('"NOT"*');
    expect(out).toContain('"jazz"*');
  });

  it('handles unicode tokens', () => {
    expect(buildFtsExpression('Радио')).toBe('"Радио"*');
    expect(buildFtsExpression('日本')).toBe('"日本"*');
  });

  it('preserves apostrophes and hyphens inside tokens', () => {
    expect(buildFtsExpression("rock 'n roll")).toBe(`"rock"* "'n"* "roll"*`);
    expect(buildFtsExpression('hip-hop')).toBe('"hip-hop"*');
  });

  it('does not emit an unbalanced quote even when input has one', () => {
    expect(buildFtsExpression('say "hi')).toBe('"say"* "hi"*');
  });
});
