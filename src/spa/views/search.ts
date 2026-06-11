import { el } from '../dom.js';
import { t, countryName, languageName } from '../i18n.js';
import { iconHtml } from '../icons.js';
import { locale } from '../store.js';
import { play } from '../audio.js';
import {
  openDb, searchStations, countSearch, resolveCountryCode, topNatures, topLanguages,
  type SearchFilters, type SortKey,
} from '../db.js';
import { stationCard } from '../components/station-card.js';
import { tagChip } from '../components/tag-chip.js';
import { searchQs } from '../router.js';
import { parseInput } from '../search-syntax.js';
import type { Route } from '../router.js';

const PAGE = 60;
const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'relevance', labelKey: 'search.sort.relevance' },
  { key: 'popular',   labelKey: 'search.sort.popular' },
  { key: 'trending',  labelKey: 'search.sort.trending' },
  { key: 'name',      labelKey: 'search.sort.name' },
  { key: 'bitrate',   labelKey: 'search.sort.bitrate' },
  { key: 'fresh',     labelKey: 'search.sort.fresh' },
];

interface State {
  query: string;
  tags: string[];
  languages: string[];
  country: string;
  nature: string;
  sort: SortKey;
  shuffleSeed: number;
  onlineOnly: boolean;
}

function fromRoute(route: Route): State {
  const q = route.query;
  return {
    query:     (q.get('q') ?? '').trim(),
    tags:      q.getAll('tag').map((s) => s.trim().toLowerCase()).filter(Boolean),
    languages: q.getAll('language').map((s) => s.trim().toLowerCase()).filter(Boolean),
    country:   q.get('country') ?? '',
    nature:    q.get('nature') ?? '',
    sort:      (q.get('sort') as SortKey) || 'relevance',
    shuffleSeed: Number(q.get('seed') || 0) || newSeed(),
    onlineOnly: q.get('online') === '0' ? false : true,
  };
}

