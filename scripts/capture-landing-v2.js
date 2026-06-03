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
  try { await page.click('text=Accept all', { timeout: 3000 }); await page.waitForTimeout(500); } catch(e) {}
  try { await page.click('text=ENTER', { timeout: 5000 }); await page.waitForTimeout(3000); } catch(e) {}

  // Force scroll using keyboard/wheel to bypass snap
  for (let i = 0; i < 15; i++) {
    const fileName = `landing-step-${String(i).padStart(2,'0')}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, fileName), clip: { x:0, y:0, width:1440, height: 900 } });
    console.log('✓', fileName);
    // Scroll using wheel
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(1800);
  }

  // Finally try full page
  const totalH = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('Final scroll height:', totalH);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, 'landing-final-fullpage.png'), fullPage: true });
  console.log('✓ landing-final-fullpage.png');

  await browser.close();
  console.log('\nDone. Output:', OUT_DIR);
})();
