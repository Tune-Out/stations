import { el } from '../dom.js';
import { t } from '../i18n.js';
import { repoUrl } from '../shard.js';
import { LOCALES, SUPPORTED_LOCALES } from '../types.js';
import type { Route } from '../router.js';

export async function renderFaq(_route: Route, mount: HTMLElement): Promise<void> {
  const root = el('div', { class: 'container' });

  root.appendChild(el('p', { class: 'kicker', text: t('faq.kicker') }));
  root.appendChild(el('h1', { class: 'h-display', text: t('faq.title') }));

  const prose = el('div', { class: 'prose' });
  prose.appendChild(el('p', { class: 'lede', text: t('faq.lede') }));

  // ── Languages we currently ship ──
  prose.appendChild(el('h2', { text: t('faq.current_languages.title') }));
  prose.appendChild(el('p', { text: t('faq.current_languages.body') }));
  const list = el('ul');
  for (const code of SUPPORTED_LOCALES) {
    const m = LOCALES[code];
    const li = el('li');
    li.innerHTML = `<strong>${m.nativeName}</strong> <span class="muted">— ${m.name} (${code}${m.dir === 'rtl' ? ', RTL' : ''})</span>`;
    list.appendChild(li);
  }
  prose.appendChild(list);

  // ── How to add a new language ──
  prose.appendChild(el('h2', { text: t('faq.add_language.title') }));
  prose.appendChild(el('p', { text: t('faq.add_language.body') }));

  const ol = el('ol');
  const steps = [
    'faq.add_language.step1',
    'faq.add_language.step2',
    'faq.add_language.step3',
    'faq.add_language.step4',
  ];
  for (const key of steps) {
    const li = el('li');
    li.innerHTML = t(key);
    ol.appendChild(li);
  }
  prose.appendChild(ol);

  prose.appendChild(el('p', { class: 'muted', text: t('faq.add_language.tbd') }));

  // ── Localized station text ──
  prose.appendChild(el('h2', { text: t('faq.station_text.title') }));
  prose.appendChild(el('p', { text: t('faq.station_text.body') }));

  // ── Get involved ──
  prose.appendChild(el('h2', { text: t('faq.contact.title') }));
  const p = el('p');
  p.innerHTML = t('faq.contact.body', { repo: `<a href="${repoUrl()}" rel="external" target="_blank" data-external="true">${repoUrl()}</a>` });
  prose.appendChild(p);

  root.appendChild(prose);
  mount.replaceChildren(root);
}
