import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — scoped to the mobile-fit regression suite only.
 *
 * Run locally:   npm run test:mobile          (uses local Chrome)
 *                npm run test:mobile -- --ui  (Playwright UI mode)
 *
 * The suite starts its own Astro preview on port 4322 so it doesn't fight
 * with `npm run dev` (4321).
 */
export default defineConfig({
  testDir: 'tests-e2e',
  fullyParallel: false,
  // Sharing the system Chrome across parallel projects fights with
  // single-user-data-dir Chrome's "only one instance per profile" assumption,
  // so we serialize. Cheap — the whole suite still finishes in <30 s.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
    // Default to Playwright's bundled chromium (consistent across CI + local).
    // Set PLAYWRIGHT_CHROME_PATH to override (e.g. system Chrome on a dev
    // workstation that already has it). Install bundled chromium once with:
    //   npx playwright install chromium
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined,
    },
  },
  projects: [
    { name: 'iphone-13-mini', use: { ...devices['iPhone 13 Mini'] } },
    { name: 'pixel-7',         use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // `astro preview` defaults to listening on localhost-only (IPv6), which
    // makes Playwright's `127.0.0.1` baseURL fail; pin the host explicitly.
    command: 'npx astro preview --host 127.0.0.1 --port 4322',
    url: 'http://127.0.0.1:4322/en/',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
