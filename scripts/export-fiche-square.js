const { chromium } = require('playwright');
const path = require('path');
const OUT_DIR = '/Users/rayan/Downloads/fiche-tarifs-b2c';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('file:///Users/rayan/fiche-tarifs-square.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(OUT_DIR, 'fiche-tarifs-square.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });
  await page.screenshot({
    path: path.join(OUT_DIR, 'fiche-tarifs-square.jpg'),
    type: 'jpeg',
    quality: 95,
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });
  console.log('Exported square');
  await browser.close();
})();
