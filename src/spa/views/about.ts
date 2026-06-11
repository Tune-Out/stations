import { el } from '../dom.js';
import { t } from '../i18n.js';
import { repoUrl } from '../shard.js';
import type { Route } from '../router.js';

export async function renderAbout(_route: Route, mount: HTMLElement): Promise<void> {
  const root = el('div', { class: 'container' });
  root.appendChild(el('p', { class: 'kicker', text: t('about.title') }));
  root.appendChild(el('h1', { class: 'h-display', text: t('about.title') }));

  const prose = el('div', { class: 'prose' });
  prose.appendChild(el('p', { class: 'lede', text: t('about.lede') }));

  for (const key of ['data', 'license', 'privacy', 'contributing']) {
    prose.appendChild(el('h2', { text: t(`about.${key}.title`) }));
    prose.appendChild(el('p', { text: t(`about.${key}.body`) }));
  }

  prose.appendChild(el('h2', { text: 'Source' }));
  const p = el('p');
  const a = el('a', { attrs: { href: repoUrl(), rel: 'external', target: '_blank', 'data-external': 'true' }, text: repoUrl() });
  p.appendChild(a);
  prose.appendChild(p);

  root.appendChild(prose);
  mount.replaceChildren(root);
}
