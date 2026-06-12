/**
 * Inline scrolling skin (theme) picker — used on the Settings page.
 *
 *   ┌─────────┐  ┌─────────┐  ┌─────────┐  ─┐
 *   │ ▓▓▓▓▓▓  │  │ ▓▓▓▓▓▓  │  │ ▓▓▓▓▓▓  │   │
 *   │ ▬▬▬▬    │  │ ▬▬▬▬    │  │ ▬▬▬▬    │   ├──→ horizontally scrollable
 *   │ ▬▬▬▬▬   │  │ ▬▬▬▬▬   │  │ ▬▬▬▬▬   │   │
 *   │ ▓▓▓     │  │ ▓▓▓     │  │ ▓▓▓     │   │
 *   ╰─────────╯  ╰─────────╯  ╰─────────╯  ─┘
 *     Classic     Minimal     Solarpunk
 *
 * Each card is a mini "screenshot" of the theme: rounded rectangle filled
 * with the theme's background colour, a thicker accent stripe at the top
 * (the brand bar), foreground text bars in the body, and an accent
 * "button" — a tiny diorama of the actual UI. Tapping a card sets the
 * skin signal; the active card gets a ring highlight.
 *
 * The card SVG has a viewBox of 0 0 140 100 so the proportions stay stable
 * however we resize the card via CSS.
 */
import { el } from '../dom.js';
import { effect, locale, skin } from '../store.js';
import { iconEl } from '../icons.js';
import { loadThemes, type ThemeMeta } from '../theme.js';
import { t } from '../i18n.js';

/** A richer per-card preview than the tiny dropdown swatch — closer to a
 *  miniature screenshot of the app under that theme. */
export function themeCardSvg(m: ThemeMeta): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 140 100');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');

  const bg = m.preview_bg ?? m.preview_color;
  const fg = m.preview_fg ?? m.preview_color;
  const accent = m.preview_accent ?? m.preview_color;

  // Surface plate (the card itself). A faint outer stroke gives an all-black
  // theme like Applish a visible boundary.
  const plate = document.createElementNS(NS, 'rect');
  plate.setAttribute('width', '140');
  plate.setAttribute('height', '100');
  plate.setAttribute('rx', '10');
  plate.setAttribute('fill', bg);
  plate.setAttribute('stroke', 'rgba(127,127,127,0.25)');
  plate.setAttribute('stroke-width', '0.6');
  svg.appendChild(plate);

  // Top accent stripe (brand bar)
  const stripe = document.createElementNS(NS, 'rect');
  stripe.setAttribute('x', '0');
  stripe.setAttribute('y', '0');
  stripe.setAttribute('width', '140');
  stripe.setAttribute('height', '14');
  stripe.setAttribute('fill', accent);
  svg.appendChild(stripe);

  // "Title" bar
  const title = document.createElementNS(NS, 'rect');
  title.setAttribute('x', '12');
  title.setAttribute('y', '26');
  title.setAttribute('width', '78');
  title.setAttribute('height', '6');
  title.setAttribute('rx', '3');
  title.setAttribute('fill', fg);
  svg.appendChild(title);

  // Three body lines, slightly dimmer than the title.
  const lineConfigs: Array<[number, number]> = [
    [12, 42], [12, 51], [12, 60],
  ];
  const widths = [116, 92, 100];
  lineConfigs.forEach(([x, y], i) => {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', String(x));
    r.setAttribute('y', String(y));
    r.setAttribute('width', String(widths[i]!));
    r.setAttribute('height', '3');
    r.setAttribute('rx', '1.5');
    r.setAttribute('fill', fg);
    r.setAttribute('opacity', '0.62');
    svg.appendChild(r);
  });

  // Accent "button" near the bottom.
  const button = document.createElementNS(NS, 'rect');
  button.setAttribute('x', '12');
  button.setAttribute('y', '78');
  button.setAttribute('width', '36');
  button.setAttribute('height', '12');
  button.setAttribute('rx', '6');
  button.setAttribute('fill', accent);
  svg.appendChild(button);

  return svg;
}

/** Horizontal scrolling list of theme cards. Use in place of the menu. */
export function skinList(): HTMLElement {
  const root = el('div', {
    class: 'skin-list',
    attrs: { role: 'radiogroup', 'aria-label': t('theme.skin.label') },
  });

  let lastThemes: ThemeMeta[] = [];

  function repaint() {
    const current = skin.get();
    if (!lastThemes.length) {
      root.replaceChildren(
        el('p', { class: 'muted skin-list-empty', text: '…' }),
      );
      return;
    }
    const frag = document.createDocumentFragment();
    for (const m of lastThemes) {
      const isActive = m.id === current;
      const card = el('button', {
        class: 'skin-card' + (isActive ? ' is-active' : ''),
        attrs: {
          type: 'button',
          role: 'radio',
          'aria-checked': String(isActive),
          'data-skin': m.id,
        },
      });
      const preview = el('span', { class: 'skin-card-preview' });
      preview.appendChild(themeCardSvg(m));
      // Active marker — rendered above the preview's top-right corner.
      const check = iconEl('check', 14);
      check.classList.add('skin-card-check');
      preview.appendChild(check);
      card.appendChild(preview);
      card.appendChild(el('span', { class: 'skin-card-name', text: t(m.name_key) }));
      card.addEventListener('click', () => skin.set(m.id));
      frag.appendChild(card);
    }
    root.replaceChildren(frag);
  }

  // Pre-load the catalogue so the list shows correctly on first paint.
  void loadThemes().then((themes) => {
    lastThemes = themes;
    repaint();
  });

  // Re-render when the active skin or locale changes.
  effect(() => { skin.get(); if (lastThemes.length) repaint(); });
  effect(() => { locale.get(); if (lastThemes.length) repaint(); });

  return root;
}
