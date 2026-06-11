import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { stationCard } from './station-card.js';
import type { StationRow } from '../types.js';

const PAGE_DEFAULT = 30;
const CARD_WIDTH = 280;
const GAP = 12;

export interface RailOptions {
  /** Section title (already localized). */
  title: string;
  /** Optional kicker / subtitle above the title. */
  kicker?: string;
  /** Link rendered on the right of the title (e.g. "See all →"). */
  more?: { href: string; label: string };
  /** Synchronous SQLite-backed loader. */
  load(offset: number, limit: number): StationRow[];
  /** Total expected count, when known. Used to stop loading once exhausted. */
  total?: number;
  pageSize?: number;
}

export function rail(opts: RailOptions): HTMLElement {
  const root = el('section', { class: 'rail' });

  // Header row
  const head = el('header', { class: 'rail-head' });
  const title = el('div');
  if (opts.kicker) title.appendChild(el('p', { class: 'rail-kicker', text: opts.kicker }));
  title.appendChild(el('h2', { class: 'h-section', text: opts.title }));
  head.appendChild(title);

  const actions = el('div', { class: 'rail-actions' });
  if (opts.more) {
    actions.appendChild(el('a', { class: 'rail-more', attrs: { href: opts.more.href }, text: opts.more.label }));
  }
  const btnLeft = el('button', {
    class: 'rail-nav rail-nav-prev',
    attrs: { type: 'button', 'aria-label': 'Scroll left' },
  });
  btnLeft.appendChild(iconEl('skip_previous', 18));
  const btnRight = el('button', {
    class: 'rail-nav rail-nav-next',
    attrs: { type: 'button', 'aria-label': 'Scroll right' },
  });
  btnRight.appendChild(iconEl('skip_next', 18));
  actions.appendChild(btnLeft);
  actions.appendChild(btnRight);
  head.appendChild(actions);
  root.appendChild(head);

  // Scroller
  const scroller = el('div', { class: 'rail-scroller', attrs: { tabindex: '0' } });
  const track = el('div', { class: 'rail-track' });
  scroller.appendChild(track);
  root.appendChild(scroller);

  // Pagination state
  const pageSize = opts.pageSize ?? PAGE_DEFAULT;
  let loaded = 0;
  let exhausted = false;
  let loading = false;

  const sentinel = el('div', { class: 'rail-sentinel', attrs: { 'aria-hidden': 'true' } });
  track.appendChild(sentinel);

  function appendBatch(rows: StationRow[]): void {
    for (const r of rows) {
      const card = stationCard(r);
      card.classList.add('rail-card');
      track.insertBefore(card, sentinel);
    }
    loaded += rows.length;
    if (rows.length < pageSize) exhausted = true;
    if (opts.total != null && loaded >= opts.total) exhausted = true;
    updateNavState();
  }

  function loadMore(): void {
    if (loading || exhausted) return;
    loading = true;
    try {
      const rows = opts.load(loaded, pageSize);
      appendBatch(rows);
    } finally {
      loading = false;
    }
  }

  // Initial paint
  loadMore();
  if (loaded === 0) {
    // Empty rail — hide entirely. Caller can adjust by checking later.
    root.classList.add('rail-empty');
    root.style.display = 'none';
    return root;
  }

  // Observe sentinel for lazy load. Use the scroller as root so we trigger
  // on horizontal scroll into the right edge.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) loadMore();
      }
    },
    { root: scroller, rootMargin: '0px 600px 0px 0px' },
  );
  io.observe(sentinel);

  // Nav buttons: scroll by ~3 cards each click.
  function scrollByCards(n: number): void {
    scroller.scrollBy({ left: n * (CARD_WIDTH + GAP), behavior: 'smooth' });
  }
  btnLeft.addEventListener('click', () => scrollByCards(-3));
  btnRight.addEventListener('click', () => scrollByCards(3));

  function updateNavState(): void {
    const max = scroller.scrollWidth - scroller.clientWidth;
    btnLeft.toggleAttribute('disabled', scroller.scrollLeft <= 4);
    btnRight.toggleAttribute('disabled', scroller.scrollLeft >= max - 4 && exhausted);
  }
  scroller.addEventListener('scroll', updateNavState, { passive: true });
  requestAnimationFrame(updateNavState);

  // NOTE: previously we trapped vertical wheel events to translate them into
  // horizontal rail scrolling. That ate the page's vertical scroll — when the
  // pointer was over a rail the whole page felt "stuck". Trackpads already
  // emit horizontal deltaX natively, so users on those scroll the rail
  // horizontally without help; mouse users have the ◀ ▶ nav buttons. We let
  // the wheel pass through to the page now.

  return root;
}
