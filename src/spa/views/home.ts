import { el } from '../dom.js';
import { t, countryName, tTag } from '../i18n.js';
import { locale } from '../store.js';
import {
  openDb,
  byCountry,
  byTag,
  countSearch,
  searchStations,
  topCountries,
  topTags,
} from '../db.js';
import { LOCALES } from '../types.js';
import { url } from '../router.js';
import { rail } from '../components/rail.js';
import { catalogCountLine, catalogFooter } from '../components/catalog-stats.js';
import type { Route } from '../router.js';

const COUNTRY_RAILS = 6;
const TAG_RAILS     = 6;

export async function renderHome(_route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const db = await openDb();

  const root = el('div', { class: 'container' });

  // Total-count line above the rails so visitors see catalog scale at a glance.
  root.appendChild(catalogCountLine(db));

  // ── Top Stations Worldwide ── (curation-led; popularity is the tiebreaker)
  // Sort 'curated' = COALESCE(curation, 0) DESC, votes DESC. This pushes
  // public broadcasters / non-commercial / classical-jazz curators to the
  // top of the rail ahead of generic hit-rotation streams.
  const worldFilters = { onlineOnly: true, sort: 'curated' as const };
  root.appendChild(
    rail({
      title: t('section.top_stations_worldwide'),
      load: (offset, limit) =>
        searchStations(db, '', l, { ...worldFilters, limit, offset }),
      pageSize: 30,
    }),
  );

  // ── Top Stations in <current locale's language> ── (also curation-led)
  const langFilters = { languages: [l], onlineOnly: true, sort: 'curated' as const };
  const langStationCount = countSearch(db, '', langFilters);
  if (langStationCount > 0) {
    const langName = LOCALES[l].nativeName;
    root.appendChild(
      rail({
        title: t('section.top_stations_in_language', { language: langName }),
        load: (offset, limit) =>
          searchStations(db, '', l, { ...langFilters, limit, offset }),
        total: langStationCount,
        pageSize: 30,
      }),
    );
  }

  // ── Per-tag rails first (Browse by Tag is the lead facet) ──
  const tags = topTags(db, TAG_RAILS);
  for (const tag of tags) {
    if (!tag.tag) continue;
    root.appendChild(
      rail({
        title: tTag(tag.tag),
        kicker: t('section.popular_tags'),
        more: { href: url('search', { tag: tag.tag }), label: t('section.results') + ' →' },
        load: (offset, limit) => byTag(db, tag.tag, limit, offset),
        total: tag.n,
        pageSize: 30,
      }),
    );
  }

  // ── Per-country rails AFTER the tag rails (genre-first, geography-second) ──
  const countries = topCountries(db, COUNTRY_RAILS);
  for (const c of countries) {
    if (!c.countrycode) continue;
    root.appendChild(
      rail({
        title: countryName(c.countrycode, l) || c.country,
        kicker: t('section.popular_countries'),
        more: { href: url('search', { country: c.countrycode }), label: t('section.results') + ' →' },
        load: (offset, limit) => byCountry(db, c.countrycode, limit, offset),
        total: c.n,
        pageSize: 30,
      }),
    );
  }

  // Footer with public-domain link + "Updated <date>" suffix.
  root.appendChild(catalogFooter());

  mount.replaceChildren(root);
}
