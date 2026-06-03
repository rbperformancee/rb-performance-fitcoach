const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    const url = 'file:///Users/rayan/Downloads/carrousel-saas/slide-1-video.mp4';
    const resp = await page.goto(url);
    console.log('status:', resp ? resp.status() : 'no resp');
    const buf = await resp.body();
    fs.writeFileSync('/tmp/calc.mp4', buf);
    console.log('OK', buf.length, 'bytes written to /tmp/calc.mp4');
  } catch (e) {
    console.error('FAIL:', e.message);
  }
  await browser.close();
})();
