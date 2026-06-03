const { chromium } = require('playwright');
const path = require('path');

const files = [
  { html: '/Users/rayan/fiche-tarifs-bras-croises.html', out: 'fiche-tarifs-bras-croises' },
  { html: '/Users/rayan/fiche-tarifs-torse-nu.html', out: 'fiche-tarifs-torse-nu' },
];

const OUT_DIR = '/Users/rayan/Downloads/fiche-tarifs';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2,
  });
  for (const f of files) {
    const page = await ctx.newPage();
    await page.goto('file://' + f.html);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT_DIR, f.out + '.png'),
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
    await page.screenshot({
      path: path.join(OUT_DIR, f.out + '.jpg'),
      type: 'jpeg',
      quality: 95,
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
    console.log('Exported:', f.out);
    await page.close();
  }
  await browser.close();
})();
