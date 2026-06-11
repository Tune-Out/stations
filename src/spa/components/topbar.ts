import { el } from '../dom.js';
import { iconEl, iconHtml } from '../icons.js';
import { t } from '../i18n.js';
import { effect, locale } from '../store.js';
import { url, go, parseLocation } from '../router.js';
import { localeMenu } from './locale-menu.js';
import { themePicker } from './theme-picker.js';
import { repoUrl } from '../shard.js';

const LOGO_SVG = `
  <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
    <defs><linearGradient id="tb-lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="0.55" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1e3a8a"/>
    </linearGradient></defs>
    <rect width="32" height="32" rx="7" fill="url(#tb-lg)"/>
    <g fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round">
      <path d="M 14.5 6.5 A 9.5 9.5 0 1 0 17.5 6.5"/>
    </g>
    <circle cx="16" cy="16" r="2.4" fill="#ffffff"/>
  </svg>`;

export function topbar(): HTMLElement {
  const root = el('header', { class: 'topbar' });

  // Brand
  const brandLink = el('a', {
    class: 'topbar-brand',
    attrs: { href: url('home') },
    html: `<span class="topbar-brand-mark">${LOGO_SVG}</span>
           <span class="topbar-brand-text">Tune Out</span>`,
  });
  root.appendChild(brandLink);

  // Search box (debounced; commits to /search on Enter or after pause)
  const form = el('form', { class: 'topbar-search', attrs: { role: 'search', action: url('search') } });
  form.appendChild(iconEl('search', 18));
  const input = el('input', {
    attrs: {
      type: 'search', name: 'q', autocomplete: 'off', autocapitalize: 'off',
      spellcheck: false, placeholder: t('search.placeholder.global'),
    },
  });
  form.appendChild(input);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    go(url('search', { query: q }));
  });
  // Type-as-you-go: jump to /search and let it debounce its own input.
  let typingTimer: number | undefined;
  input.addEventListener('input', () => {
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
      const q = input.value.trim();
      const here = parseLocation();
      if (here.view !== 'search') {
        // Only navigate when user has typed >=2 chars
        if (q.length >= 2) go(url('search', { query: q }));
      } else {
        // Already on search — sync the URL
        const next = url('search', { query: q });
        history.replaceState(null, '', next);
        // Notify the search view via input event bubbling (it listens on its own field).
        window.dispatchEvent(new CustomEvent('tuneout:search-query', { detail: { q } }));
      }
    }, 240);
  });

  root.appendChild(form);

  // Right side: theme picker + locale menu + github link
  const right = el('div', { class: 'topbar-right' });
  right.appendChild(themePicker());
  right.appendChild(localeMenu());
  const ghLink = el('a', {
    class: 'topbar-icon-link',
    attrs: { href: repoUrl(), rel: 'external', target: '_blank', 'aria-label': 'GitHub repository', 'data-external': 'true' },
    html: iconHtml('github', 20),
  });
  right.appendChild(ghLink);
  root.appendChild(right);

  // Keep the search placeholder localized when locale changes
  effect(() => {
    locale.get(); // dep
    input.placeholder = t('search.placeholder.global');
  });

  return root;
}
