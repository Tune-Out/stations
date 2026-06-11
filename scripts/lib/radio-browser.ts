export const RADIO_BROWSER_ALL_JSON = 'https://de1.api.radio-browser.info/json/stations';
export const RADIO_BROWSER_SERVERS_URL = 'https://all.api.radio-browser.info/json/servers';
export const FALLBACK_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
];

export interface ResolvedMirror {
  baseUrl: string;
  allJsonUrl: string;
}

export async function discoverMirror(): Promise<ResolvedMirror> {
  try {
    const r = await fetch(RADIO_BROWSER_SERVERS_URL, {
      headers: { 'user-agent': 'tune-out-catalog-seed/0.1' },
    });
    if (r.ok) {
      const list = (await r.json()) as Array<{ name: string }>;
      const pick = list[Math.floor(list.length / 2)]?.name ?? 'de1.api.radio-browser.info';
      const base = `https://${pick}`;
      return { baseUrl: base, allJsonUrl: `${base}/json/stations` };
    }
  } catch {
    // fall through
  }
  const base = FALLBACK_SERVERS[0]!;
  return { baseUrl: base, allJsonUrl: `${base}/json/stations` };
}

interface RawStation {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_stream?: string;
  url_resolved?: string;
  homepage?: string;
  url_homepage?: string;
  favicon?: string;
  url_favicon?: string;
  tags?: string | string[];
  country?: string;
  countrycode?: string;
  iso_3166_1?: string;
  state?: string;
  iso_3166_2?: string;
  language?: string | string[];
  languagecodes?: string | string[];
  iso_639?: string | null;
  votes?: number | string;
  codec?: string;
  bitrate?: number | string;
  hls?: number | boolean | string;
  lastcheckok?: number | boolean | string;
  lastchangetime?: string;
  clickcount?: number | string;
  geo_lat?: number | string | null;
  geo_long?: number | string | null;
}

export function rawToStation(r: RawStation): Record<string, unknown> {
  if (!r.stationuuid) throw new Error('missing stationuuid');
  if (!r.name) throw new Error('missing name');

  const language = r.language ?? '';
  const languagecodes = r.languagecodes ?? (r.iso_639 ? String(r.iso_639) : '');

  return {
    stationuuid: r.stationuuid,
    name: r.name,
    url: r.url ?? r.url_stream ?? '',
    url_resolved: r.url_resolved ?? '',
    homepage: r.homepage ?? r.url_homepage ?? '',
    favicon: r.favicon ?? r.url_favicon ?? '',
    tags: r.tags ?? [],
    country: r.country ?? '',
    countrycode: r.countrycode ?? r.iso_3166_1 ?? '',
    state: r.state ?? r.iso_3166_2 ?? '',
    language,
    languagecodes,
    votes: r.votes ?? 0,
    codec: r.codec ?? '',
    bitrate: r.bitrate ?? 0,
    hls: r.hls ?? false,
    lastcheckok: r.lastcheckok ?? false,
    lastchangetime: r.lastchangetime ?? '',
    clickcount: r.clickcount ?? 0,
    geo_lat: r.geo_lat ?? null,
    geo_long: r.geo_long ?? null,
  };
}
