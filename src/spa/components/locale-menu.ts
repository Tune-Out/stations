import { el } from '../dom.js';
import { iconEl } from '../icons.js';
import { effect, locale } from '../store.js';
import { switchLocale, go, url } from '../router.js';
import { LOCALES, SUPPORTED_LOCALES } from '../types.js';
import { t } from '../i18n.js';

let openInstance: { close(): void } | null = null;

export function localeMenu(): HTMLElement {
  const wrapper = el('div', { class: 'lmenu' });

  const trigger = el('button', {
    class: 'lmenu-trigger',
    attrs: {
      type: 'button',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-label': t('locale.label'),
      title: t('locale.label'),
    },
  });
  trigger.appendChild(iconEl('language', 18));
  const triggerLabel = el('span', { class: 'lmenu-trigger-label' });
  trigger.appendChild(triggerLabel);
  trigger.appendChild(iconEl('expand_more', 16));

  const panel = el('div', {
    class: 'lmenu-panel',
    attrs: { role: 'listbox', 'aria-label': t('locale.label'), hidden: 'true' },
  });

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
  function close() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('is-open');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (openInstance && openInstance.close === close) openInstance = null;
  }
  function onDocClick(e: MouseEvent) {
    if (!wrapper.contains(e.target as Node)) close();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
  }

  trigger.addEventListener('click', () => {
    if (panel.hidden) open();
    else close();
  });

  // Build the items once.
  // NOTE on `dir`: the menu's grid layout is column-based and must read
  // identically for every locale. If we propagated each locale's own
  // direction (e.g. dir="rtl" for Arabic), that one row's grid would flip
  // and the check icon + native name + English subtitle would jump to the
  // opposite side from every other item. We keep the row container `ltr`
  // and only set the inline `lang` so the text inside renders with the
  // correct font + bidi rules.
  const items: { btn: HTMLButtonElement; check: HTMLElement }[] = [];
  for (const code of SUPPORTED_LOCALES) {
    const meta = LOCALES[code];
    const btn = el('button', {
      class: 'lmenu-item',
      attrs: { type: 'button', role: 'option', 'data-locale': code, lang: code, dir: 'ltr' },
    });
    const check = iconEl('check', 16);
    check.classList.add('lmenu-check');
    btn.appendChild(check);
    // Wrap the native-name span with explicit `dir="auto"` so the inline
    // text follows its script (Arabic glyphs still display RTL) while the
    // parent button keeps its uniform LTR grid.
    btn.appendChild(el('span', { class: 'lmenu-name', text: meta.nativeName, attrs: { dir: 'auto' } }));
    btn.appendChild(el('span', { class: 'lmenu-sub', text: meta.name }));
    btn.addEventListener('click', () => {
      close();
      switchLocale(code);
    });
    panel.appendChild(btn);
    items.push({ btn, check });
  }

  // Separator + "Other Languages…" link to the About page (which absorbed
  // the old FAQ content, including the supported-languages list and
  // contribution instructions).
  panel.appendChild(el('hr', { class: 'lmenu-sep' }));

  const moreBtn = el('button', {
    class: 'lmenu-item lmenu-more',
    attrs: { type: 'button' },
  });
  moreBtn.appendChild(iconEl('help', 16));
  const moreLabel = el('span', { class: 'lmenu-name' });
  moreBtn.appendChild(moreLabel);
  moreBtn.addEventListener('click', () => {
    close();
    go(url('about'));
  });
  panel.appendChild(moreBtn);

  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);

  effect(() => {
    const active = locale.get();
    triggerLabel.textContent = active.toUpperCase();
    trigger.setAttribute('title', t('locale.label'));
    trigger.setAttribute('aria-label', t('locale.label'));
    panel.setAttribute('aria-label', t('locale.label'));
    moreLabel.textContent = t('locale.other_languages');
    for (const { btn, check } of items) {
      const isActive = btn.dataset.locale === active;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      check.style.visibility = isActive ? 'visible' : 'hidden';
    }
  });

  return wrapper;
}
