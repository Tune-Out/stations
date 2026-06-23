import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { t } from '../i18n.js';
import { clearRecents, favorites, recents } from '../store.js';
import { getStation, openDb } from '../db.js';
import { stationCard } from '../components/station-card.js';
import type { StationRef, StationRow } from '../types.js';
import type { Route } from '../router.js';

/**
 * The Library page surfaces the user's Favorites and Recents as full-width,
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

  // The lists are rebuilt in place so the "Clear" action can refresh them
  // without a full navigation.
  const body = el('div');
  root.appendChild(body);

  const rebuild = (): void => {
    body.replaceChildren(
      // Favorites lead (the user's curated picks); Recents follow.
      collection(db, t('section.favorites'), favorites.get()),
      collection(db, t('section.recents'), recents.get(), {
        onClear: () => {
          if (!recents.get().length) return;
          if (confirm(t('settings.recents.clear_confirm'))) {
            clearRecents();
            rebuild();
          }
        },
      }),
    );
  };
  rebuild();

  mount.replaceChildren(root);
}

interface CollectionOpts {
  /** When set and the list is non-empty, renders a Clear button in the header. */
  onClear?: () => void;
}

function collection(
  db: Parameters<typeof getStation>[0],
  label: string,
  refs: StationRef[],
  opts: CollectionOpts = {},
): HTMLElement {
  const sec = el('section', { class: 'section' });

  const head = el('div', { class: 'section-head' });
  const h2 = el('h2', { class: 'h-section' });
  h2.append(label);
  if (refs.length) {
    h2.appendChild(el('span', { class: 'muted library-count', text: ` (${refs.length})` }));
  }
  head.appendChild(h2);
  if (opts.onClear && refs.length) {
    const clearBtn = el('button', { class: 'btn btn-ghost', attrs: { type: 'button' } });
    clearBtn.appendChild(iconEl('delete', 16));
    clearBtn.appendChild(el('span', { text: t('settings.recents.clear') }));
    clearBtn.addEventListener('click', opts.onClear);
    head.appendChild(clearBtn);
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
