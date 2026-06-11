import { el } from '../dom.js';
import { iconHtml } from '../icons.js';
import { t } from '../i18n.js';
import { locale } from '../store.js';
import { editRepoFileUrl, repoUrl } from '../shard.js';
import type { Route } from '../router.js';

const PR_DOCS_URL =
  'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests';

export async function renderAbout(_route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const root = el('div', { class: 'container' });
  root.appendChild(el('p', { class: 'kicker', text: t('about.title') }));
  root.appendChild(el('h1', { class: 'h-display', text: t('about.title') }));

  const prose = el('div', { class: 'prose' });
  prose.appendChild(el('p', { class: 'lede', text: t('about.lede') }));

  for (const key of ['data', 'license', 'privacy', 'contributing']) {
    prose.appendChild(el('h2', { text: t(`about.${key}.title`) }));
    prose.appendChild(el('p', { text: t(`about.${key}.body`) }));
  }

  // ── Translations (improve + add-language, merged) ──────────────────────
  // One section covers both flows: improving the active locale's strings
  // and contributing an entirely new language. The CTA below is a button-
  // styled anchor that opens GitHub's web editor on the current locale's
  // YAML file.
  prose.appendChild(el('h2', { text: t('about.improve_translation.title') }));
  prose.appendChild(el('p', { text: t('about.improve_translation.body') }));

  const editPath = `src/spa/i18n/${l}.yaml`;
  const editUrl = editRepoFileUrl(editPath);

  // Button-styled anchor: GitHub mark + bold "Edit … on GitHub" label.
  const ctaWrap = el('p');
  const ctaLink = el('a', {
    class: 'btn btn-primary about-edit-cta',
    attrs: { href: editUrl, rel: 'external', target: '_blank', 'data-external': 'true' },
    html: `${iconHtml('github', 18)}<span>${escape(t('about.improve_translation.edit'))} <code>${escape(editPath)}</code></span>`,
  });
  ctaWrap.appendChild(ctaLink);
  prose.appendChild(ctaWrap);

  // Full URL right below for users who want to copy/paste it.
  const urlPara = el('p', { class: 'breakall muted' });
  urlPara.appendChild(el('a', {
    attrs: { href: editUrl, rel: 'external', target: '_blank', 'data-external': 'true' },
    text: editUrl,
  }));
  prose.appendChild(urlPara);

  // PR walkthrough docs link for first-time contributors.
  const docsPara = el('p');
  docsPara.appendChild(el('a', {
    attrs: { href: PR_DOCS_URL, rel: 'external', target: '_blank', 'data-external': 'true' },
    text: t('about.improve_translation.pr_docs'),
  }));
  prose.appendChild(docsPara);

  // Sub-heading: adding an entirely new language. Same section, no
  // numbered steps — just one paragraph explaining the copy-and-rename
  // flow, which is all the catalog actually requires.
  prose.appendChild(el('h3', { text: t('about.add_language.title') }));
  const addPara = el('p');
  addPara.innerHTML = t('about.add_language.body');
  prose.appendChild(addPara);

  // ── Localized station text (was: FAQ "station text") ───────────────────
  prose.appendChild(el('h2', { text: t('faq.station_text.title') }));
  prose.appendChild(el('p', { text: t('faq.station_text.body') }));

  // ── Get involved (was: FAQ "contact") ──────────────────────────────────
  prose.appendChild(el('h2', { text: t('faq.contact.title') }));
  const contactPara = el('p');
  contactPara.innerHTML = t('faq.contact.body', {
    repo: `<a href="${repoUrl()}" rel="external" target="_blank" data-external="true">${repoUrl()}</a>`,
  });
  prose.appendChild(contactPara);

  // ── Source link (kept from original About) ─────────────────────────────
  prose.appendChild(el('h2', { text: 'Source' }));
  const sourcePara = el('p');
  sourcePara.appendChild(el('a', {
    attrs: { href: repoUrl(), rel: 'external', target: '_blank', 'data-external': 'true' },
    text: repoUrl(),
  }));
  prose.appendChild(sourcePara);

  root.appendChild(prose);
  mount.replaceChildren(root);
}

function escape(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
