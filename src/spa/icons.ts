/**
 * Icon registry.
 *
 * All UI icons are Google Material Symbols (Rounded), downloaded as SVG into
 * `src/spa/icons/svg/` and bundled at build time via Vite's `?raw` import.
 * Nothing is fetched from a CDN at runtime.
 *
 * The site's GitHub icon is the only exception — Material Symbols doesn't ship
 * a GitHub mark, so it lives inline as a tested path string.
 */

import check from './icons/svg/check.svg?raw';
import close from './icons/svg/close.svg?raw';
import contrast from './icons/svg/contrast.svg?raw';
import darkMode from './icons/svg/dark_mode.svg?raw';
import del from './icons/svg/delete.svg?raw';
import download from './icons/svg/download.svg?raw';
import edit from './icons/svg/edit.svg?raw';
import expandMore from './icons/svg/expand_more.svg?raw';
import explore from './icons/svg/explore.svg?raw';
import favorite from './icons/svg/favorite.svg?raw';
import favoriteBorder from './icons/svg/favorite_border.svg?raw';
import help from './icons/svg/help.svg?raw';
import home from './icons/svg/home.svg?raw';
import info from './icons/svg/info.svg?raw';
import installMobile from './icons/svg/install_mobile.svg?raw';
import iosShare from './icons/svg/ios_share.svg?raw';
import language from './icons/svg/language.svg?raw';
import lightMode from './icons/svg/light_mode.svg?raw';
import moreVert from './icons/svg/more_vert.svg?raw';
import openInNew from './icons/svg/open_in_new.svg?raw';
import pause from './icons/svg/pause.svg?raw';
import place from './icons/svg/place.svg?raw';
import playArrow from './icons/svg/play_arrow.svg?raw';
import radio from './icons/svg/radio.svg?raw';
import search from './icons/svg/search.svg?raw';
import settings from './icons/svg/settings.svg?raw';
import shuffle from './icons/svg/shuffle.svg?raw';
import skipNext from './icons/svg/skip_next.svg?raw';
import sort from './icons/svg/sort.svg?raw';
import skipPrevious from './icons/svg/skip_previous.svg?raw';
import tag from './icons/svg/tag.svg?raw';
import volumeUp from './icons/svg/volume_up.svg?raw';

const GITHUB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 2a10 10 0 0 0-3.16 19.5c.5.1.7-.22.7-.5v-1.7c-2.78.6-3.36-1.34-3.36-1.34-.46-1.17-1.12-1.48-1.12-1.48-.91-.62.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.9 1.54 2.36 1.1 2.94.84.1-.66.36-1.1.65-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03A9.5 9.5 0 0 1 12 6.84c.85 0 1.7.11 2.5.33 1.9-1.3 2.74-1.03 2.74-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.69 0 3.84-2.34 4.69-4.57 4.93.37.32.7.95.7 1.91v2.83c0 .28.18.6.7.5A10 10 0 0 0 12 2z"/></svg>`;

export type IconName =
  | 'check' | 'close' | 'contrast' | 'dark_mode' | 'delete' | 'download' | 'edit'
  | 'expand_more' | 'explore' | 'favorite' | 'favorite_border' | 'github'
  | 'help' | 'home' | 'info' | 'install_mobile' | 'ios_share' | 'language'
  | 'light_mode' | 'more_vert' | 'open_in_new' | 'pause' | 'place'
  | 'play_arrow' | 'radio' | 'search' | 'settings' | 'shuffle' | 'skip_next'
  | 'skip_previous' | 'sort' | 'tag' | 'volume_up';

const SVGS: Record<IconName, string> = {
  check, close, contrast, dark_mode: darkMode, delete: del, download, edit,
  expand_more: expandMore, explore, favorite, favorite_border: favoriteBorder,
  github: GITHUB_SVG, help, home, info,
  install_mobile: installMobile, ios_share: iosShare,
  language, light_mode: lightMode,
  more_vert: moreVert, open_in_new: openInNew, pause, place,
  play_arrow: playArrow, radio, search, settings, shuffle, skip_next: skipNext,
  skip_previous: skipPrevious, sort, tag, volume_up: volumeUp,
};

/**
 * Return SVG markup with size + currentColor applied. Use for `innerHTML`.
 */
export function iconHtml(name: IconName, size = 18): string {
  const raw = SVGS[name];
  if (!raw) return '';
  return raw
    .replace(/width="\d+"/g, `width="${size}"`)
    .replace(/height="\d+"/g, `height="${size}"`)
    .replace(/<svg(?![^>]*\bfill=)/, `<svg fill="currentColor"`);
}

/**
 * Return an HTMLSpanElement wrapping the SVG. Convenient for appendChild.
 */
export function iconEl(name: IconName, size = 18): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.justifyContent = 'center';
  span.innerHTML = iconHtml(name, size);
  return span;
}
