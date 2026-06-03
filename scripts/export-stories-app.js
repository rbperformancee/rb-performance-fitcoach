const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = '/Users/rayan/Downloads/stories-app';
const fs = require('fs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const stories = [
  { html: '/Users/rayan/story-1-annonce-app.html', name: 'story-1-annonce' },
  { html: '/Users/rayan/story-2-demo-app.html', name: 'story-2-demo' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2,
  });
  for (const s of stories) {
    const page = await ctx.newPage();
    await page.goto('file://' + s.html);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT_DIR, s.name + '.png'),
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
    await page.screenshot({
      path: path.join(OUT_DIR, s.name + '.jpg'),
      type: 'jpeg',
      quality: 95,
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
    console.log('Exported:', s.name);
    await page.close();
  }
  await browser.close();
})();
