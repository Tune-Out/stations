/**
 * Mobile-only "Add to Home Screen" install button.
 *
 * Two install flows the web actually supports today:
 *
 *  • Chromium-family browsers (Android Chrome, Edge, Samsung Internet, Brave
 *    on Android, Chrome OS): the browser fires a `beforeinstallprompt` event
 *    when the PWA meets installability criteria. We capture it in
 *    `src/spa/pwa.ts`; this component just calls `showInstallPrompt()` which
 *    surfaces the browser's native install sheet.
 *
 *  • iOS Safari (and any browser on iOS, because they're all WKWebView):
 *    Safari does NOT fire `beforeinstallprompt` and there is no JS-callable
 *    install API. The only path is the user choosing Share → "Add to Home
 *    Screen". We can't *trigger* that, but we can show a small, localised
 *    sheet that explains the two-tap flow with the correct icon.
 *
 * Firefox/Opera on Android also don't fire `beforeinstallprompt` — they
 * have their own menu entry. Same fallback applies: show the manual
 * instructions sheet, lifted to the Android Share-via-menu wording.
 *
 * The button hides itself when:
 *   • The page is already running in standalone display mode (PWA
 *     installed), via `matchMedia('(display-mode: standalone)')` or the
 *     iOS legacy `navigator.standalone` flag.
 *   • The viewport is wider than the mobile breakpoint — desktop browsers
 *     surface install via the URL bar, no need for a duplicate button.
 *   • The user has dismissed the iOS-manual flow during this session
 *     (kept in sessionStorage so the next visit shows it again).
 *
 * All visible strings come from i18n; nothing here is hard-coded English.
 */
import { el } from '../dom.js';
import { iconEl, iconHtml } from '../icons.js';
import { t } from '../i18n.js';
import { effect } from '../store.js';
import { installPromptAvailable, showInstallPrompt } from '../pwa.js';

const DISMISS_KEY = 'tuneout.install.dismissed';

function isStandalone(): boolean {
  if (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari pre-PWA-spec exposes this as a non-standard navigator flag.
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ masquerades as macOS but exposes touch points. The
  // combination is iPadOS-specific (real Macs report maxTouchPoints === 0
  // even on Touch Bar models).
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isIosSafari(): boolean {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  // Chrome/Firefox/Edge/Brave/etc. on iOS are all WKWebView under different
  // brand strings. They surface an install-equivalent through their own
  // menus, not Share. We still show the iOS sheet because there's no JS API
  // either way.
  return /Safari/.test(ua) || /CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
}

function dismissed(): boolean {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}
function rememberDismissal(): void {
  try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
}

/** Build the modal shown to iOS users explaining Share → Add to Home Screen. */
function manualSheet(close: () => void): HTMLElement {
  const overlay = el('div', { class: 'install-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const sheet = el('div', { class: 'install-sheet' });

  const closeBtn = el('button', {
    class: 'install-close',
    attrs: { type: 'button', 'aria-label': t('install.close') },
    html: iconHtml('close', 20),
  });
  closeBtn.addEventListener('click', () => { rememberDismissal(); close(); });
  sheet.appendChild(closeBtn);

  sheet.appendChild(el('h2', { class: 'install-title', text: t('install.title') }));
  sheet.appendChild(el('p', { class: 'install-body', text: t('install.body') }));

  const ol = el('ol', { class: 'install-steps' });
  const stepKeys = isIos()
    ? ['install.ios.step1', 'install.ios.step2', 'install.ios.step3']
    : ['install.android.step1', 'install.android.step2', 'install.android.step3'];
  for (const key of stepKeys) {
    const li = el('li');
    // Steps reference UI elements; inline an icon next to the relevant word
    // so the user can pattern-match against their browser chrome. We pass
    // the icon as an HTML string via `{shareIcon}`; the strings include the
    // placeholder verbatim and we substitute below.
    const shareIcon = isIos() ? iconHtml('ios_share', 16) : iconHtml('more_vert', 16);
    li.innerHTML = t(key, { shareIcon, addIcon: iconHtml('install_mobile', 16) });
    ol.appendChild(li);
  }
  sheet.appendChild(ol);

  const done = el('button', {
    class: 'install-done',
    attrs: { type: 'button' },
    text: t('install.close'),
  });
  done.addEventListener('click', () => { rememberDismissal(); close(); });
  sheet.appendChild(done);

  overlay.appendChild(sheet);
  // Click outside the sheet to dismiss.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { rememberDismissal(); close(); }
  });
  // Escape key.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { rememberDismissal(); close(); }
  };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('tuneout:detach', () => document.removeEventListener('keydown', onKey));

  return overlay;
}

export function installButton(): HTMLElement {
  const btn = el('button', {
    class: 'install-btn',
    attrs: {
      type: 'button',
      'aria-label': t('install.button.label'),
      title: t('install.button.label'),
    },
    html: iconHtml('install_mobile', 20),
  });
  btn.style.display = 'none';

  function updateVisibility(): void {
    if (isStandalone()) { btn.style.display = 'none'; return; }
    if (dismissed()) { btn.style.display = 'none'; return; }
    // Show on Android/Chromium when the deferred prompt is ready, AND on
    // any iOS browser (where the manual sheet is the only flow). The
    // CSS @media query handles the mobile-only viewport gate so this
    // logic stays display-mode / UA only.
    const hasNativePrompt = installPromptAvailable.get();
    const showManual = isIos();
    btn.style.display = (hasNativePrompt || showManual) ? '' : 'none';
  }

  effect(() => {
    installPromptAvailable.get(); // dep
    updateVisibility();
  });

  // Re-check when the document becomes visible again (user came back from
  // the home screen having just installed) and on display-mode changes.
  document.addEventListener('visibilitychange', updateVisibility);
  if (typeof matchMedia === 'function') {
    matchMedia('(display-mode: standalone)').addEventListener?.('change', updateVisibility);
  }

  btn.addEventListener('click', async () => {
    if (installPromptAvailable.get()) {
      const outcome = await showInstallPrompt();
      if (outcome === 'accepted') {
        // appinstalled event fires shortly; visibility will update.
        return;
      }
      // dismissed or unavailable → fall back to the manual sheet so the
      // user still has a path forward.
    }
    const overlay = manualSheet(() => {
      overlay.dispatchEvent(new Event('tuneout:detach'));
      overlay.remove();
    });
    document.body.appendChild(overlay);
  });

  // Re-evaluate label on locale change so screen readers always read the
  // active language. (The button itself contains only the icon.)
  effect(() => {
    btn.setAttribute('aria-label', t('install.button.label'));
    btn.setAttribute('title', t('install.button.label'));
  });

  return btn;
}
