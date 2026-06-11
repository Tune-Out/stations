import { el, middleTruncate } from '../dom.js';
import { t, countryName, languageName } from '../i18n.js';
import { iconHtml } from '../icons.js';
import { locale } from '../store.js';
import { openDb, topCountries, topTags, topLanguages } from '../db.js';
import { url } from '../router.js';
import { tagChip } from '../components/tag-chip.js';
import type { Route } from '../router.js';

export async function renderBrowse(_route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const db = await openDb();

  const root = el('div', { class: 'container' });

  const head = el('header', { class: 'hero' });
  head.appendChild(el('p', { class: 'kicker', text: t('nav.browse') }));
  head.appendChild(el('h1', { class: 'h-display', text: t('browse.title') }));
  root.appendChild(head);

  // Countries — uniform-sized cards, no wrap, middle-truncated names.
  // Each card is a real <a> with three child spans so we can target the
  // name span for runtime middle-truncation based on actual rendered width.
  {
    const sec = el('section', { class: 'section' });
    sec.appendChild(el('h2', { class: 'h-section', text: t('browse.countries') }));
    const grid = el('div', { class: 'country-grid' });
    grid.style.marginBlockStart = '0.75rem';

    // Track name spans + their full text so a single ResizeObserver can
    // re-truncate every card when the grid re-flows on viewport changes.
    const truncTargets: { node: HTMLElement; text: string }[] = [];

    for (const c of topCountries(db, 80)) {
      const card = el('a', {
        class: 'country-card',
        attrs: { href: url('search', { country: c.countrycode }) },
      });
      card.appendChild(el('span', { class: 'country-flag', text: flag(c.countrycode) }));
      const name = el('span', { class: 'country-name' });
      card.appendChild(name);
      card.appendChild(el('span', { class: 'country-count', text: c.n.toLocaleString(l) }));
      grid.appendChild(card);

      const fullName = countryName(c.countrycode, l) || c.country;
      truncTargets.push({ node: name, text: fullName });
    }
    sec.appendChild(grid);
    root.appendChild(sec);

    // Apply once after layout, then again whenever the grid re-flows.
    // Idempotent — re-applying with the same fullText produces the same DOM,
    // so the observer can't loop on its own writes.
    const retruncate = () => {
      for (const { node, text } of truncTargets) middleTruncate(node, text);
    };
    requestAnimationFrame(retruncate);
    new ResizeObserver(retruncate).observe(grid);
  }

  // Tags
  {
    const sec = el('section', { class: 'section' });
    sec.appendChild(el('h2', { class: 'h-section', text: t('browse.tags') }));
    const cloud = el('div', { class: 'chip-cloud' });
    cloud.style.marginBlockStart = '0.75rem';
    for (const row of topTags(db, 100)) {
      // Structured filter — tag picker will be pre-selected.
      cloud.appendChild(tagChip(row.tag, { href: url('search', { tag: row.tag }) }));
    }
    sec.appendChild(cloud);
    root.appendChild(sec);
  }

  // Languages (review #11). Each chip is a structured language: filter.
  {
    const sec = el('section', { class: 'section' });
    sec.appendChild(el('h2', { class: 'h-section', text: t('browse.languages') }));
    const cloud = el('div', { class: 'chip-cloud' });
    cloud.style.marginBlockStart = '0.75rem';
    for (const row of topLanguages(db, 80)) {
      if (!row.lang) continue;
      // Render the language in the user's locale where possible (ISO 639-1
      // lookups via Intl.DisplayNames); fall back to the raw slug.
      const isIso = /^[a-z]{2}$/.test(row.lang);
      const display = isIso ? (languageName(row.lang, l) || row.lang) : row.lang;
      cloud.appendChild(el('a', {
        class: 'lang-chip',
        attrs: { href: url('search', { language: row.lang }) },
        html: `<span class="lang-chip-icon" aria-hidden="true">${iconHtml('language', 14)}</span>
               <span class="lang-chip-label">${escape(display)}</span>
               <span class="lang-chip-count">${row.n.toLocaleString(l)}</span>`,
      }));
    }
    sec.appendChild(cloud);
    root.appendChild(sec);
  }

  mount.replaceChildren(root);
}

function escape(s: string) {
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}
function flag(cc: string) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(0x1f1e6 + (cc.charCodeAt(0) - 0x41), 0x1f1e6 + (cc.charCodeAt(1) - 0x41));
}
