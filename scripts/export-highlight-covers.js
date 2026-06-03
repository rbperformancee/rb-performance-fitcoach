const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/stories-app';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const covers = [
  { word: 'MÉTHODE', size: 165, file: 'cover-1-methode' },
  { word: 'APP',     size: 280, file: 'cover-2-app' },
  { word: 'EBOOK',   size: 220, file: 'cover-3-ebook' },
  { word: 'RÉSULTATS', size: 135, file: 'cover-4-resultats' },
  { word: 'TRAINING',size: 155, file: 'cover-5-training' },
  { word: 'RUN',     size: 280, file: 'cover-6-run' },
  { word: 'RUGBY',   size: 220, file: 'cover-7-rugby' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  for (const c of covers) {
    const page = await ctx.newPage();
    await page.goto('file:///Users/rayan/highlight-cover-template.html');
    await page.waitForLoadState('networkidle');
    await page.evaluate(({ word, size }) => {
      const el = document.getElementById('word');
      el.innerHTML = `${word}<span class="dot">.</span>`;
      el.style.fontSize = `${size}px`;
    }, c);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, c.file + '.jpg'), type: 'jpeg', quality: 95, clip: { x:0, y:0, width:1080, height:1080 } });
    await page.screenshot({ path: path.join(OUT_DIR, c.file + '.png'), type: 'png', clip: { x:0, y:0, width:1080, height:1080 } });
    console.log('Exported:', c.file);
    await page.close();
  }
  await browser.close();
})();
