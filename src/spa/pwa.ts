/**
 * Register the service worker after the SPA has loaded. Kept tiny — handles
 * registration, "new version available" notification, and exposes the
 * `beforeinstallprompt` event so the UI can offer an "Install" button on
 * supported Chromium browsers.
 */
import { signal } from './store.js';

export const installPromptAvailable = signal<boolean>(false);
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isDevHost(): boolean {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

export function setupPwa(): void {
  // Service worker
  // In dev mode (or on a dev host like 127.0.0.1) we DON'T register the SW
  // and we also actively unregister any SW already installed from a prior
  // production-style run. Without this, the SW intercepts navigations and
  // serves stale shells, hiding all dev-server changes.
  if ('serviceWorker' in navigator) {
    if (isDevHost()) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) void r.unregister();
      });
      // Drop the dev-bypass cache too so refreshes don't replay yesterday's HTML.
      if ('caches' in self) {
        void caches.keys().then((keys) => {
          for (const k of keys) if (k.startsWith('tuneout-')) void caches.delete(k);
        });
      }
    } else {
      addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .catch((e) => console.warn('[pwa] sw register failed', e));
      });
    }
  }

  // Capture the install prompt event (Chromium-only)
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installPromptAvailable.set(true);
  });

  addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installPromptAvailable.set(false);
  });
}

export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installPromptAvailable.set(false);
  return choice.outcome;
}
