/**
 * Export carrousels Instagram en PNG 1080x1080.
 *
 * Lance les 4 fichiers HTML du vault Obsidian, screenshot chaque
 * <div class="slide"> en PNG natif, sauve dans output/.
 *
 * Usage : node scripts/export-carrousels.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_DIR = '/Users/rayan/Library/CloudStorage/OneDrive-Personnel/Documents/RB PERFORM APP/OBSIDIAN/RB-Perform/02_Marketing/Instagram/Carrousels';
const OUTPUT_DIR = path.join(BASE_DIR, 'output');

const FILES = [
  'W-1-cinq-erreurs-business-coachs.html',
  'W-2-coach-bon-business-pauvre.html',
  'W-3-quarante-sept-mille-euros.html',
  'W-4-vendre-temps-pas-expertise.html',
  'W-5-industrie-coaching-bulle.html',
  'W-6-trois-questions-clients-jamais.html',
  'W-7-math-du-plafond.html',
  'J-7-le-vrai-probleme.html',
  'J-5-pourquoi-rien-existe.html',
];

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { width: 1200, height: 1200 },
  });
  const page = await context.newPage();

  let total = 0;
  for (const file of FILES) {
    const baseName = file.replace('.html', '');
    const filePath = path.join(BASE_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ ${file} introuvable, skip`);
      continue;
    }
    // Extrait le prefixe (W-1, W-2, J-7, etc) depuis le nom de fichier.
    // baseName "W-1-cinq-erreurs-business-coachs" -> prefix "W-1"
    const prefix = baseName.split('-').slice(0, 2).join('-');
    const subDir = path.join(OUTPUT_DIR, prefix);
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

    const url = `file://${filePath}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    // Attendre que les Google Fonts soient chargées
    await page.waitForTimeout(2000);

    const slides = await page.$$('.slide');
    console.log(`\n${baseName} — ${slides.length} slides → ${prefix}/`);

    for (let i = 0; i < slides.length; i++) {
      const num = String(i + 1).padStart(2, '0');
      const outputPath = path.join(subDir, `${baseName}-${num}.png`);
      await slides[i].screenshot({ path: outputPath });
      console.log(`  ✓ ${prefix}/${path.basename(outputPath)}`);
      total++;
    }
  }

  await browser.close();
  console.log(`\n✅ ${total} PNG exportés dans : ${OUTPUT_DIR}`);
})().catch((err) => {
  console.error('❌ Export failed :', err.message);
  process.exit(1);
});
