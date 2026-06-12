import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { effect, theme } from '../store.js';
import { t } from '../i18n.js';
import type { Theme } from '../store.js';
import type { IconName } from '../icons.js';
import { skinMenu } from './skin-menu.js';

const ORDER: { value: Theme; icon: IconName }[] = [
  { value: 'light',  icon: 'light_mode' },
  { value: 'system', icon: 'contrast'   },
  { value: 'dark',   icon: 'dark_mode'  },
];

/**
 * The light / system / dark segmented control on its own. Rendered in the
 * top bar so a one-tap theme switch is always reachable; also used inside
 * {@link themePicker} for the legacy combined widget.
 */
export function themeSegments(): HTMLElement {
  const root = el('div', {
    class: 'seg theme-picker',
    attrs: { role: 'group', 'aria-label': t('theme.label') },
  });

  const buttons = ORDER.map(({ value, icon }) => {
    const btn = el('button', {
      attrs: {
        type: 'button',
        'data-theme-value': value,
        title: t(`theme.${value}`),
        'aria-label': t(`theme.${value}`),
      },
      on: { click: () => theme.set(value) },
    });
    btn.appendChild(iconEl(icon, 16));
    root.appendChild(btn);
    return btn;
  });

  effect(() => {
    const active = theme.get();
    for (const b of buttons) {
      const v = b.dataset.themeValue as Theme;
      const on = v === active;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  });

  return root;
}

/**
 * Combined picker: segmented theme + skin dropdown attached on the end.
 * Kept around for callers that want both in one block (e.g. settings,
 * if you ever wanted to surface light/dark there too). Most surfaces
 * now render {@link themeSegments} and {@link skinMenu} separately.
 */
export function themePicker(): HTMLElement {
  const root = themeSegments();
  root.appendChild(skinMenu());
  return root;
}
