const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/stories-app';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const stories = [
  { html: '/Users/rayan/story-2-probleme-athlete.html', name: 'story-2-probleme' },
  { html: '/Users/rayan/story-3-methode-app.html', name: 'story-3-methode' },
  { html: '/Users/rayan/story-4-cta-candidature.html', name: 'story-4-cta' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  for (const s of stories) {
    const page = await ctx.newPage();
    await page.goto('file://' + s.html);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, s.name + '.jpg'), type: 'jpeg', quality: 95, clip: { x:0, y:0, width:1080, height:1920 } });
    await page.screenshot({ path: path.join(OUT_DIR, s.name + '.png'), type: 'png', clip: { x:0, y:0, width:1080, height:1920 } });
    console.log('Exported:', s.name);
    await page.close();
  }
  await browser.close();
})();
