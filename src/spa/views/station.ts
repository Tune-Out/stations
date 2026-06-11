import { el, escapeHtml, flagEmoji } from '../dom.js';
import { t, countryName } from '../i18n.js';
import { tagChip } from '../components/tag-chip.js';
import { current, effect, locale, playerError, playerStatus } from '../store.js';
import { openDb, getStation } from '../db.js';
import { localizedDesc, localizedName, refFromRow } from '../types.js';
import { editOnGithubUrl } from '../shard.js';
import { play } from '../audio.js';
import { url } from '../router.js';
import type { Route } from '../router.js';

export async function renderStation(route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const db = await openDb();
  const uuid = route.params.uuid ?? '';
  const row = uuid ? getStation(db, uuid) : undefined;

  const root = el('div', { class: 'container' });

  if (!row) {
    root.appendChild(el('p', { class: 'kicker', text: '404' }));
    root.appendChild(el('h1', { class: 'h-display', text: t('error.title') }));
    root.appendChild(el('p', { class: 'muted', text: 'No station with that ID.' }));
    mount.replaceChildren(root);
    return;
  }

  const name = localizedName(row, l);
  const desc = localizedDesc(row, l);
  const tags = (row.tags_text ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const langs = (row.langs_text ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const cn = row.country || (row.countrycode ? countryName(row.countrycode, l) : '');

  // Hero
  const hero = el('section', { class: 'station-hero' });
  const art = el('div', { class: row.favicon ? 'station-art' : 'station-art no-art' });
  art.appendChild(el('span', { class: 'station-art-fb', text: '📻' }));
  if (row.favicon) {
    const img = el('img', { attrs: { src: row.favicon, alt: '', referrerpolicy: 'no-referrer' } });
    img.addEventListener('error', () => { art.classList.add('no-art'); img.remove(); });
    art.appendChild(img);
  }
  hero.appendChild(art);

  const text = el('div');
  const overline = el('p', { class: 'station-overline' });
  const flag = flagEmoji(row.countrycode);
  overline.innerHTML = `<span>${flag}</span><span>${escapeHtml(cn || '—')}</span>${row.state ? `<span style="opacity:.5">·</span><span>${escapeHtml(row.state)}</span>` : ''}`;
  text.appendChild(overline);
  text.appendChild(el('h1', { class: 'station-name', text: name }));

  // Optional summary/description
  const sum = localizedDesc(row, l);
  if (sum) text.appendChild(el('p', { class: 'lede', text: sum }));

  const actions = el('div', { class: 'station-actions' });
  const playBtn = el('button', { class: 'btn btn-primary station-play' });
  const playLabel = el('span', { class: 'station-play-label', text: t('station.play') });
  const playSpinner = el('span', { class: 'btn-spinner', attrs: { 'aria-hidden': 'true' } });
  playSpinner.style.display = 'none';
  playBtn.appendChild(playSpinner);
  playBtn.appendChild(playLabel);
  playBtn.addEventListener('click', () => {
    if (playBtn.hasAttribute('disabled')) return;
    play(refFromRow(row, l));
  });
  // React to the global player status — show spinner + disable while
  // connecting, but only when *this* row is the currently-active station.
  // Otherwise the spinner would show on every station page whenever any
  // other station is connecting.
  effect(() => {
    const s = playerStatus.get();
    const cur = current.get();
    const isCurrent = cur?.uuid === row.uuid;
    const connecting = isCurrent && s === 'connecting';
    playSpinner.style.display = connecting ? 'inline-block' : 'none';
    playBtn.toggleAttribute('disabled', connecting);
    playBtn.setAttribute('aria-busy', String(connecting));
    if (isCurrent && s === 'playing') playLabel.textContent = t('station.pause');
    else if (connecting)              playLabel.textContent = t('player.connecting');
    else                              playLabel.textContent = t('station.play');
  });
  actions.appendChild(playBtn);

  // Error message lives next to the actions row — but only for *this* row.
  const errBox = el('p', { class: 'station-error', attrs: { role: 'status' } });
  errBox.style.display = 'none';
  effect(() => {
    const err = playerError.get();
    const cur = current.get();
    if (err && cur?.uuid === row.uuid) {
      errBox.style.display = '';
      errBox.textContent = t('player.error') + ': ' + err;
    } else {
      errBox.style.display = 'none';
    }
  });

  if (row.homepage) {
    actions.appendChild(el('a', {
      class: 'btn btn-ghost',
      attrs: { href: row.homepage, rel: 'external', target: '_blank', 'data-external': 'true' },
      text: t('station.visit_homepage') + ' ↗',
    }));
  }
  text.appendChild(actions);
  text.appendChild(errBox);
  hero.appendChild(text);
  root.appendChild(hero);

  // Panels
  const grid = el('div', { class: 'station-grid' });

  // Tags
  {
    const p = el('article', { class: 'panel' });
    p.appendChild(el('h2', { text: t('station.tags') }));
    if (tags.length) {
      const row2 = el('div', { class: 'chip-cloud' });
      for (const tag of tags) row2.appendChild(tagChip(tag, { href: url('search', { tag }) }));
      p.appendChild(row2);
    } else {
      p.appendChild(el('p', { class: 'muted', text: '—' }));
    }
    grid.appendChild(p);
  }

  // Stream tech
  {
    const p = el('article', { class: 'panel' });
    p.appendChild(el('h2', { text: t('station.codec') }));
    const dl = el('dl', { class: 'kv' });
    function add(k: string, v: string | Node) {
      dl.appendChild(el('dt', { text: k }));
      const dd = el('dd');
      if (typeof v === 'string') dd.textContent = v;
      else dd.appendChild(v);
      dl.appendChild(dd);
    }
    if (row.codec) add(t('station.codec'), row.codec);
    if (row.bitrate) add(t('station.bitrate'), t('station.bitrate_kbps', { n: row.bitrate }));
    add('HLS', row.hls ? 'Yes' : 'No');
    const pill = el('span', { class: `pill ${row.lastcheckok ? 'ok' : 'down'}`, text: row.lastcheckok ? t('station.online') : t('station.offline') });
    dl.appendChild(el('dt', { text: t('station.online') })); dl.appendChild(el('dd', { children: [pill] }));
    if (row.votes) add(t('station.votes'), row.votes.toLocaleString(l));

    if (row.url) {
      const details = el('details');
      details.appendChild(el('summary', { text: t('station.show_url') }));
      details.appendChild(el('code', { text: row.url }));
      add(t('station.stream_url'), details);
    }
    p.appendChild(dl);
    grid.appendChild(p);
  }

  if (langs.length) {
    const p = el('article', { class: 'panel' });
    p.appendChild(el('h2', { text: t('station.language') }));
    const row2 = el('div', { class: 'chip-cloud' });
    for (const lang of langs) {
      row2.appendChild(el('a', { class: 'chip chip-link', attrs: { href: url('search', { language: lang }) }, text: lang }));
    }
    p.appendChild(row2);
    grid.appendChild(p);
  }

  if (row.geo_lat !== null && row.geo_long !== null) {
    const p = el('article', { class: 'panel' });
    p.appendChild(el('h2', { text: t('station.location') }));
    p.appendChild(el('p', { class: 'muted', text: `${row.geo_lat?.toFixed(3)}, ${row.geo_long?.toFixed(3)}` }));
    p.appendChild(el('a', {
      attrs: { href: `https://www.openstreetmap.org/?mlat=${row.geo_lat}&mlon=${row.geo_long}&zoom=8`, rel: 'external', target: '_blank', 'data-external': 'true' },
      text: t('station.open_in_map') + ' ↗',
    }));
    grid.appendChild(p);
  }

  // Background panel — surfaces the editorial research block. Each field is
  // optional; we skip empties. nature is rendered as a search-link chip so
  // users can pivot to "all public broadcasters" or similar.
  const r = {
    nature:       row.r_nature,
    operator:     row.r_operator,
    affiliations: row.r_affiliations,
    audience:     row.r_audience,
    format:       row.r_format,
    notes:        row.r_notes,
    sources:      row.r_sources,
  };
  if (Object.values(r).some((v) => v && String(v).trim())) {
    const p = el('article', { class: 'panel panel-wide' });
    p.appendChild(el('h2', { text: t('station.background') }));
    const dl = el('dl', { class: 'kv' });
    function addKv(key: string, node: Node | string): void {
      dl.appendChild(el('dt', { text: key }));
      const dd = el('dd');
      if (typeof node === 'string') dd.textContent = node;
      else dd.appendChild(node);
      dl.appendChild(dd);
    }
    if (r.nature) {
      const chip = el('a', {
        class: 'chip chip-link',
        attrs: { href: url('search', { nature: r.nature }) },
        text: r.nature,
      });
      addKv(t('station.nature'), chip);
    }
    if (r.operator)     addKv(t('station.operator'),     r.operator);
    if (r.affiliations) addKv(t('station.affiliations'), r.affiliations);
    if (r.audience)     addKv(t('station.audience'),     r.audience);
    if (r.format)       addKv(t('station.format'),       r.format);
    if (r.notes)        addKv(t('station.notes'),        r.notes);
    if (r.sources) {
      // Comma-separated source list; linkify any URL-shaped sources.
      const wrap = el('span');
      const parts = String(r.sources).split(/,\s*/).filter(Boolean);
      parts.forEach((src, i) => {
        if (i > 0) wrap.appendChild(document.createTextNode(', '));
        const isUrl = /^https?:\/\//.test(src);
        if (isUrl) {
          wrap.appendChild(el('a', {
            attrs: { href: src, rel: 'external', target: '_blank', 'data-external': 'true' },
            text: src,
          }));
        } else {
          wrap.appendChild(document.createTextNode(src));
        }
      });
      addKv(t('station.sources'), wrap);
    }
    p.appendChild(dl);
    grid.appendChild(p);
  }

  root.appendChild(grid);

  // Edit on GitHub
  const tools = el('div', { class: 'station-actions' });
  tools.style.marginBlockStart = '1.75rem';
  tools.appendChild(el('a', {
    class: 'btn btn-ghost',
    attrs: { href: editOnGithubUrl(row.uuid, row.shard), rel: 'external', target: '_blank', 'data-external': 'true' },
    text: t('station.edit_on_github') + ' ↗',
  }));
  root.appendChild(tools);

  mount.replaceChildren(root);
}