function newSeed(): number {
  // 31-bit positive int. Used by the shuffle ORDER BY so paging is stable.
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

/** Inverse of parseInput — used to seed the input box from URL state. */
function stateToInput(s: State): string {
  const parts: string[] = [];
  if (s.query) parts.push(s.query);
  for (const tag of s.tags)      parts.push('tag:' + tag);
  for (const lang of s.languages) parts.push('lang:' + lang);
  if (s.nature) parts.push('nature:' + (/\s/.test(s.nature) ? `"${s.nature}"` : s.nature));
  return parts.join(' ');
}

export async function renderSearch(route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const db = await openDb();
  const state: State = fromRoute(route);

  const root = el('div', { class: 'container search-view' });

  // ── Header ──────────────────────────────────────────────────────────
  const header = el('header', { class: 'search-header' });
  header.appendChild(el('p', { class: 'kicker', text: t('nav.search') }));
  header.appendChild(el('h1', { class: 'h-display', text: t('search.placeholder.global') }));
  header.appendChild(el('p', {
    class: 'search-hint muted',
    html: `${escape(t('search.syntax_hint') || 'Tip')}: <code>tag:jazz</code> · <code>lang:en</code> · <code>country:canada</code> · <code>nature:"public broadcaster"</code>`,
  }));
  root.appendChild(header);

  // ── Search bar (big input wrapped in a card) ────────────────────────
  const bar = el('div', { class: 'search-bar' });
  const searchIcon = el('span', {
    class: 'search-bar-icon',
    attrs: { 'aria-hidden': 'true' },
    html: iconHtml('search', 18),
  });
  const input = el('input', {
    class: 'search-bar-input',
    attrs: {
      type: 'search',
      placeholder: t('search.placeholder.global'),
      value: stateToInput(state),
      autofocus: true,
      spellcheck: false,
      autocomplete: 'off',
    },
  });
  const clearBtn = el('button', {
    class: 'search-bar-clear',
    attrs: { type: 'button', 'aria-label': t('search.clear') || 'Clear' },
    html: iconHtml('close', 16),
  });
  clearBtn.style.display = input.value ? '' : 'none';
  bar.appendChild(searchIcon);
  bar.appendChild(input);
  bar.appendChild(clearBtn);
  root.appendChild(bar);

  // ── Filter row ──────────────────────────────────────────────────────
  const filterRow = el('div', { class: 'search-filters' });

  // Distinct countries — single-pass query
  type DistRow = { countrycode: string; country: string };
  const distinctCountries = (db.exec({
    sql: `SELECT DISTINCT countrycode, country FROM stations
          WHERE countrycode <> '' AND country <> '' ORDER BY country`,
    rowMode: 'object', returnValue: 'resultRows',
  }) as DistRow[]);

  // Country dropdown
  const countrySelect = labelledSelect('search.filter.country');
  countrySelect.select.appendChild(el('option', { attrs: { value: '' }, text: t('search.filter.country') }));
  for (const c of distinctCountries) {
    const label = countryName(c.countrycode, l) || c.country;
    countrySelect.select.appendChild(el('option', { attrs: { value: c.countrycode }, text: label }));
  }
  countrySelect.select.value = state.country ?? '';
  filterRow.appendChild(countrySelect.root);

  // Language dropdown — replaces the old Codec dropdown.
  const languageSelect = labelledSelect('search.filter.language');
  languageSelect.select.appendChild(el('option', { attrs: { value: '' }, text: t('search.filter.language') }));
  for (const row of topLanguages(db, 80)) {
    if (!row.lang) continue;
    const isIso = /^[a-z]{2}$/.test(row.lang);
    const display = isIso ? (languageName(row.lang, l) || row.lang) : row.lang;
    languageSelect.select.appendChild(el('option', {
      attrs: { value: row.lang },
      text: `${display} (${row.n.toLocaleString(l)})`,
    }));
  }
  languageSelect.select.value = state.languages[0] ?? '';
  filterRow.appendChild(languageSelect.root);

  // Nature dropdown
  const natureSelect = labelledSelect('search.filter.nature');
  natureSelect.select.appendChild(el('option', { attrs: { value: '' }, text: t('search.filter.nature') }));
  for (const n of topNatures(db, 16)) {
    natureSelect.select.appendChild(el('option', { attrs: { value: n.nature }, text: `${n.nature} (${n.n.toLocaleString(l)})` }));
  }
  natureSelect.select.value = state.nature ?? '';
  filterRow.appendChild(natureSelect.root);

  // Sort dropdown
  const sortSelect = labelledSelect('search.sort.label');
  for (const opt of SORT_OPTIONS) {
    sortSelect.select.appendChild(el('option', { attrs: { value: opt.key }, text: t(opt.labelKey) }));
  }
  sortSelect.select.value = state.sort ?? 'relevance';
  filterRow.appendChild(sortSelect.root);

  // Shuffle button
  const shuffleBtn = el('button', {
    class: 'search-shuffle',
    attrs: { type: 'button', title: t('search.sort.shuffle'), 'aria-pressed': String(state.sort === 'shuffle') },
  });
  shuffleBtn.innerHTML = iconHtml('shuffle', 16);
  shuffleBtn.appendChild(el('span', { class: 'search-shuffle-label', text: t('search.sort.shuffle') }));
  filterRow.appendChild(shuffleBtn);

  // Online-only toggle
  const onlineLabel = el('label', { class: 'search-online' });
  const onlineCheck = el('input', { attrs: { type: 'checkbox', checked: state.onlineOnly } });
  onlineLabel.appendChild(onlineCheck);
  onlineLabel.appendChild(el('span', { text: t('search.filter.online_only') }));
  filterRow.appendChild(onlineLabel);

  root.appendChild(filterRow);

  // ── Active chips row (tags + languages from text input) ─────────────
  const activeChips = el('div', { class: 'search-active-chips' });
  root.appendChild(activeChips);

  // ── Summary + results ───────────────────────────────────────────────
  const summary = el('p', { class: 'search-summary muted' });
  root.appendChild(summary);

  const list = el('div', { class: 'results-list' });
  root.appendChild(list);

  const sentinel = el('div', { class: 'rail-sentinel' });
  sentinel.style.height = '40px';
  root.appendChild(sentinel);

  // ── State + behavior ────────────────────────────────────────────────
  let offset = 0;
  let exhausted = false;
  let loading = false;
  let io: IntersectionObserver | null = null;

  function pushUrl() {
    const qs = searchQs({
      query:     state.query    || undefined,
      country:   state.country  || undefined,
      nature:    state.nature   || undefined,
      tags:      state.tags,
      languages: state.languages,
    });
    const extra = new URLSearchParams(qs.startsWith('?') ? qs.slice(1) : qs);
    if (state.sort && state.sort !== 'relevance') extra.set('sort', state.sort);
    if (state.sort === 'shuffle') extra.set('seed', String(state.shuffleSeed));
    if (!state.onlineOnly) extra.set('online', '0');
    const s = extra.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  function makeFilters(): SearchFilters {
    return {
      country:   state.country || undefined,
      nature:    state.nature  || undefined,
      tags:      state.tags.length ? state.tags : undefined,
      languages: state.languages.length ? state.languages : undefined,
      sort:      state.sort,
      shuffleSeed: state.shuffleSeed,
      onlineOnly: state.onlineOnly,
    };
  }

  function loadNext(): void {
    if (loading || exhausted) return;
    loading = true;
    try {
      const r = searchStations(db, state.query, l, {
        ...makeFilters(),
        limit: PAGE,
        offset,
      });
      for (const row of r) list.appendChild(stationCard(row));
      offset += r.length;
      if (r.length < PAGE) exhausted = true;
    } finally {
      loading = false;
    }
  }

  function dismissChip(label: string, onClear: () => void): HTMLElement {
    const c = el('span', { class: 'dismiss-chip' });
    c.appendChild(document.createTextNode(label));
    const x = el('button', {
      class: 'dismiss-chip-x',
      attrs: { type: 'button', 'aria-label': t('search.clear') || 'Remove' },
      html: iconHtml('close', 12),
    });
    x.addEventListener('click', onClear);
    c.appendChild(x);
    return c;
  }

  function renderActiveChips(): void {
    activeChips.replaceChildren();
    for (const tagSlug of state.tags) {
      const chip = tagChip(tagSlug);
      const x = el('button', {
        class: 'dismiss-chip-x',
        attrs: { type: 'button', 'aria-label': t('search.clear') || 'Remove' },
        html: iconHtml('close', 12),
      });
      x.addEventListener('click', () => {
        state.tags = state.tags.filter((x) => x !== tagSlug);
        input.value = stateToInput(state);
        reset();
      });
      chip.appendChild(x);
      activeChips.appendChild(chip);
    }
    for (const lang of state.languages) {
      const isIso = /^[a-z]{2}$/.test(lang);
      const display = isIso ? (languageName(lang, l) || lang) : lang;
      activeChips.appendChild(dismissChip(display, () => {
        state.languages = state.languages.filter((x) => x !== lang);
        input.value = stateToInput(state);
        languageSelect.select.value = state.languages[0] ?? '';
        reset();
      }));
    }
  }

  function reset(): void {
    pushUrl();
    list.replaceChildren();
    offset = 0;
    exhausted = false;
    const total = countSearch(db, state.query, makeFilters());
    summary.textContent = total > 0
      ? t('search.count', { count: total.toLocaleString(l) })
      : (state.query || state.country || state.tags.length || state.languages.length || state.nature
          ? t('section.no_results')
          : t('search.empty'));
    renderActiveChips();
    loadNext();
    if (io) io.disconnect();
    io = new IntersectionObserver(
      (ents) => { for (const e of ents) if (e.isIntersecting) loadNext(); },
      { rootMargin: '0px 0px 800px 0px' },
    );
    io.observe(sentinel);
    clearBtn.style.display = input.value ? '' : 'none';
  }

  // Type-as-you-go: parse the input on each settle, merge structured tokens
  // into the filter state.
  let typingTimer: number | undefined;
  function applyInput() {
    const parsed = parseInput(input.value);
    state.query     = parsed.query;
    state.tags      = parsed.tags;
    state.languages = parsed.languages;
    if (parsed.country) {
      // Accept BCP-47 codes ("CA") or full names ("canada", "the netherlands")
      const cc = resolveCountryCode(db, parsed.country);
      state.country = cc ?? parsed.country.toUpperCase();
      countrySelect.select.value = state.country;
    }
    if (parsed.nature) { state.nature = parsed.nature; natureSelect.select.value = state.nature; }
    languageSelect.select.value = state.languages[0] ?? '';
    reset();
  }
  input.addEventListener('input', () => {
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(applyInput, 200);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      window.clearTimeout(typingTimer);
      applyInput();
    }
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    state.query = '';
    state.tags = [];
    state.languages = [];
    state.nature = '';
    state.country = '';
    countrySelect.select.value = '';
    natureSelect.select.value = '';
    languageSelect.select.value = '';
    reset();
    input.focus();
  });

  countrySelect.select.addEventListener('change', () => { state.country = countrySelect.select.value; reset(); });
  natureSelect.select.addEventListener('change',  () => { state.nature  = natureSelect.select.value;  reset(); });
  languageSelect.select.addEventListener('change', () => {
    const v = languageSelect.select.value;
    state.languages = v ? [v] : [];
    input.value = stateToInput(state);
    reset();
  });
  sortSelect.select.addEventListener('change', () => {
    state.sort = (sortSelect.select.value as SortKey) || 'relevance';
    shuffleBtn.setAttribute('aria-pressed', 'false');
    reset();
  });
  shuffleBtn.addEventListener('click', () => {
    state.sort = 'shuffle';
    state.shuffleSeed = newSeed();
    sortSelect.select.value = 'relevance';  // visually distinct from sort
    shuffleBtn.setAttribute('aria-pressed', 'true');
    reset();
    // Auto-play the top entry of the shuffled list. We re-query with limit
    // 1 using the exact filters the list just rendered with, so the played
    // station is guaranteed to match the first card the user sees.
    const top = searchStations(db, state.query, l, { ...makeFilters(), limit: 1, offset: 0 });
    if (top[0]) {
      const row = top[0];
      void play({
        uuid: row.uuid, name: row.name, favicon: row.favicon, url: row.url,
        shard: row.shard, countrycode: row.countrycode,
      });
    }
  });
  onlineCheck.addEventListener('change', () => { state.onlineOnly = onlineCheck.checked; reset(); });

  // Cross-component: topbar dispatches when typing in its input
  const onTopbarType = (e: Event) => {
    const q = (e as CustomEvent<{ q: string }>).detail.q;
    if (q !== input.value) {
      input.value = q;
      applyInput();
    }
  };
  window.addEventListener('tuneout:search-query', onTopbarType);

  mount.replaceChildren(root);
  reset();
}

// ─────────────────────────────────────────────────────────────────────────
function labelledSelect(labelKey: string): { root: HTMLElement; select: HTMLSelectElement } {
  const wrap = el('label', { class: 'search-select' });
  const select = el('select') as HTMLSelectElement;
  wrap.appendChild(select);
  // Visual label is the select's first option; the wrapper carries the
  // localized aria-label for screen readers.
  wrap.setAttribute('aria-label', t(labelKey));
  return { root: wrap, select };
}

function escape(s: string) {
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}
