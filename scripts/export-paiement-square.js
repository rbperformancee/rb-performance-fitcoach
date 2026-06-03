const { chromium } = require('playwright');
const path = require('path');
const OUT_DIR = '/Users/rayan/Downloads/fiche-tarifs';
const { execSync } = require('child_process');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('file:///Users/rayan/modalites-paiement-square.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: path.join(OUT_DIR, 'modalites-paiement.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });
  await page.screenshot({
    path: path.join(OUT_DIR, 'modalites-paiement.jpg'),
    type: 'jpeg',
    quality: 95,
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });

  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: path.join(OUT_DIR, 'modalites-paiement.pdf'),
    width: '1080px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    pageRanges: '1',
  });

  console.log('Exported paiement square (PNG + JPG + PDF)');
  await browser.close();
})();
