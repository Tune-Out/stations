import { el, escapeHtml, flagEmoji } from '../dom.js';
import { iconEl } from '../icons.js';
import { t } from '../i18n.js';
import {
  current, effect, favorites, isFavorite, nowPlaying, playing, playerError,
  playerStatus, recents, toggleFavorite, volume,
} from '../store.js';
import { setVolume, togglePlay } from '../audio.js';
import { go, url } from '../router.js';

export function playerBar(): HTMLElement {
  const root = el('div', { class: 'player', attrs: { role: 'region', 'aria-label': 'Player' } });

  // Left: art + station + track
  const now = el('div', { class: 'player-now' });
  const art = el('div', { class: 'player-art' });
  const artFb = el('span', { class: 'player-art-fb', text: '📻' });
  art.appendChild(artFb);
  const artImg = el('img', { attrs: { alt: '' } });
  artImg.style.display = 'none';
  art.appendChild(artImg);
  now.appendChild(art);

  const txt = el('div', { class: 'player-text' });
  const stationEl = el('div', { class: 'player-station', text: t('player.no_station') });
  const trackEl = el('div', { class: 'player-track', attrs: { 'aria-live': 'polite' } });
  txt.appendChild(stationEl);
  txt.appendChild(trackEl);
  now.appendChild(txt);
  root.appendChild(now);

  // Center: controls
  const controls = el('div', { class: 'player-controls' });
  const btnPrev = el('button', { class: 'player-ctl', attrs: { 'aria-label': t('player.previous') } });
  btnPrev.appendChild(iconEl('skip_previous', 22));
  const btnPlay = el('button', { class: 'player-ctl player-ctl-primary', attrs: { 'aria-label': t('station.play') } });
  const iconPlay = iconEl('play_arrow', 26);
  const iconPause = iconEl('pause', 26);
  const spinner = el('span', { class: 'player-spinner', attrs: { 'aria-hidden': 'true' } });
  iconPause.style.display = 'none';
  spinner.style.display = 'none';
  btnPlay.appendChild(iconPlay);
  btnPlay.appendChild(iconPause);
  btnPlay.appendChild(spinner);
  const btnNext = el('button', { class: 'player-ctl', attrs: { 'aria-label': t('player.next') } });
  btnNext.appendChild(iconEl('skip_next', 22));

  controls.appendChild(btnPrev);
  controls.appendChild(btnPlay);
  controls.appendChild(btnNext);
  root.appendChild(controls);

  // Right: favorite + volume + open station link
  const right = el('div', { class: 'player-meta-right' });
  const btnFav = el('button', { class: 'player-fav', attrs: { 'aria-pressed': 'false', 'aria-label': t('station.favorite') } });
  const favIconOff = iconEl('favorite_border', 20);
  const favIconOn = iconEl('favorite', 20);
  favIconOn.style.display = 'none';
  btnFav.appendChild(favIconOff);
  btnFav.appendChild(favIconOn);
  const vol = el('div', { class: 'player-vol' });
  vol.appendChild(iconEl('volume_up', 18));
  const volInput = el('input', { attrs: { type: 'range', min: 0, max: 1, step: 0.01, value: String(volume.get()) } });
  vol.appendChild(volInput);
  const openStation = el('a', { class: 'muted', attrs: { href: '#' }, text: t('player.open_station') });

  right.appendChild(btnFav);
  right.appendChild(vol);
  right.appendChild(openStation);
  root.appendChild(right);

  // Hook up controls
  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', () => {
    const list = recents.get();
    const c = current.get();
    if (!c || list.length < 2) return;
    const idx = list.findIndex((r) => r.uuid === c.uuid);
    const next = list[(idx - 1 + list.length) % list.length];
    if (next) {
      import('../audio.js').then((m) => m.play(next));
      go(url('station', { uuid: next.uuid }));
    }
  });
  btnPrev.addEventListener('click', () => {
    const list = recents.get();
    const c = current.get();
    if (!c || list.length < 2) return;
    const idx = list.findIndex((r) => r.uuid === c.uuid);
    const prev = list[(idx + 1) % list.length];
    if (prev) {
      import('../audio.js').then((m) => m.play(prev));
      go(url('station', { uuid: prev.uuid }));
    }
  });
  btnFav.addEventListener('click', () => {
    const c = current.get();
    if (!c) return;
    toggleFavorite(c);
  });
  volInput.addEventListener('input', () => setVolume(parseFloat(volInput.value)));

  // Reactivity
  effect(() => {
    const c = current.get();
    if (c) {
      stationEl.textContent = c.name;
      const flag = flagEmoji(c.countrycode);
      openStation.setAttribute('href', url('station', { uuid: c.uuid }));
      openStation.style.display = '';
      if (c.favicon) {
        artImg.src = c.favicon;
        artImg.referrerPolicy = 'no-referrer';
        artImg.style.display = '';
      } else {
        artImg.style.display = 'none';
      }
      const fav = isFavorite(c.uuid);
      btnFav.setAttribute('aria-pressed', String(fav));
      favIconOff.style.display = fav ? 'none' : 'inline-flex';
      favIconOn.style.display = fav ? 'inline-flex' : 'none';
    } else {
      stationEl.textContent = t('player.no_station');
      trackEl.textContent = '';
      openStation.style.display = 'none';
      artImg.style.display = 'none';
      favIconOff.style.display = 'inline-flex';
      favIconOn.style.display = 'none';
    }
    favorites.get(); // re-evaluate fav state on changes
  });

  effect(() => {
    const np = nowPlaying.get();
    if (np.artist || np.title) {
      trackEl.innerHTML =
        (np.artist ? `<span class="artist">${escapeHtml(np.artist)}</span>` : '') +
        (np.artist && np.title ? `<span class="sep">—</span>` : '') +
        (np.title ? escapeHtml(np.title) : '');
    } else {
      trackEl.textContent = '';
    }
    if (np.artworkUrl) {
      artImg.src = np.artworkUrl;
      artImg.style.display = '';
    }
  });

  effect(() => {
    const s = playerStatus.get();
    const connecting = s === 'connecting';
    const p = playing.get();
    iconPlay.style.display = connecting || p ? 'none' : 'block';
    iconPause.style.display = !connecting && p ? 'block' : 'none';
    spinner.style.display = connecting ? 'inline-block' : 'none';
    btnPlay.toggleAttribute('disabled', connecting);
    btnPlay.setAttribute('aria-busy', String(connecting));
    btnPlay.setAttribute('aria-label', connecting ? t('player.connecting') : t('station.play'));
  });

  // Error pill replaces the now-playing track line when something blew up.
  effect(() => {
    const err = playerError.get();
    if (err) {
      trackEl.innerHTML =
        `<span class="player-err">${escapeHtml(t('player.error'))}: ${escapeHtml(err)}</span>`;
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.key === 'f') btnFav.click();
    if (e.key === 'n' || e.key === 'ArrowRight') btnNext.click();
    if (e.key === 'p' || e.key === 'ArrowLeft') btnPrev.click();
  });

  return root;
}
