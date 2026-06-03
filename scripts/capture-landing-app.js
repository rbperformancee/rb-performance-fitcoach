const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/app-captures';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  console.log('→ Capturing rbperform.app landing...');
  await page.goto('https://rbperform.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Full page screenshot
  await page.screenshot({ path: path.join(OUT_DIR, 'landing-full.png'), fullPage: true });
  console.log('✓ landing-full.png');

  // Above the fold (hero with animation)
  await page.screenshot({ path: path.join(OUT_DIR, 'landing-hero.png'), clip: { x:0, y:0, width:1440, height:900 } });
  console.log('✓ landing-hero.png');

  // Try mobile viewport for iPhone-style hero
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto('https://rbperform.app', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2500);
  await mobilePage.screenshot({ path: path.join(OUT_DIR, 'landing-mobile.png'), fullPage: true });
  console.log('✓ landing-mobile.png');

  // Try founding page
  try {
    await page.goto('https://rbperform.app/founding', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, 'founding-full.png'), fullPage: true });
    console.log('✓ founding-full.png');
  } catch(e) { console.log('⚠ founding page failed:', e.message); }

  // Try demo
  try {
    await page.goto('https://rbperform.app/demo-client', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT_DIR, 'demo-client-full.png'), fullPage: true });
    console.log('✓ demo-client-full.png');
  } catch(e) { console.log('⚠ demo-client failed:', e.message); }

  await browser.close();
  console.log('\nOutput:', OUT_DIR);
})();
