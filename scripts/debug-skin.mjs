import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
const origin = 'http://127.0.0.1:4321';
page.on('console', (m) => console.log('  [page]', m.type(), m.text()));
await page.goto(origin + '/en/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('tuneout.skin', JSON.stringify('solarpunk')));
const got = await page.evaluate(() => localStorage.getItem('tuneout.skin'));
console.log('localStorage after set:', got);

await page.goto(origin + '/en/', { waitUntil: 'networkidle2', timeout: 30000 });
const attrs = await page.evaluate(() => ({
  htmlSkin: document.documentElement.getAttribute('data-theme-skin'),
  link: document.getElementById('theme-skin')?.href ?? null,
  links: Array.from(document.querySelectorAll('link[rel=stylesheet]')).map((l) => l.href),
}));
console.log('after nav:', JSON.stringify(attrs, null, 2));

await page.waitForFunction(() => !document.querySelector('.loader-bar') && document.querySelector('.container'), { timeout: 30000 });
const final = await page.evaluate(() => ({
  bg: getComputedStyle(document.body).backgroundColor,
  fg: getComputedStyle(document.body).color,
  skin: document.documentElement.getAttribute('data-theme-skin'),
}));
console.log('final:', JSON.stringify(final, null, 2));
await browser.close();
