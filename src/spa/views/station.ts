import { el, escapeHtml, flagEmoji } from '../dom.js';
import { t, countryName } from '../i18n.js';
import { tagChip } from '../components/tag-chip.js';
import { current, effect, locale, playerError, playerStatus } from '../store.js';
import { openDb, getStation } from '../db.js';
import { localizedDesc, localizedName, refFromRow } from '../types.js';
import { editOnGithubUrl, prTemplateUrl } from '../shard.js';
import { play, togglePlay } from '../audio.js';
import { iconEl } from '../icons.js';
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
  // Always start with `no-art` so the radio emoji is visible during the
  // favicon's loading state; we remove it on `load` and leave it on
  // `error`. The CSS hides .station-art-fb whenever `.no-art` is absent,
  // so the placeholder never sits on top of a successfully-loaded icon.
  const art = el('div', { class: 'station-art no-art' });
  art.appendChild(el('span', { class: 'station-art-fb', text: '📻' }));
  if (row.favicon) {
    const img = el('img', { attrs: { src: row.favicon, alt: '', referrerpolicy: 'no-referrer' } });
    img.addEventListener('load',  () => art.classList.remove('no-art'));
    img.addEventListener('error', () => { /* keep no-art */ img.remove(); });
    art.appendChild(img);
  }
  // View Transitions: pair the hero's art + title with the originating
  // station-card so the click navigation morphs them between positions
  // and sizes. The router sets the same names on the source card just
  // before the transition starts — see src/spa/router.ts.
  art.style.viewTransitionName = `station-art-${row.uuid}`;
  hero.appendChild(art);

  const text = el('div');
  const overline = el('p', { class: 'station-overline' });
  const flag = flagEmoji(row.countrycode);
  overline.innerHTML = `<span>${flag}</span><span>${escapeHtml(cn || '—')}</span>${row.state ? `<span style="opacity:.5">·</span><span>${escapeHtml(row.state)}</span>` : ''}`;
  text.appendChild(overline);
  const nameEl = el('h1', { class: 'station-name', text: name });
  nameEl.style.viewTransitionName = `station-title-${row.uuid}`;
  text.appendChild(nameEl);

  // Optional summary/description
  const sum = localizedDesc(row, l);
  if (sum) text.appendChild(el('p', { class: 'lede', text: sum }));

  const actions = el('div', { class: 'station-actions' });
  // One button per stream variant. Single-stream stations get a plain
  // "Play" button; multi-stream stations get one button per codec/bitrate
  // (e.g. "320k MP3", "128k AAC", "HLS AAC"). Buttons are FIXED-WIDTH —
  // we never mutate label text on state change. Instead, a leading
  // icon (▶ / spinner / ⏸) plus an `is-active` class indicate which
  // stream is currently playing.
  const streams = row.streams && row.streams.length
    ? row.streams
    : [{ url: row.url ?? '', codec: row.codec ?? undefined, bitrate: row.bitrate ?? undefined, hls: !!row.hls }];

  /** Format-only label: "320k MP3", "HLS AAC", or fall back to t('station.play'). */
  function buildLabel(s: { codec?: string; bitrate?: number; hls?: boolean; label?: string }): string {
    if (s.label) return s.label;
    const parts: string[] = [];
    if (s.hls) parts.push('HLS');
    if (s.bitrate && s.bitrate > 0) parts.push(`${s.bitrate}k`);
    if (s.codec) parts.push(s.codec);
    return parts.length ? parts.join(' ') : t('station.play');
  }

  streams.forEach((stream, i) => {
    if (!stream.url) return;
    const isPrimary = i === 0;
    const btn = el('button', {
      class: `btn ${isPrimary ? 'btn-primary' : 'btn-ghost'} station-play`,
    });
    // Icon slot — swaps between play_arrow, pause, and a CSS-only spinner.
    // It's a wrapper so we can replace innerHTML without re-laying-out the
    // button (the slot keeps a stable 18×18 footprint).
    const iconSlot = el('span', { class: 'station-play-icon', attrs: { 'aria-hidden': 'true' } });
    iconSlot.appendChild(iconEl('play_arrow', 18));
    const playLabel = el('span', { class: 'station-play-label', text: buildLabel(stream) });
    btn.appendChild(iconSlot);
    btn.appendChild(playLabel);

    btn.addEventListener('click', () => {
      if (btn.hasAttribute('disabled')) return;
      const cur = current.get();
      const isCurrent = cur?.uuid === row.uuid && cur?.url === stream.url;
      if (isCurrent) {
        // Already this exact stream — toggle pause/resume so the icon swap
        // is reversible without retriggering the connect handshake.
        togglePlay();
      } else {
        const ref = refFromRow(row, l);
        play({ ...ref, url: stream.url });
      }
    });

    // React to global player status — but only mark *this* button as
    // active when both the station AND this exact stream URL match.
    // We swap the iconSlot's children rather than mutating any text node,
    // so the button's width stays constant across every state transition.
    effect(() => {
      const s = playerStatus.get();
      const cur = current.get();
      const isCurrent = cur?.uuid === row.uuid && cur?.url === stream.url;
      const connecting = isCurrent && s === 'connecting';
      const playing    = isCurrent && s === 'playing';
      btn.classList.toggle('is-active', isCurrent && (connecting || playing));
      btn.classList.toggle('is-playing', playing);
      btn.classList.toggle('is-connecting', connecting);
      btn.setAttribute('aria-pressed', String(playing));
      btn.setAttribute('aria-busy', String(connecting));
      // Note: NOT toggling `disabled` — keeping the button clickable lets
      // users mash to retry/cancel without the geometry shifting.
      iconSlot.replaceChildren(
        connecting
          ? el('span', { class: 'btn-spinner station-play-spinner' })
          : playing
          ? iconEl('pause', 18)
          : iconEl('play_arrow', 18),
      );
    });
    actions.appendChild(btn);
  });

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

  // Background panel — surfaces the editorial research block.
  //
  // Layout: full-width (.panel-wide spans the whole station-grid) and split
  // internally into two columns at wider viewports:
  //   • Left — short metadata (Nature, Operator, Affiliations, Audience,
  //     Format) as a label/value list.
  //   • Right — long-form prose (Notes, Sources) where the line length is
  //     capped at ~65ch for readability.
  //
  // At narrow widths the two columns stack. URL-bearing values get
  // `overflow-wrap: anywhere` via CSS so long source URLs can't overflow.
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
    const p = el('article', { class: 'panel panel-wide background-panel' });
    p.appendChild(el('h2', { text: t('station.background') }));

    const bg = el('div', { class: 'bg-grid' });

    // ── Left column: short metadata as a key/value list ──
    const dl = el('dl', { class: 'kv bg-kv' });
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
    if (dl.children.length) bg.appendChild(dl);

    // ── Right column: long-form prose ──
    const prose = el('div', { class: 'bg-prose' });
    function addProseHeading(key: string): HTMLElement {
      const h = el('h3', { class: 'bg-prose-label', text: key });
      prose.appendChild(h);
      return h;
    }
    if (r.notes) {
      addProseHeading(t('station.notes'));
      prose.appendChild(el('p', { class: 'bg-prose-body', text: r.notes }));
    }
    if (r.sources) {
      addProseHeading(t('station.sources'));
      // Comma-separated source list; linkify URL-shaped entries. Each entry
      // is its own pill so wrapping is clean and a long URL never pushes
      // anything offscreen.
      const list = el('ul', { class: 'bg-sources' });
      const parts = String(r.sources).split(/,\s*/).filter(Boolean);
      for (const src of parts) {
        const li = el('li');
        const isUrl = /^https?:\/\//.test(src);
        if (isUrl) {
          li.appendChild(el('a', {
            class: 'bg-source-link',
            attrs: { href: src, rel: 'external noreferrer', target: '_blank', 'data-external': 'true' },
            text: src,
          }));
        } else {
          li.textContent = src;
        }
        list.appendChild(li);
      }
      prose.appendChild(list);
    }
    if (prose.children.length) bg.appendChild(prose);

    p.appendChild(bg);
    grid.appendChild(p);
  }

  root.appendChild(grid);

  // Suggest an update. Two affordances:
  //   • "Edit on GitHub" — opens the YAML in the web editor. After commit,
  //     GitHub auto-loads .github/pull_request_template.md into the PR.
  //   • "Update template" — opens the template directly so contributors can
  //     read the questions BEFORE editing (authorization, sources, etc.).
  const tools = el('div', { class: 'station-actions' });
  tools.style.marginBlockStart = '1.75rem';
  tools.appendChild(el('a', {
    class: 'btn btn-ghost',
    attrs: { href: editOnGithubUrl(row.uuid, row.shard), rel: 'external noreferrer', target: '_blank', 'data-external': 'true' },
    text: t('station.edit_on_github') + ' ↗',
  }));
  tools.appendChild(el('a', {
    class: 'btn btn-ghost',
    attrs: { href: prTemplateUrl(), rel: 'external noreferrer', target: '_blank', 'data-external': 'true' },
    text: t('station.update_template') + ' ↗',
  }));
  root.appendChild(tools);

  mount.replaceChildren(root);
}
