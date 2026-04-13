#!/usr/bin/env node
/**
 * generate-og-image.js — Genere public/og-image.png (1200x630) pour les partages
 * sociaux (Twitter, LinkedIn, WhatsApp, Messenger, iMessage, Slack).
 *
 * Usage:
 *   node scripts/generate-og-image.js
 *
 * Prerequis : sharp installe (npm install --no-save sharp).
 *
 * Design :
 *   - Fond #030303 avec gradient radial subtil vers centre
 *   - Logo RB (cercle avec monogramme) centre en haut
 *   - Wordmark "RB PERFORM" en 900 weight
 *   - Tagline "La performance sans compromis."
 *   - Accent orange #f97316 sur le point final
 *   - Microcopy footer avec URL
 */

const fs = require("fs");
const path = require("path");

const WIDTH = 1200;
const HEIGHT = 630;
const BG = "#030303";
const FG = "#ffffff";
const DIM = "#8a8a8a";
const ORANGE = "#f97316";
const TEAL = "#02d1ba";

// ===== SVG =====
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#0a0a0a" stop-opacity="1"/>
      <stop offset="60%" stop-color="${BG}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="orangeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ORANGE}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${ORANGE}"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Fond avec glow radial subtil -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGlow)"/>

  <!-- Halo orange derriere le logo -->
  <circle cx="600" cy="220" r="180" fill="url(#orangeGlow)"/>

  <!-- Grille subtile en overlay (bande gauche) -->
  <g stroke="rgba(255,255,255,0.04)" stroke-width="1">
    <line x1="0" y1="100" x2="${WIDTH}" y2="100"/>
    <line x1="0" y1="530" x2="${WIDTH}" y2="530"/>
  </g>

  <!-- Logo : cercle avec monogramme "RB" -->
  <g transform="translate(600, 220)" filter="url(#softShadow)">
    <circle r="68" fill="url(#logoGrad)"/>
    <circle r="68" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text
      x="0" y="0"
      text-anchor="middle"
      dominant-baseline="central"
      font-family="-apple-system, SF Pro Display, Inter, system-ui, sans-serif"
      font-weight="900"
      font-size="44"
      letter-spacing="-1"
      fill="#0a0a0a"
    >RB</text>
  </g>

  <!-- Wordmark : "RB PERFORM" -->
  <text
    x="600" y="380"
    text-anchor="middle"
    font-family="-apple-system, SF Pro Display, Inter, system-ui, sans-serif"
    font-weight="900"
    font-size="82"
    letter-spacing="-3"
    fill="${FG}"
  >RB PERFORM</text>

  <!-- Separateur orange -->
  <line x1="540" y1="410" x2="660" y2="410" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round"/>

  <!-- Tagline -->
  <text
    x="600" y="475"
    text-anchor="middle"
    font-family="-apple-system, SF Pro Display, Inter, system-ui, sans-serif"
    font-weight="500"
    font-size="30"
    letter-spacing="-0.5"
    fill="${FG}"
  >La performance sans compromis<tspan fill="${ORANGE}">.</tspan></text>

  <!-- Footer microcopy -->
  <g transform="translate(600, 565)">
    <text
      x="0" y="0"
      text-anchor="middle"
      font-family="-apple-system, SF Mono, Menlo, monospace"
      font-weight="600"
      font-size="13"
      letter-spacing="4"
      fill="${DIM}"
    >COACHING PREMIUM · SUIVI PERSONNALISE · PWA</text>
  </g>

  <!-- Petit accent teal en haut a gauche (signature) -->
  <g transform="translate(60, 60)">
    <circle r="4" fill="${TEAL}"/>
    <text
      x="14" y="0"
      dominant-baseline="central"
      font-family="-apple-system, SF Mono, Menlo, monospace"
      font-weight="700"
      font-size="12"
      letter-spacing="3"
      fill="${DIM}"
    >RB.PERFORM</text>
  </g>
</svg>`;

// ===== Generation =====
(async () => {
  const outPath = path.join(__dirname, "..", "public", "og-image.png");
  const svgPath = path.join(__dirname, "..", "public", "og-image.svg");

  // Sauvegarde SVG source (editable pour iterations futures)
  fs.writeFileSync(svgPath, svg, "utf-8");
  // eslint-disable-next-line no-console
  console.log(`[ok] SVG source : ${path.relative(process.cwd(), svgPath)}`);

  let sharp;
  try {
    sharp = require("sharp");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("\n[err] sharp non installe.");
    // eslint-disable-next-line no-console
    console.error("      Installe-le avec : npm install --no-save sharp\n");
    process.exit(1);
  }

  await sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .png({ compressionLevel: 9, quality: 95 })
    .toFile(outPath);

  const stats = fs.statSync(outPath);
  // eslint-disable-next-line no-console
  console.log(`[ok] PNG      : ${path.relative(process.cwd(), outPath)} (${(stats.size / 1024).toFixed(1)} KB)`);
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[err]", e);
  process.exit(1);
});
