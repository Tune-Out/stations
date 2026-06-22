import { el, flagEmoji } from '../dom.js';
import type { StationRow } from '../types.js';
import { localizedName, refFromRow } from '../types.js';
import { current, effect, locale, playerStatus, playing } from '../store.js';
import { url } from '../router.js';
import { play, togglePlay } from '../audio.js';
import { iconEl } from '../icons.js';
import { t } from '../i18n.js';
import { tagChip } from './tag-chip.js';

export function stationCard(row: StationRow, opts: { compact?: boolean } = {}): HTMLElement {
  ensureCardSync();

  const l = locale.get();
  const name = localizedName(row, l);
  const tagsArr = (row.tags_text || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3);

  const a = el('a', {
    class: `scard${opts.compact ? ' compact' : ''}`,
    // data-uuid lets the shared playback sync (ensureCardSync) find this card
    // and mark it active when its station is the one playing.
    attrs: { href: url('station', { uuid: row.uuid }), 'data-uuid': row.uuid },
  });

  // The art is NOT aria-hidden anymore: it now hosts the interactive quick-play
  // button, which must stay in the accessibility tree. The favicon img keeps
  // alt="" and the fallback glyph is hidden, so only the button is announced.
  const art = el('div', {
    class: row.favicon ? 'scard-art' : 'scard-art no-art',
  });
  const fb = el('span', { class: 'scard-art-fb', text: '📻', attrs: { 'aria-hidden': 'true' } });
  art.appendChild(fb);
  if (row.favicon) {
    const img = el('img', {
      attrs: {
        src: row.favicon,
        alt: '',
        loading: 'lazy',
        decoding: 'async',
        referrerpolicy: 'no-referrer',
      },
    });
    img.addEventListener('error', () => { art.classList.add('no-art'); img.remove(); });
    art.appendChild(img);
  }

  // ── Quick-play overlay ───────────────────────────────────────────────────
  // A circular play/pause control layered over the art. It's revealed on hover
  // (pointer devices) and shown permanently on touch and for the station that
  // is currently playing. Tapping it plays in place — no drill-in to the
  // detail page. The three icon slots (play / pause / spinner) are swapped via
  // CSS off the is-playing / is-connecting classes that the sync sets.
  const playBtn = el('button', {
    class: 'scard-play',
    attrs: { type: 'button', 'aria-label': t('station.play') },
  });
  playBtn.appendChild(el('span', { class: 'scard-play-i pi-play', children: [iconEl('play_arrow', 22)] }));
  playBtn.appendChild(el('span', { class: 'scard-play-i pi-pause', children: [iconEl('pause', 22)] }));
  playBtn.appendChild(el('span', { class: 'scard-play-i pi-spin', attrs: { 'aria-hidden': 'true' } }));
  art.appendChild(playBtn);

  const quickPlay = (): void => {
    const cur = current.get();
    if (cur?.uuid === row.uuid && playerStatus.get() !== 'error') {
      // Already the active station — toggle pause/resume rather than kicking
      // off a fresh connect (and a retry when we're sitting in an error state).
      togglePlay();
    } else {
      void play(refFromRow(row, l));
    }
  };

  playBtn.addEventListener('click', (e) => {
    // The button is nested inside the card's <a>; cancel the navigation the
    // click would otherwise trigger so playback happens in place.
    e.preventDefault();
    e.stopPropagation();
    quickPlay();
  });

  const body = el('div', { class: 'scard-body' });
  body.appendChild(el('div', { class: 'scard-title', text: name, attrs: { title: name } }));

  const metaParts: (Node | string)[] = [];
  const flag = flagEmoji(row.countrycode);
  if (flag) metaParts.push(el('span', { html: `${flag}` }));
  if (row.country) metaParts.push(el('span', { text: ' ' + row.country }));
  if (row.codec || row.bitrate) {
    metaParts.push(el('span', { class: 'dot', text: '·' }));
    if (row.bitrate) metaParts.push(el('span', { text: `${row.bitrate} kbps` }));
    if (row.codec) metaParts.push(el('span', { text: ' ' + row.codec }));
  }
  const meta = el('div', { class: 'scard-meta', children: metaParts });
  body.appendChild(meta);

  if (tagsArr.length) {
    const tagRow = el('div', { class: 'scard-tags' });
    for (const t of tagsArr) tagRow.appendChild(tagChip(t));
    body.appendChild(tagRow);
  }

  a.appendChild(art);
  a.appendChild(body);

  // Right-click anywhere on the card is a power-user quick-play shortcut.
  a.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    quickPlay();
  });

  // Snapshot the current playback state for cards that are born while a station
  // is already playing (e.g. appended by the rails / infinite-scroll search
  // after playback started). Live transitions are handled by the sync effect.
  const cur = current.get();
  if (cur?.uuid === row.uuid) {
    const connecting = playerStatus.get() === 'connecting';
    paintCard(a, true, playing.get() && !connecting, connecting);
  }

  return a;
}

/** Apply the active/playing/connecting state classes + ARIA to one card. */
function paintCard(card: HTMLElement, active: boolean, isPlaying: boolean, connecting: boolean): void {
  card.classList.toggle('is-active', active);
  card.classList.toggle('is-playing', isPlaying);
  card.classList.toggle('is-connecting', connecting);
  const btn = card.querySelector('.scard-play');
  if (btn) {
    btn.setAttribute('aria-label', isPlaying ? t('station.pause') : t('station.play'));
    btn.setAttribute('aria-pressed', String(isPlaying));
    btn.setAttribute('aria-busy', String(connecting));
  }
}

let cardSyncInstalled = false;

/**
 * Reflect the global playback state onto every station card in the DOM.
 *
 * Installed once (idempotent), this single effect re-runs whenever the current
 * station, playback flag, or status changes, and repaints the matching cards.
 * A shared effect — rather than one subscription per card — is deliberate:
 * cards are created and discarded in bulk by the rails and the infinite-scroll
 * search results, so per-card effects would pile up dead entries in the
 * signals' subscriber sets. Each run first wipes the state from whatever cards
 * still carry it, so it's robust against cards that came and went between runs.
 */
function ensureCardSync(): void {
  if (cardSyncInstalled) return;
  cardSyncInstalled = true;
  effect(() => {
    const cur = current.get();
    const status = playerStatus.get();
    const isPlaying = playing.get();

    document
      .querySelectorAll<HTMLElement>('.scard.is-active, .scard.is-playing, .scard.is-connecting')
      .forEach((c) => paintCard(c, false, false, false));

    if (!cur) return;
    const connecting = status === 'connecting';
    const playingNow = isPlaying && !connecting;
    const sel = `.scard[data-uuid="${cur.uuid.replace(/["\\]/g, '\\$&')}"]`;
    document
      .querySelectorAll<HTMLElement>(sel)
      .forEach((c) => paintCard(c, true, playingNow, connecting));
  });
}
