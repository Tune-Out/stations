import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { effect, skin, locale } from '../store.js';
import { loadThemes, type ThemeMeta } from '../theme.js';
import { t } from '../i18n.js';

let openInstance: { close(): void } | null = null;

/**
 * Mini "card" representation of a theme: rounded rectangle filled with the
 * theme's background, an accent-coloured stripe at the top, and two short
 * foreground bars below to mimic body text. Reads as a tiny preview of
 * what the theme actually looks like once applied.
 *
 * Falls back to a solid swatch of `preview_color` when the per-channel
 * colours weren't declared in the theme metadata (older theme.yaml files).
 */
function swatchSvg(m: ThemeMeta, size: number): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 22 22');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  // Background plate
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '22');
  bg.setAttribute('height', '22');
  bg.setAttribute('rx', '5');
  bg.setAttribute('fill', m.preview_bg ?? m.preview_color);
  // Hairline border so a theme whose bg equals the surrounding UI bg
  // (e.g. a black-on-black) still has a visible boundary.
  bg.setAttribute('stroke', 'rgba(127,127,127,0.35)');
  bg.setAttribute('stroke-width', '0.5');
  svg.appendChild(bg);
  // Accent stripe — the theme's "tint" colour, visually the brand bar.
  const accent = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  accent.setAttribute('x', '4');
  accent.setAttribute('y', '5');
  accent.setAttribute('width', '14');
  accent.setAttribute('height', '2.5');
  accent.setAttribute('rx', '1.25');
  accent.setAttribute('fill', m.preview_accent ?? m.preview_color);
  svg.appendChild(accent);
  // Foreground bars — mimic body text in the theme's primary text colour.
  for (const [w, y] of [[10, 11], [6, 14.5]] as const) {
    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fg.setAttribute('x', '4');
    fg.setAttribute('y', String(y));
    fg.setAttribute('width', String(w));
    fg.setAttribute('height', '1.8');
    fg.setAttribute('rx', '0.9');
    fg.setAttribute('fill', m.preview_fg ?? m.preview_color);
    svg.appendChild(fg);
  }
  return svg;
}

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
  // The trigger swatch is rebuilt from scratch every time the active skin
  // changes (see the effect() below), so we keep a wrapper span and swap
  // its child SVG rather than mutating styles.
  const swatch = el('span', { class: 'smenu-swatch', attrs: { 'aria-hidden': 'true' } });
  trigger.appendChild(swatch);
  trigger.appendChild(iconEl('expand_more', 16));

  function renderSwatch(m: ThemeMeta | null): void {
    swatch.replaceChildren();
    if (!m) {
      swatch.style.background = 'var(--accent)';
      return;
    }
    swatch.style.background = 'transparent';
    swatch.appendChild(swatchSvg(m, 18));
  }

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
      const swatchWrap = el('span', { class: 'smenu-swatch-mini', attrs: { 'aria-hidden': 'true' } });
      swatchWrap.appendChild(swatchSvg(m, 22));
      item.appendChild(swatchWrap);
      // Title-only — description is dropped per the user request; the
      // mini swatch carries the visual identity.
      item.appendChild(el('span', { class: 'smenu-name', text: t(m.name_key) }));
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
    const meta = lastThemes.find((x) => x.id === id) ?? null;
    renderSwatch(meta);
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
    const meta = themes.find((x) => x.id === skin.get()) ?? null;
    renderSwatch(meta);
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);
  return wrapper;
}
