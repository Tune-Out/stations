import { describe, expect, it } from 'vitest';
import {
  CANONICAL_TAGS,
  canonicalizeTag,
  canonicalizeTags,
  canonicalizeLanguage,
  canonicalizeLanguages,
  canonicalizeNature,
  normalizeStationName,
  isCanonicalTag,
} from '../scripts/lib/canonical.js';

describe('canonical tag set', () => {
  it('stays under 100 entries (the documented invariant)', () => {
    expect(CANONICAL_TAGS.length).toBeLessThan(100);
  });

  it('contains no duplicates', () => {
    expect(new Set(CANONICAL_TAGS).size).toBe(CANONICAL_TAGS.length);
  });

  it('isCanonicalTag rejects unknown slugs', () => {
    expect(isCanonicalTag('pop')).toBe(true);
    expect(isCanonicalTag('not-a-thing')).toBe(false);
  });
});

describe('canonicalizeTag', () => {
  it.each([
    // exact canonical pass-through
    ['pop', 'pop'],
    ['classical', 'classical'],
    // Spanish / Latin American genre folds
    ['música pop', 'pop'],
    ['musica regional mexicana', 'regional-mexican'],
    ['regional mexican', 'regional-mexican'],
    ['banda norteña', 'regional-mexican'],
    ['romántica', 'romantic'],
    ['noticias', 'news'],
    ['deportes', 'sports'],
    // Decades
    ["80's", '80s'],
    ['80er', '80s'],
    ['1990s', '90s'],
    // Punctuation / spacing variants
    ['hip hop', 'hip-hop'],
    ['HipHop', 'hip-hop'],
    ['r&b', 'r-and-b'],
    ['Drum and Bass', 'drum-and-bass'],
    // Cyrillic
    ['рок', 'rock'],
    ['джаз', 'jazz'],
    // Sparse-tag fold (the kept-under-100 work)
    ['choir', 'classical'],
    ['samba', 'world'],
    ['health and wellness', 'lifestyle'],
  ])('maps "%s" → "%s"', (raw, expected) => {
    expect(canonicalizeTag(raw)).toBe(expected);
  });

  it.each([
    // noise drops
    'fm', 'AM', 'radio', 'online', 'estación', '100.1', '24/7',
    // geography / callsign-like / station-promo
    'méxico', 'XHCNA-FM', 'ponte exa', 'moi merino',
  ])('drops noise tag "%s"', (raw) => {
    expect(canonicalizeTag(raw)).toBeNull();
  });

  it('handles empty + whitespace input safely', () => {
    expect(canonicalizeTag('')).toBeNull();
    expect(canonicalizeTag('   ')).toBeNull();
  });
});

describe('canonicalizeTags (batch)', () => {
  it('dedupes and preserves first-occurrence order', () => {
    const out = canonicalizeTags(['pop', 'rock', 'pop music', 'metal', 'rock']);
    expect(out).toEqual(['pop', 'rock', 'metal']);
  });

  it('drops everything when input is all noise', () => {
    expect(canonicalizeTags(['fm', '100.1', 'XHABC-FM'])).toEqual([]);
  });

  it('returns only canonical slugs', () => {
    const out = canonicalizeTags(['noticias', 'banda', 'клуб', 'underground']);
    for (const t of out) expect(isCanonicalTag(t)).toBe(true);
  });
});

describe('canonicalizeLanguage', () => {
  it.each([
    ['english', 'en'],
    ['American English', 'en'],
    ['engilsh', 'en'],
    ['español', 'es'],
    ['Español Argentina', 'es'],
    ['espanish', 'es'],
    ['português (brasil)', 'pt'],
    ['portugues do brasil', 'pt'],
    ['brazilian portuguese', 'pt'],
    ['deutsch', 'de'],
    ['язык: русский', 'ru'],
    ['en', 'en'],   // already-ISO pass-through
    ['JA', 'ja'],
  ])('folds "%s" → "%s"', (raw, expected) => {
    expect(canonicalizeLanguage(raw)).toBe(expected);
  });

  it('keeps unknown values rather than dropping them', () => {
    expect(canonicalizeLanguage('lingua dei segni italiana')).toBe('lingua dei segni italiana');
  });

  it('drops generic placeholders', () => {
    expect(canonicalizeLanguage('various')).toBeNull();
    expect(canonicalizeLanguage('international')).toBeNull();
  });
});

describe('canonicalizeLanguages (batch)', () => {
  it('dedupes the same language across spelling variants', () => {
    const out = canonicalizeLanguages(['English', 'engilsh', 'american english']);
    expect(out).toEqual(['en']);
  });
});

describe('canonicalizeNature', () => {
  it.each([
    ['commercial', 'commercial'],
    ['Commercial Radio', 'commercial'],
    ['commercial internet radio', 'commercial'],
    ['non-commercial', 'non-commercial'],
    ['non-commercial community radio', 'community'],
    ['public broadcaster', 'public broadcaster'],
    ['Public radio service', 'public broadcaster'],
    ['community radio', 'community'],
    ['low-power FM', 'community'],
    ['state media', 'state media'],
    ['government-owned', 'state media'],
    ['Religious / Christian programming', 'religious'],
    ['pirate', 'pirate'],
    ['unknown', 'unknown'],
  ])('folds "%s" → "%s"', (raw, expected) => {
    expect(canonicalizeNature(raw)).toBe(expected);
  });

  it('keeps cleaned input for unfamiliar values', () => {
    expect(canonicalizeNature('Unrecognized whatever')).toBe('unrecognized whatever');
  });
});

describe('normalizeStationName', () => {
  it('trims surrounding whitespace + collapses runs', () => {
    expect(normalizeStationName('  Radio   Vida  ')).toBe('Radio Vida');
  });

  it('strips zero-width and NBSP', () => {
    expect(normalizeStationName('Radio ​Vida')).toBe('Radio Vida');
  });

  it('leaves mixed-case names alone', () => {
    expect(normalizeStationName('Tune Out FM')).toBe('Tune Out FM');
  });

  it('preserves callsign all-caps (≤5 chars) when the rest is mixed', () => {
    expect(normalizeStationName('WOXR 90.9 Burlington')).toBe('WOXR 90.9 Burlington');
  });

  it('drops decorative leading/trailing punctuation', () => {
    expect(normalizeStationName('- Radio Vida -')).toBe('Radio Vida');
    expect(normalizeStationName('· Radio Vida ·')).toBe('Radio Vida');
  });

  it('only title-cases when the alphabetic portion is fully uppercase ≥6 chars', () => {
    // Long ALL CAPS — gets title-cased
    expect(normalizeStationName('RADIO UNIVERSIDAD MEXICO')).toBe('Radio Universidad Mexico');
    // Acronym/callsign in the middle — preserved
    expect(normalizeStationName('Tune Out FM Network')).toBe('Tune Out FM Network');
  });

  it('handles empty input', () => {
    expect(normalizeStationName('')).toBe('');
    expect(normalizeStationName('    ')).toBe('');
  });
});
