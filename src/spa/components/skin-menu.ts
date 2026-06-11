import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { effect, skin, locale } from '../store.js';
import { loadThemes, type ThemeMeta } from '../theme.js';
import { t } from '../i18n.js';

let openInstance: { close(): void } | null = null;

/**
 * The "skin" trigger button sits at the end of the theme segmented picker.
 * Clicking it opens a popover that lists every theme published by
 * `scripts/build-themes.ts` — each row shows the localized name + description
 * and a colour swatch lifted from the theme's `preview_color`.
 */
export function skinMenu(): HTMLElement {
  const wrapper = el('div', { class: 'smenu' });

  const trigger = el('button', {
    class: 'smenu-trigger',
    attrs: {
      type: 'button',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-label': t('theme.skin.label'),
      title: t('theme.skin.label'),
    },
  });
  const swatch = el('span', { class: 'smenu-swatch', attrs: { 'aria-hidden': 'true' } });
  trigger.appendChild(swatch);
  trigger.appendChild(iconEl('expand_more', 16));

  const panel = el('div', {
    class: 'smenu-panel',
    attrs: { role: 'listbox', 'aria-label': t('theme.skin.label'), hidden: 'true' },
  });

  let lastThemes: ThemeMeta[] = [];

  function close() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('is-open');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (openInstance && openInstance.close === close) openInstance = null;
  }
  function open() {
    if (openInstance) openInstance.close();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrapper.classList.add('is-open');
    setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey, true);
    }, 0);
    openInstance = { close };
  }
  function onDocClick(e: MouseEvent) {
    if (!wrapper.contains(e.target as Node)) close();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
  }
  trigger.addEventListener('click', async () => {
    if (panel.hidden) { await ensureRendered(); open(); }
    else close();
  });

  async function ensureRendered() {
    const themes = await loadThemes();
    lastThemes = themes;
    repaint();
  }

  function repaint() {
    const current = skin.get();
    panel.replaceChildren(
      el('h3', { class: 'smenu-title', text: t('theme.skin.title') }),
    );
    for (const m of lastThemes) {
      const isActive = m.id === current;
      const item = el('button', {
        class: 'smenu-item' + (isActive ? ' is-active' : ''),
        attrs: { type: 'button', role: 'option', 'aria-selected': String(isActive), 'data-skin': m.id },
      });
      const dot = el('span', { class: 'smenu-dot', attrs: { 'aria-hidden': 'true' } });
      dot.style.background = m.preview_color;
      item.appendChild(dot);
      const text = el('span', { class: 'smenu-text' });
      text.appendChild(el('span', { class: 'smenu-name', text: t(m.name_key) }));
      text.appendChild(el('span', { class: 'smenu-sub',  text: t(m.description_key) }));
      item.appendChild(text);
      const check = iconEl('check', 16);
      check.classList.add('smenu-check');
      check.style.visibility = isActive ? 'visible' : 'hidden';
      item.appendChild(check);
      item.addEventListener('click', () => {
        skin.set(m.id);
        close();
      });
      panel.appendChild(item);
    }
  }

  // Keep the swatch + selected check in sync with the signal.
  effect(() => {
    const id = skin.get();
    const meta = lastThemes.find((x) => x.id === id);
    swatch.style.background = meta?.preview_color ?? 'var(--accent)';
    // If we've rendered the panel before, refresh active state.
    if (lastThemes.length) repaint();
  });
  // And refresh names when locale changes.
  effect(() => {
    locale.get();
    if (lastThemes.length) repaint();
    trigger.setAttribute('aria-label', t('theme.skin.label'));
    trigger.setAttribute('title', t('theme.skin.label'));
  });

  // Pre-load the catalogue so the swatch shows correctly on first paint.
  void loadThemes().then((themes) => {
    lastThemes = themes;
    const meta = themes.find((x) => x.id === skin.get());
    swatch.style.background = meta?.preview_color ?? 'var(--accent)';
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);
  return wrapper;
}
