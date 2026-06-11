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
import type { Route } from '../router.js';

const COUNTRY_RAILS = 6;
const TAG_RAILS     = 6;

export async function renderHome(_route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const db = await openDb();

  const root = el('div', { class: 'container' });

  // ── Top Stations Worldwide ── (no hero — the rail leads the page)
  root.appendChild(
    rail({
      title: t('section.top_stations_worldwide'),
      load: (offset, limit) =>
        searchStations(db, '', l, { onlineOnly: true, limit, offset }),
      pageSize: 30,
    }),
  );

  // ── Top Stations in <current locale's language> ── (filtered by the
  // language column whose slug matches the active locale code; only rendered
  // if there's at least one station so empty locales don't show an empty rail).
  const langFilters = { languages: [l], onlineOnly: true, sort: 'popular' as const };
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

  // ── Per-country rails (the top ~6 countries get their own rail) ──
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

  // ── Per-tag rails (the top ~6 tags get their own rail) ──
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

  // Footer line
  root.appendChild(footerLine());

  mount.replaceChildren(root);
}

function footerLine(): HTMLElement {
  const f = el('footer', { class: 'foot' });
  f.appendChild(el('span', { text: t('footer.non_commercial') }));
  const right = el('span');
  right.innerHTML = `<a href="${url('about')}">${escape(t('footer.public_domain'))}</a>`;
  f.appendChild(right);
  return f;
}
function escape(s: string) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
