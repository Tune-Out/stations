/**
 * Mobile-width regression suite.
 *
 * Mobile is a core use case: Tune Out must never ship a build where any of
 * the main routes overflow the viewport horizontally on a phone-sized
 * screen. This suite walks every primary route at iPhone 13 Mini / Pixel 7
 * sizes and asserts that:
 *
 *   1. `document.documentElement.scrollWidth <= window.innerWidth` — no
 *      visible horizontal scroll.
 *   2. No element with computed `overflow-x: visible` has scrollWidth
 *      greater than the viewport — i.e., nothing is *intrinsically* wider
 *      than the screen and being clipped by the page-level `overflow-x:
 *      clip` safety net. Catching this matters because relying on that
 *      safety net hides layout bugs from users with screen readers and
 *      sometimes causes touch-scroll jank.
 *
 * If either assertion fails, the test prints the worst offenders so a
 * contributor can find the bad rule quickly.
 *
 * Rails (`overflow-x: auto`) and the search results list are excluded —
 * those are *deliberate* horizontal scrollers, not layout bugs.
 */
import { expect, test } from '@playwright/test';

const ROUTES = [
  '/en/',
  '/en/browse',
  '/en/search',
  '/en/station/9617a958-0601-11e8-ae97-52543be04c81',
  '/en/about',
  '/en/downloads',
];

async function gatherOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders: { sel: string; clientWidth: number; scrollWidth: number }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      // Skip legitimate horizontal-scroll containers and their descendants.
      if ((el as Element).closest('.rail-scroller, .results-list, [data-allow-x-scroll]')) continue;
      const sw = el.scrollWidth;
      const cw = el.clientWidth;
      if (sw > cw + 0.5 && sw > vw) {
        const cs = getComputedStyle(el);
        if (cs.overflowX === 'visible') {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? '#' + el.id : '';
          const cls = el.className
            ? '.' + String(el.className).split(/\s+/).slice(0, 2).join('.')
            : '';
          offenders.push({ sel: `${tag}${id}${cls}`, clientWidth: cw, scrollWidth: sw });
        }
      }
    }
    return {
      viewport: vw,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders,
    };
  });
}

for (const route of ROUTES) {
  test(`mobile fit: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    // Give the SPA a moment to settle after the 404-fallback hydration path.
    await page.waitForTimeout(800);

    const report = await gatherOverflow(page);

    // 1. No visible horizontal scroll.
    expect(
      report.documentScrollWidth,
      `document scrollWidth ${report.documentScrollWidth} exceeds viewport ${report.viewport}`,
    ).toBeLessThanOrEqual(report.viewport);

    // 2. No intrinsic overflow on any non-scrollable element.
    if (report.offenders.length > 0) {
      const lines = report.offenders
        .slice(0, 8)
        .map((o) => `  ${o.sel}  client=${o.clientWidth} scroll=${o.scrollWidth}`)
        .join('\n');
      throw new Error(
        `Intrinsic overflow on ${route} at viewport ${report.viewport}px:\n${lines}`,
      );
    }
  });
}
