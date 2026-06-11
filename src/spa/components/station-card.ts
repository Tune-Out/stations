import { el, flagEmoji } from '../dom.js';
import type { StationRow } from '../types.js';
import { localizedName } from '../types.js';
import { locale } from '../store.js';
import { url } from '../router.js';
import { play } from '../audio.js';
import { tagChip } from './tag-chip.js';

export function stationCard(row: StationRow, opts: { compact?: boolean } = {}): HTMLElement {
  const l = locale.get();
  const name = localizedName(row, l);
  const tagsArr = (row.tags_text || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3);

  const a = el('a', {
    class: `scard${opts.compact ? ' compact' : ''}`,
    attrs: { href: url('station', { uuid: row.uuid }) },
  });

  const art = el('div', {
    class: row.favicon ? 'scard-art' : 'scard-art no-art',
    attrs: { 'aria-hidden': 'true' },
  });
  const fb = el('span', { class: 'scard-art-fb', text: '📻' });
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

  // Quick-play button shortcut (click without leaving page)
  a.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    void play({
      uuid: row.uuid, name, favicon: row.favicon, url: row.url,
      shard: row.shard, countrycode: row.countrycode,
    });
  });

  return a;
}
