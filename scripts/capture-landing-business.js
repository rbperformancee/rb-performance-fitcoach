const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/app-captures';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  console.log('→ Loading https://rbperform.app...');
  await page.goto('https://rbperform.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Accept cookies if present
  try {
    await page.click('text=Accept all', { timeout: 3000 });
    console.log('✓ Cookies accepted');
    await page.waitForTimeout(800);
  } catch(e) { console.log('— no cookie banner'); }

  // Click ENTER
  try {
    await page.click('text=ENTER', { timeout: 5000 });
    console.log('✓ Clicked ENTER');
    await page.waitForTimeout(3000);
  } catch(e) {
    try {
      await page.click('text=enter', { timeout: 3000 });
      console.log('✓ Clicked enter (lowercase)');
      await page.waitForTimeout(3000);
    } catch(e2) {
      console.log('⚠ Could not click ENTER:', e.message);
    }
  }

  // Capture current URL
  console.log('Current URL:', page.url());

  // Capture full page after ENTER
  await page.screenshot({ path: path.join(OUT_DIR, 'landing-after-enter-full.png'), fullPage: true });
  console.log('✓ landing-after-enter-full.png');

  // Get total page height
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('Page height:', totalHeight, 'px');

  // Slice screenshots every 900px
  for (let y = 0; y < totalHeight; y += 850) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(1500);
    const fileName = `landing-slice-${String(Math.floor(y/850)).padStart(2,'0')}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, fileName), clip: { x:0, y:0, width:1440, height: 900 } });
    console.log('✓', fileName, '@ scroll y=', y);
  }

  await browser.close();
  console.log('\nDone. Output:', OUT_DIR);
})();
