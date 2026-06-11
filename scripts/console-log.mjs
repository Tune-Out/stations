import puppeteer from 'puppeteer-core';

const url = process.argv[2];

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--disable-gpu'],
});
const page = await browser.newPage();
page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'debug' || t === 'log' || t === 'info' || t === 'warning' || t === 'error') {
    console.log(`[${t}]`, msg.text());
  }
});
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
try {
  await page.waitForFunction(
    () => !document.querySelector('.loader-bar') && document.querySelector('.container'),
    { timeout: 60000 },
  );
} catch {}
await new Promise((r) => setTimeout(r, 2000));
await browser.close();
