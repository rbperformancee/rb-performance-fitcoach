// Crop photo Rayan en 1:1 cadre visage (gravity 'north' = haut de l'image
// car le visage est en haut/centre dans le cadrage source 4645x3451).
const sharp = require('sharp');
const fs = require('fs');
const src = 'public/rayan-portrait.jpg';
const sizes = [240, 480, 720, 1080];
(async () => {
  for (const s of sizes) {
    const out = `public/rayan-portrait-${s}.webp`;
    await sharp(src)
      .resize({ width: s, height: s, fit: 'cover', position: 'north' })
      .webp({ quality: 88, effort: 6 })
      .toFile(out);
    console.log(`✓ ${out}  (${(fs.statSync(out).size/1024).toFixed(0)}KB)`);
  }
})().catch(e => { console.error(e); process.exit(1); });
