// Generate responsive WebP variants for the hero images (Lighthouse).
// Run: node scripts/resize-hero-images.js
// Output: public/<stem>-<bp>.webp for bp in [480, 720, 1080, 1440].
const sharp = require('sharp');
const fs = require('fs');

const targets = [
  { src: 'public/macbook_coach.webp', stem: 'macbook_coach' },
  { src: 'public/iphone_client.webp', stem: 'iphone_client' },
];

const breakpoints = [480, 720, 1080, 1440];

(async () => {
  for (const t of targets) {
    for (const bp of breakpoints) {
      const out = `public/${t.stem}-${bp}.webp`;
      await sharp(t.src)
        .resize({ width: bp, withoutEnlargement: true })
        .webp({ quality: 85, effort: 6 })
        .toFile(out);
      const size = fs.statSync(out).size;
      console.log(`✓ ${out}  (${(size/1024).toFixed(0)}KB)`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
