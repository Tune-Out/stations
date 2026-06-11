import puppeteer from 'puppeteer-core';

const url = process.argv[2];
const out = process.argv[3];
const width = Number(process.argv[4] || 1400);
const height = Number(process.argv[5] || 1600);
const skin = process.argv[6]; // optional — pre-seeds tuneout.skin

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width, height });

if (skin) {
  const origin = new URL(url).origin;
  await page.goto(origin + '/en/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((s) => {
    localStorage.setItem('tuneout.skin', JSON.stringify(s));
  }, skin);
}

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
try {
  await page.waitForFunction(
    () => !document.querySelector('.loader-bar') && document.querySelector('.container'),
    { timeout: 60000 },
  );
} catch (e) {
  console.warn('wait timed out — taking screenshot anyway');
}
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log('wrote', out);
