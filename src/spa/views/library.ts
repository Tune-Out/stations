import { el } from '../dom.js';
import { t } from '../i18n.js';
import { favorites, recents } from '../store.js';
import { getStation, openDb } from '../db.js';
import { stationCard } from '../components/station-card.js';
import type { StationRef, StationRow } from '../types.js';
import type { Route } from '../router.js';

/**
 * The Library page surfaces the user's Recents and Favorites as full-width,
 * scrollable lists. On desktop these also live in the sidebar; this page is
 * the only way to reach them in the narrow/mobile layout (where the sidebar is
 * hidden) and doubles as a deep-linkable "see all" target on every viewport.
 *
 * Both collections are persisted as lightweight `StationRef`s. We rehydrate
 * each one to a full `StationRow` via `getStation` so the cards render exactly
 * like Home/Search (localized name, tags, codec, currently-playing highlight).
 * Refs whose station has dropped out of the catalog fall back to a minimal row
 * built from the ref alone, so a saved station never silently disappears.
 */
export async function renderLibrary(_route: Route, mount: HTMLElement): Promise<void> {
  const db = await openDb();

  const root = el('div', { class: 'container library-view' });
  root.appendChild(el('h1', { class: 'h-display', text: t('nav.library') }));

  root.appendChild(collection(db, t('section.recents'), recents.get()));
  root.appendChild(collection(db, t('section.favorites'), favorites.get()));

  mount.replaceChildren(root);
}

function collection(
  db: Parameters<typeof getStation>[0],
  label: string,
  refs: StationRef[],
): HTMLElement {
  const sec = el('section', { class: 'section' });

  const head = el('h2', { class: 'h-section' });
  head.append(label);
  if (refs.length) {
    head.appendChild(el('span', { class: 'muted library-count', text: ` (${refs.length})` }));
  }
  sec.appendChild(head);

  if (!refs.length) {
    sec.appendChild(el('p', { class: 'muted', text: t('section.no_results') }));
    return sec;
  }

  const list = el('div', { class: 'results-list' });
  for (const ref of refs) {
    const row = getStation(db, ref.uuid) ?? pseudoRow(ref);
    list.appendChild(stationCard(row));
  }
  sec.appendChild(list);
  return sec;
}

/** Minimal row synthesized from a ref when its station isn't in the catalog. */
function pseudoRow(ref: StationRef): StationRow {
  return {
    uuid: ref.uuid,
    name: ref.name,
    favicon: ref.favicon,
    countrycode: ref.countrycode,
    country: '',
    url: ref.url,
    shard: ref.shard,
    tags_text: null,
  } as unknown as StationRow;
}
