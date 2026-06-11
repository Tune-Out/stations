/**
 * Render a single tag as a colored, icon-prefixed chip.
 *
 *   ┌─────────────────────┐
 *   │ ♪  jazz             │   ← outline color + icon both come from tagStyle()
 *   └─────────────────────┘
 *
 * Chip background is the tag's accent color blended into the page background
 * via CSS color-mix(), so the same chip reads correctly on both light and
 * dark themes. The accent itself is passed through as a CSS custom property,
 * meaning theme skins can override it per-tag if they want.
 */
import { tagIconSvg, tagStyle } from '../tag-style.js';
import { tTag } from '../i18n.js';
import { el } from '../dom.js';

export interface TagChipOpts {
  /** When set, wrap the chip in an <a> linking to the structured search. */
  href?: string;
  /** Compact mode — drops the icon, only renders the dot + label. */
  compact?: boolean;
  /** Extra classes to merge on. */
  className?: string;
  /** Localized label override (defaults to tTag(slug)). */
  label?: string;
}

export function tagChip(slug: string, opts: TagChipOpts = {}): HTMLElement {
  const style = tagStyle(slug);
  const tag = opts.href ? 'a' : 'span';
  const classes = ['tag-chip', opts.href ? 'tag-chip-link' : ''];
  if (opts.compact) classes.push('tag-chip-compact');
  if (opts.className) classes.push(opts.className);

  const root = el(tag as 'span', {
    class: classes.filter(Boolean).join(' '),
    attrs: opts.href ? { href: opts.href, 'data-tag': slug } : { 'data-tag': slug },
  });
  // CSS custom property — the stylesheet does the color-mix work.
  root.style.setProperty('--tag-color', style.color);

  if (!opts.compact) {
    const ico = el('span', {
      class: 'tag-chip-icon',
      attrs: { 'aria-hidden': 'true' },
      html: tagIconSvg(slug, 14),
    });
    root.appendChild(ico);
  }

  const label = el('span', { class: 'tag-chip-label', text: opts.label ?? tTag(slug) });
  root.appendChild(label);
  return root;
}

/** Convenience: render a row of chips into a parent element. */
export function appendTagChips(
  parent: HTMLElement,
  slugs: string[],
  opts: TagChipOpts = {},
): void {
  for (const slug of slugs) {
    if (!slug) continue;
    parent.appendChild(tagChip(slug, opts));
  }
}
