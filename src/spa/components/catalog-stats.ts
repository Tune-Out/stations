/**
 * Two small bits of catalog metadata reused on Home and Browse:
 *
 *   • {@link catalogCountLine} — locale-formatted total count of stations,
 *     rendered as a muted line above the rails / browse grid.
 *   • {@link catalogFooter} — the same `non_commercial` / `public_domain`
 *     footer Home already had, now extended with an "Updated <date>" suffix
 *     so visitors can see when the SQLite was last rebuilt.
 *
 * Both helpers read live state synchronously when possible — the count
 * comes from the already-open DB; the date from the cached manifest if
 * it's loaded. When the manifest isn't ready yet, the footer renders
 * without the date and updates in-place once {@link loadManifest} resolves.
 */
import type { Database } from '@sqlite.org/sqlite-wasm';
import { el } from '../dom.js';
import { t } from '../i18n.js';
import { locale } from '../store.js';
import { loadManifest, totalCount } from '../db.js';
import { url } from '../router.js';

function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** A short, muted "57,775 stations in the catalog" line. */
export function catalogCountLine(db: Database): HTMLElement {
  const l = locale.get();
  const n = totalCount(db);
  return el('p', {
    class: 'catalog-stats',
    text: t('stats.station_count', { count: n.toLocaleString(l) }),
  });
}

/** The footer at the bottom of Home + Browse:
 *      A non-commercial open-source community project.
 *      All metadata in this catalog is in the public domain. · Updated Jun 12, 2026
 *  The date appears as soon as the manifest is available; rendering is
 *  non-blocking so a slow manifest fetch never delays page paint. */
export function catalogFooter(): HTMLElement {
  const l = locale.get();
  const f = el('footer', { class: 'foot' });
  f.appendChild(el('span', { text: t('footer.non_commercial') }));

  const right = el('span');
  const publicDomainLink = `<a href="${url('about')}">${escapeHtml(t('footer.public_domain'))}</a>`;
  const updatedSlot = '<span class="foot-updated" data-updated-slot></span>';
  right.innerHTML = `${publicDomainLink}${updatedSlot}`;
  f.appendChild(right);

  // Pull the date in once the manifest is loaded. We don't await before
  // returning — the footer paints with just the public-domain link first
  // and grows the date inline when it arrives.
  void loadManifest().then((m) => {
    const iso = m?.generated_at;
    if (!iso) return;
    let dateStr: string;
    try {
      dateStr = new Date(iso).toLocaleDateString(l, { dateStyle: 'medium' });
    } catch {
      dateStr = iso.slice(0, 10);
    }
    const slot = f.querySelector<HTMLSpanElement>('[data-updated-slot]');
    if (slot) {
      slot.textContent = ` · ${t('stats.last_updated', { date: dateStr })}`;
    }
  });

  return f;
}
