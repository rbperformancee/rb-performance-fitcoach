// Crop transformations en 3:4 portrait avec extracts pixel-precis
// pour centrer le body sur chaque before (smart-attention donnait des resultats
// inconsistants sur les body shots).
const sharp = require('sharp');
const fs = require('fs');
const items = [
  // Senan : source 1856x2048, body centerline ~x=920, 3:4 → w=1536 from h=2048
  // extract centred horizontalement (left=160)
  { src: 'public/transfo-1-before.jpg', stem: 'transfo-1-before', extract: { left: 160, top: 0, width: 1536, height: 2048 } },
  { src: 'public/transfo-1-after.jpg',  stem: 'transfo-1-after',  position: 'center' },
  // Mael : source 590x554, body centerline ~x=295, 3:4 → w=416 from h=554
  // extract centré horizontalement (left=87)
  { src: 'public/transfo-2-before.jpg', stem: 'transfo-2-before', extract: { left: 87, top: 0, width: 416, height: 554 } },
  { src: 'public/transfo-2-after.jpg',  stem: 'transfo-2-after',  position: 'center' },
  // Léo : source 590x1026, ratio 0.575 (très portrait), 3:4 → h=787 from w=590
  // extract avec top=80 → garde le visage visible et descend pour montrer torse + cuisses
  { src: 'public/transfo-3-before.jpg', stem: 'transfo-3-before', extract: { left: 0, top: 80, width: 590, height: 787 } },
  { src: 'public/transfo-3-after.jpg',  stem: 'transfo-3-after',  position: 'center' },
];
const widths = [400, 800];
(async () => {
  for (const { src, stem, position, extract } of items) {
    for (const w of widths) {
      const h = Math.round(w * 4 / 3);
      const out = `public/${stem}-${w}.webp`;
      let pipeline = sharp(src);
      if (extract) {
        pipeline = pipeline.extract(extract);
      }
      pipeline = pipeline.resize({
        width: w,
        height: h,
        fit: 'cover',
        position: position || 'center',
      });
      await pipeline.webp({ quality: 86, effort: 6 }).toFile(out);
      console.log(`✓ ${out}  (${(fs.statSync(out).size/1024).toFixed(0)}KB)`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
