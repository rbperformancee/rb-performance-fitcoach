const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/stories-app';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('file:///Users/rayan/story-highlight-b2c.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(OUT_DIR, 'highlight-b2c.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  await page.screenshot({
    path: path.join(OUT_DIR, 'highlight-b2c.jpg'),
    type: 'jpeg',
    quality: 95,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log('Exported highlight-b2c');
  await browser.close();
})();
