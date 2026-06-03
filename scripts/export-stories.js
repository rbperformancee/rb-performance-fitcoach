/**
 * Export stories Instagram en JPEG 1080x1920.
 *
 * Charge stories-perte-gras.html, screenshot chaque <div class="story">
 * en JPEG natif, sauve dans /Users/rayan/stories-output/.
 *
 * Usage : node /Users/rayan/fitcoach_updated/scripts/export-stories.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = '/Users/rayan/stories-perte-gras.html';
const OUTPUT_DIR = '/Users/rayan/stories-output';

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { width: 1200, height: 2000 },
  });
  const page = await context.newPage();

  const url = `file://${HTML_PATH}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  // Attendre Google Fonts + images
  await page.waitForTimeout(3000);

  const stories = await page.$$('.story');
  console.log(`\nStories perte de gras — ${stories.length} stories à exporter`);

  for (let i = 0; i < stories.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    const outputPath = path.join(OUTPUT_DIR, `story-${num}.jpg`);
    await stories[i].screenshot({ path: outputPath, type: 'jpeg', quality: 92 });
    console.log(`  ✓ story-${num}.jpg`);
  }

  await browser.close();
  console.log(`\n✅ ${stories.length} JPEG exportés dans : ${OUTPUT_DIR}`);
})().catch((err) => {
  console.error('❌ Export failed :', err.message);
  process.exit(1);
});
