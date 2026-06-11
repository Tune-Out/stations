import { el } from '../dom.js';
import { t } from '../i18n.js';
import { locale } from '../store.js';
import { loadManifest, type Manifest, type ManifestArtifact } from '../db.js';
import type { Route } from '../router.js';

function fmtSize(n?: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1e6) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)} MB`;
  return `${(n / 1e9).toFixed(2)} GB`;
}

export async function renderDownloads(_route: Route, mount: HTMLElement): Promise<void> {
  const l = locale.get();
  const manifest: Manifest = await loadManifest();

  const root = el('div', { class: 'container' });
  root.appendChild(el('p', { class: 'kicker', text: t('nav.downloads') }));
  root.appendChild(el('h1', { class: 'h-display', text: t('downloads.title') }));
  root.appendChild(el('p', { class: 'lede', text: t('downloads.subtitle') }));

  if (manifest.generated_at) {
    root.appendChild(el('p', { class: 'muted', text: new Date(manifest.generated_at).toLocaleString(l) }));
  }

  const artifacts: { key: string; title: string; subtitle: string; desc: string }[] = [
    { key: 'sqlite', title: t('downloads.sqlite.title'), subtitle: t('downloads.sqlite.subtitle'), desc: t('downloads.sqlite.desc') },
    { key: 'zip',    title: t('downloads.zip.title'),    subtitle: t('downloads.zip.subtitle'),    desc: t('downloads.zip.desc') },
    { key: 'jsongz', title: t('downloads.jsongz.title'), subtitle: t('downloads.jsongz.subtitle'), desc: t('downloads.jsongz.desc') },
  ];

  const grid = el('div', { class: 'station-grid' });

  for (const a of artifacts) {
    const meta: ManifestArtifact | undefined = manifest.artifacts?.[a.key];
    const panel = el('article', { class: 'panel' });
    panel.appendChild(el('h2', { text: a.title }));
    panel.appendChild(el('p', { class: 'muted', text: a.subtitle }));
    panel.appendChild(el('p', { text: a.desc, attrs: { style: 'margin-block-start:0.75rem' } }));

    const row = el('div', {
      attrs: { style: 'display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-block-start:1rem;flex-wrap:wrap' },
    });
    row.appendChild(el('span', {
      class: 'muted',
      attrs: { style: 'font-size:.85rem' },
      html: `<strong style="color:var(--fg);font-weight:500">${t('downloads.size')}</strong> ${fmtSize(meta?.size)}`,
    }));
    if (meta?.sha256) {
      row.appendChild(el('span', {
        class: 'muted',
        attrs: { style: 'font-size:.78rem' },
        html: `<strong style="color:var(--fg);font-weight:500">${t('downloads.sha256')}</strong> <code style="background:color-mix(in oklab,var(--accent) 9%,transparent);padding:.1rem .35rem;border-radius:.3rem">${meta.sha256.slice(0, 16)}…</code>`,
      }));
    }
    if (meta) {
      row.appendChild(el('a', { class: 'btn btn-primary', attrs: { href: `/${meta.path}`, download: '', 'data-external': 'true' }, text: 'Download' }));
    } else {
      row.appendChild(el('span', { class: 'muted', text: t('downloads.available_after_build') }));
    }
    panel.appendChild(row);
    grid.appendChild(panel);
  }
  root.appendChild(grid);

  mount.replaceChildren(root);
}
