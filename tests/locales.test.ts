import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_LOCALES, LOCALES,
  localizedName, localizedDesc, refFromRow,
  type StationRow,
} from '../src/spa/types.js';

/**
 * The locale-fallback bug from review §1 was:
 *   - 13 locale columns existed in SQLite
 *   - StationRow only typed 3 (en/fr/ar)
 *   - localizedName('de') silently returned the canonical name
 * These tests pin the fix in place.
 */

function makeRow(over: Partial<StationRow> = {}): StationRow {
  return {
    uuid: 'u1',
    name: 'Canonical Name',
    url: 'http://stream',
    homepage: '',
    favicon: '',
    country: '',
    countrycode: 'CA',
    state: '',
    languagecodes: 'en',
    votes: 0,
    codec: 'MP3',
    bitrate: 128,
    hls: 0,
    lastcheckok: 1,
    clickcount: 0,
    geo_lat: null,
    geo_long: null,
    shard: 'aa',
    yaml_path: 'data/stations/aa/u1.yaml',
    tags_text: '',
    langs_text: '',
    ...over,
  };
}

describe('SUPPORTED_LOCALES + LOCALES table', () => {
  it('has the same set of keys', () => {
    expect(SUPPORTED_LOCALES.length).toBe(Object.keys(LOCALES).length);
    for (const l of SUPPORTED_LOCALES) expect(LOCALES[l]).toBeDefined();
  });

  it('marks ar as the only RTL locale', () => {
    expect(LOCALES.ar.dir).toBe('rtl');
    for (const l of SUPPORTED_LOCALES) {
      if (l !== 'ar') expect(LOCALES[l].dir).toBe('ltr');
    }
  });

  it('includes the 10 new locales from review §2', () => {
    for (const l of ['de', 'it', 'es', 'pt', 'hi', 'ja', 'zh', 'ko', 'id', 'ru'] as const) {
      expect(SUPPORTED_LOCALES).toContain(l);
    }
  });
});

describe('localizedName', () => {
  it('returns the locale-specific name when present', () => {
    const row = makeRow({ name_de: 'Deutscher Name' });
    expect(localizedName(row, 'de')).toBe('Deutscher Name');
  });

  it('falls back to the canonical name when the locale column is missing', () => {
    const row = makeRow();
    expect(localizedName(row, 'fr')).toBe('Canonical Name');
  });

  it('falls back when the locale column is the empty string', () => {
    const row = makeRow({ name_ja: '' });
    expect(localizedName(row, 'ja')).toBe('Canonical Name');
  });

  it('works for all 13 supported locales (regression on review §1)', () => {
    for (const l of SUPPORTED_LOCALES) {
      const row = makeRow({ [`name_${l}`]: `name in ${l}` } as Partial<StationRow>);
      expect(localizedName(row, l)).toBe(`name in ${l}`);
    }
  });
});

describe('localizedDesc', () => {
  it('returns desc_${locale} when present', () => {
    const row = makeRow({ desc_ru: 'Русское описание' });
    expect(localizedDesc(row, 'ru')).toBe('Русское описание');
  });

  it('returns empty string when desc is missing', () => {
    expect(localizedDesc(makeRow(), 'pt')).toBe('');
  });
});

describe('refFromRow', () => {
  it('uses the localized name when present', () => {
    const row = makeRow({ name_ko: '한국어 이름' });
    expect(refFromRow(row, 'ko').name).toBe('한국어 이름');
  });

  it('falls back to canonical name', () => {
    expect(refFromRow(makeRow(), 'hi').name).toBe('Canonical Name');
  });

  it('preserves uuid / url / shard / countrycode', () => {
    const row = makeRow({ favicon: 'fav.png' });
    expect(refFromRow(row, 'en')).toEqual({
      uuid: 'u1',
      name: 'Canonical Name',
      favicon: 'fav.png',
      url: 'http://stream',
      shard: 'aa',
      countrycode: 'CA',
    });
  });
});
