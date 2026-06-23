/**
 * Settings view. One scrollable page split into a few cards:
 *
 *  • Appearance — theme (light / system / dark) + skin picker
 *  • Recents    — max-size input + Clear button
 *  • Export     — Recents → .pls, Favorites → .pls
 *
 * The theme picker is the same control that used to live in the top bar;
 * we just render it as a labelled section here. Recents max + clear are
 * driven straight off the live `recentsMax` / `recents` signals so the
 * sidebar updates the moment the user hits enter on the number input.
 */
import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { t } from '../i18n.js';
import {
  clearRecents,
  effect,
  favorites,
  locale,
  recents,
  recentsMax,
  setRecentsMax,
  RECENTS_MAX_CEILING,
  RECENTS_MAX_FLOOR,
} from '../store.js';
import { skinList } from '../components/skin-list.js';
import { themeSegments } from '../components/theme-picker.js';
import { exportPls } from '../playlist.js';
import type { Route } from '../router.js';

export async function renderSettings(_route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const root = el('div', { class: 'container' });
  root.appendChild(el('p', { class: 'kicker', text: t('settings.kicker') }));
  root.appendChild(el('h1', { class: 'h-display', text: t('settings.title') }));
  root.appendChild(el('p', { class: 'lede', text: t('settings.lede') }));

  // ── Appearance ─────────────────────────────────────────────────────────
  // The light/system/dark segmented control also lives in the topbar, but
  // that copy is hidden in the narrow (mobile) layout — so we render it here
  // too, ensuring color mode is always changeable. The SKIN picker follows.
  {
    const card = el('article', { class: 'panel settings-panel' });
    card.appendChild(el('h2', { text: t('settings.appearance.title') }));
    card.appendChild(el('p', { class: 'muted', text: t('settings.appearance.body') }));
    card.appendChild(el('p', { class: 'settings-section-label', text: t('theme.label') }));
    card.appendChild(themeSegments());
    card.appendChild(el('p', { class: 'settings-section-label', text: t('theme.skin.label') }));
    card.appendChild(skinList());
    root.appendChild(card);
  }

  // ── Recents ────────────────────────────────────────────────────────────
  {
    const card = el('article', { class: 'panel settings-panel' });
    card.appendChild(el('h2', { text: t('settings.recents.title') }));
    card.appendChild(el('p', { class: 'muted', text: t('settings.recents.body') }));

    // Max input row
    const maxRow = el('div', { class: 'settings-row settings-row-split' });
    const maxLabel = el('label', { class: 'settings-label' });
    maxLabel.appendChild(el('span', { text: t('settings.recents.max_label') }));
    const maxInput = el('input', {
      class: 'settings-number',
      attrs: {
        type: 'number',
        min: String(RECENTS_MAX_FLOOR),
        max: String(RECENTS_MAX_CEILING),
        step: '1',
        inputmode: 'numeric',
        value: String(recentsMax.get()),
      },
    }) as HTMLInputElement;
    maxInput.addEventListener('change', () => {
      const n = parseInt(maxInput.value, 10);
      if (!Number.isFinite(n)) {
        maxInput.value = String(recentsMax.get());
        return;
      }
      setRecentsMax(n);
      // Reflect any clamping the store applied.
      maxInput.value = String(recentsMax.get());
    });
    // Keep the input in sync if some other UI tweaks recentsMax (defensive).
    effect(() => { maxInput.value = String(recentsMax.get()); });
    maxLabel.appendChild(maxInput);
    maxRow.appendChild(maxLabel);

    // Live count badge — surfaces how many entries are stored right now.
    const countBadge = el('span', { class: 'muted settings-meta' });
    effect(() => {
      const n = recents.get().length;
      countBadge.textContent = t('settings.recents.count', { n: n.toLocaleString(l) });
    });
    maxRow.appendChild(countBadge);
    card.appendChild(maxRow);

    // Clear button row
    const clearRow = el('div', { class: 'settings-row' });
    const clearBtn = el('button', {
      class: 'btn btn-ghost',
      attrs: { type: 'button' },
    });
    clearBtn.appendChild(iconEl('delete', 16));
    clearBtn.appendChild(el('span', { text: t('settings.recents.clear') }));
    clearBtn.addEventListener('click', () => {
      if (recents.get().length === 0) return;
      if (confirm(t('settings.recents.clear_confirm'))) clearRecents();
    });
    effect(() => {
      const empty = recents.get().length === 0;
      clearBtn.toggleAttribute('disabled', empty);
    });
    clearRow.appendChild(clearBtn);
    card.appendChild(clearRow);

    root.appendChild(card);
  }

  // ── Export ─────────────────────────────────────────────────────────────
  {
    const card = el('article', { class: 'panel settings-panel' });
    card.appendChild(el('h2', { text: t('settings.export.title') }));
    card.appendChild(el('p', { class: 'muted', text: t('settings.export.body') }));

    const row = el('div', { class: 'settings-row' });

    const recentsBtn = el('button', {
      class: 'btn btn-primary',
      attrs: { type: 'button' },
    });
    recentsBtn.appendChild(iconEl('download', 16));
    recentsBtn.appendChild(el('span', { text: t('settings.export.recents') }));
    recentsBtn.addEventListener('click', () => exportPls('tuneout-recents', recents.get()));
    effect(() => { recentsBtn.toggleAttribute('disabled', recents.get().length === 0); });

    const favBtn = el('button', {
      class: 'btn btn-primary',
      attrs: { type: 'button' },
    });
    favBtn.appendChild(iconEl('download', 16));
    favBtn.appendChild(el('span', { text: t('settings.export.favorites') }));
    favBtn.addEventListener('click', () => exportPls('tuneout-favorites', favorites.get()));
    effect(() => { favBtn.toggleAttribute('disabled', favorites.get().length === 0); });

    row.appendChild(recentsBtn);
    row.appendChild(favBtn);
    card.appendChild(row);
    root.appendChild(card);
  }

  mount.replaceChildren(root);
}
