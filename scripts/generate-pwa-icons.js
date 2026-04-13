#!/usr/bin/env node
/**
 * generate-pwa-icons.js — Regenere les 3 icones PWA au bon format
 * a partir de public/icon.svg.
 *
 * Cibles :
 *   - public/icon-192.png              (192x192, Android home screen "any")
 *   - public/icon-512.png              (512x512, Android splash screen "any")
 *   - public/icon-maskable-192.png     (192x192, safe zone OS clip)
 *   - public/icon-maskable-512.png     (512x512, safe zone OS clip)
 *   - public/apple-touch-icon.png      (180x180, iOS home screen)
 *   - public/favicon-32.png / 16.png   (onglet navigateur)
 *
 * Usage :
 *   npm install --no-save sharp
 *   node scripts/generate-pwa-icons.js
 */

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SVG_PATH = path.join(PUBLIC_DIR, "icon.svg");

const TARGETS = [
  { name: "icon-192.png", size: 192, source: "icon.svg" },
  { name: "icon-512.png", size: 512, source: "icon.svg" },
  { name: "apple-touch-icon.png", size: 180, source: "icon.svg" },
  { name: "icon-maskable-192.png", size: 192, source: "icon-maskable.svg" },
  { name: "icon-maskable-512.png", size: 512, source: "icon-maskable.svg" },
  { name: "favicon-32.png", size: 32, source: "icon.svg" },
  { name: "favicon-16.png", size: 16, source: "icon.svg" },
];

(async () => {
  let sharp;
  try { sharp = require("sharp"); }
  catch (e) {
    // eslint-disable-next-line no-console
    console.error("[err] sharp non installe. Run : npm install --no-save sharp");
    process.exit(1);
  }

  const sources = new Map();

  for (const t of TARGETS) {
    const outPath = path.join(PUBLIC_DIR, t.name);
    if (!sources.has(t.source)) {
      sources.set(t.source, fs.readFileSync(path.join(PUBLIC_DIR, t.source)));
    }
    await sharp(sources.get(t.source))
      .resize(t.size, t.size, { fit: "contain", background: { r: 13, g: 13, b: 13, alpha: 1 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    const stats = fs.statSync(outPath);
    // eslint-disable-next-line no-console
    console.log(`[ok] ${t.name.padEnd(24)} ${t.size}x${t.size} — ${(stats.size / 1024).toFixed(1)} KB`);
  }

  // eslint-disable-next-line no-console
  console.log("\nFavicon.ico multi-size : combine favicon-16.png + favicon-32.png");
  // eslint-disable-next-line no-console
  console.log("Commande macOS : `sips -s format ico public/favicon-32.png --out public/favicon.ico`");
  // eslint-disable-next-line no-console
  console.log("Ou laisser le navigateur utiliser icon.svg en fallback (defini dans index.html).");
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[err]", e);
  process.exit(1);
});
