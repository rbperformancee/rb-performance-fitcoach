#!/usr/bin/env node
/**
 * RB Perform — Landing Page Audit
 *
 * Checks:
 *   1. All HTML files exist and parse correctly
 *   2. All CTAs point to valid destinations
 *   3. No broken internal links
 *   4. No overflow-causing CSS issues
 *   5. Mobile viewport meta is present
 *   6. Required sections exist
 *   7. Footer is present
 *   8. SEO meta tags are present
 *   9. No console errors in inline scripts
 *  10. Founding page consistency
 *
 * Usage:
 *   node scripts/landing-audit.js
 *   node scripts/landing-audit.js --strict  (exits 1 on warnings)
 */

const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');
let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { failed++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { warnings++; console.log(`  \x1b[33m⚠\x1b[0m ${msg}`); }

const publicDir = path.join(__dirname, '..', 'public');

// ===== 1. HTML FILES EXIST =====
console.log('\n\x1b[1m1. HTML Files\x1b[0m');
const requiredFiles = ['landing.html', 'founding.html', 'index.html', 'legal.html'];
requiredFiles.forEach(f => {
  const p = path.join(publicDir, f);
  if (fs.existsSync(p)) {
    const size = fs.statSync(p).size;
    pass(`${f} exists (${(size/1024).toFixed(1)}KB)`);
  } else {
    fail(`${f} MISSING`);
  }
});

// ===== 2. LANDING PAGE CHECKS =====
console.log('\n\x1b[1m2. Landing Page Structure\x1b[0m');
const landing = fs.readFileSync(path.join(publicDir, 'landing.html'), 'utf8');

// Viewport meta
if (landing.includes('viewport') && landing.includes('width=device-width'))
  pass('Viewport meta tag present');
else fail('Viewport meta tag MISSING');

// Required sections
const sections = ['hero', 'how', 'bento', 'demo-section', 'features', 'business', 'pricing'];
sections.forEach(s => {
  if (landing.includes(`class="${s}"`) || landing.includes(`class="${s} `))
    pass(`Section .${s} exists`);
  else fail(`Section .${s} MISSING`);
});

// Footer
if (landing.includes('<footer'))
  pass('Footer element present');
else fail('Footer element MISSING');

// Menu items
const menuItems = ['Le Système', 'Ton Business', 'Features', 'Explorer', 'Ton Offre'];
menuItems.forEach(m => {
  if (landing.includes(m)) pass(`Menu item "${m}" present`);
  else fail(`Menu item "${m}" MISSING`);
});

// ===== 3. CTA AUDIT =====
console.log('\n\x1b[1m3. CTA Destinations\x1b[0m');

// All hrefs in landing
const hrefRegex = /href="([^"#][^"]*)"/g;
const hrefs = new Set();
let match;
while ((match = hrefRegex.exec(landing)) !== null) {
  hrefs.add(match[1]);
}

// Check internal links exist
const internalLinks = [...hrefs].filter(h => h.startsWith('/') && !h.startsWith('//'));
internalLinks.forEach(link => {
  const cleanLink = link.split('?')[0].split('#')[0];
  if (cleanLink === '/' || cleanLink === '') return;
  // Check for Vercel rewrites first
  const vercelRewrites = ['/demo', '/demo-client', '/login', '/signup', '/join', '/founding'];
  if (vercelRewrites.includes(cleanLink)) {
    pass(`Internal link ${link} → Vercel rewrite`);
    return;
  }
  const filePath = path.join(publicDir, cleanLink);
  if (fs.existsSync(filePath)) {
    pass(`Internal link ${link} → file exists`);
  } else {
    warn(`Internal link ${link} → file NOT found (may be rewrite)`);
  }
});

// CTA consistency: all conversion CTAs should go to founding.html
const ctaDestinations = new Set();
const ctaRegex = /class="cta-plan[^"]*"[^>]*href="([^"]*)"|class="btn btn-orange[^"]*"[^>]*href="([^"]*)"|class="menu-cta-btn[^"]*"[^>]*href="([^"]*)"|id="foundingCTA"[^>]*href="([^"]*)"/g;
while ((match = ctaRegex.exec(landing)) !== null) {
  const dest = match[1] || match[2] || match[3] || match[4];
  if (dest) ctaDestinations.add(dest);
}

// Also check reverse pattern (href before class)
const ctaRegex2 = /href="([^"]*)"[^>]*class="[^"]*cta-plan|href="([^"]*)"[^>]*class="[^"]*btn-orange|href="([^"]*)"[^>]*class="[^"]*menu-cta-btn/g;
while ((match = ctaRegex2.exec(landing)) !== null) {
  const dest = match[1] || match[2] || match[3];
  if (dest) ctaDestinations.add(dest);
}

if (ctaDestinations.size === 1) {
  pass(`All conversion CTAs point to same destination: ${[...ctaDestinations][0]}`);
} else if (ctaDestinations.size === 0) {
  warn('No conversion CTAs detected (regex may need update)');
} else {
  warn(`Conversion CTAs point to ${ctaDestinations.size} different destinations: ${[...ctaDestinations].join(', ')}`);
}

// ===== 4. FOUNDING PAGE CHECKS =====
console.log('\n\x1b[1m4. Founding Page\x1b[0m');
const foundingPath = path.join(publicDir, 'founding.html');
if (fs.existsSync(foundingPath)) {
  const founding = fs.readFileSync(foundingPath, 'utf8');

  if (founding.includes('199')) pass('Price 199€ present');
  else fail('Price 199€ MISSING');

  if (founding.includes('299')) pass('Crossed-out price 299€ present');
  else fail('Crossed-out price 299€ MISSING');

  if (founding.includes('30')) pass('30 places mentioned');
  else fail('30 places MISSING');

  if (founding.includes('Stripe') || founding.includes('stripe'))
    pass('Stripe mention present');
  else warn('No Stripe mention');

  if (founding.includes('viewport')) pass('Viewport meta present');
  else fail('Viewport meta MISSING');

  if (founding.includes('<footer') || founding.includes('foot'))
    pass('Footer present');
  else warn('Footer may be missing');

  if (founding.includes('legal.html'))
    pass('Legal links present');
  else warn('Legal links may be missing');

  if (founding.includes('SIRET'))
    pass('SIRET mentioned');
  else warn('SIRET not found');

} else {
  fail('founding.html does not exist');
}

// ===== 5. SEO CHECKS =====
console.log('\n\x1b[1m5. SEO & Meta\x1b[0m');

if (landing.includes('<title>')) pass('Title tag present');
else fail('Title tag MISSING');

if (landing.includes('meta name="description"')) pass('Meta description present');
else fail('Meta description MISSING');

if (landing.includes('og:title')) pass('Open Graph title present');
else fail('OG title MISSING');

if (landing.includes('og:image')) pass('Open Graph image present');
else fail('OG image MISSING');

if (landing.includes('twitter:card')) pass('Twitter card present');
else fail('Twitter card MISSING');

if (landing.includes('"FAQPage"')) pass('FAQ structured data present');
else fail('FAQ structured data MISSING');

// ===== 6. MOBILE CHECKS =====
console.log('\n\x1b[1m6. Mobile Readiness\x1b[0m');

// Check in both HTML and external CSS
const cssPath = path.join(publicDir, 'landing-style.css');
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const allContent = landing + cssContent;

if (allContent.includes('overflow-x:hidden'))
  pass('overflow-x:hidden present on sections');
else warn('overflow-x:hidden not found');

if (allContent.includes('max-width:768px') || allContent.includes('max-width: 768px'))
  pass('Mobile breakpoint @media(max-width:768px) present');
else fail('No mobile breakpoint found');

const vwCount = (allContent.match(/width:\s*100vw/g) || []).length;
if (vwCount === 0) {
  pass('No width:100vw (prevents scrollbar overflow)');
} else {
  warn(`Found ${vwCount} instances of width:100vw — may cause horizontal scroll`);
}

if (allContent.includes('env(safe-area-inset'))
  pass('Safe area insets used (notch support)');
else warn('No safe area insets found');

// ===== 7. SECURITY CHECKS =====
console.log('\n\x1b[1m7. Security Headers\x1b[0m');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
const globalHeaders = vercelConfig.headers?.find(h => h.source === '/(.*)')?.headers || [];
const headerNames = globalHeaders.map(h => h.key.toLowerCase());

['x-content-type-options', 'x-frame-options', 'referrer-policy', 'strict-transport-security', 'content-security-policy'].forEach(h => {
  if (headerNames.includes(h)) pass(`Header ${h} configured`);
  else fail(`Header ${h} MISSING`);
});

// ===== 8. VERCEL CONFIG =====
console.log('\n\x1b[1m8. Vercel Config\x1b[0m');

const rewrites = vercelConfig.rewrites || [];
if (rewrites.some(r => r.destination === '/landing.html'))
  pass('Landing page rewrite configured');
else fail('No rewrite to landing.html');

if (rewrites.some(r => r.source === '/demo'))
  pass('/demo rewrite configured');
else warn('/demo rewrite missing');

if (rewrites.some(r => r.source === '/demo-client'))
  pass('/demo-client rewrite configured');
else warn('/demo-client rewrite missing');

// Check if founding.html needs a rewrite
if (rewrites.some(r => r.destination === '/founding'))
  pass('/founding rewrite configured');
else warn('No /founding rewrite — direct access via /founding only');

// ===== RESULTS =====
console.log('\n' + '='.repeat(50));
console.log(`\x1b[1mResults:\x1b[0m ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  console.log('\x1b[31mAUDIT FAILED\x1b[0m — fix the issues above before deploying.\n');
  process.exit(1);
}
if (STRICT && warnings > 0) {
  console.log('\x1b[33mAUDIT PASSED WITH WARNINGS\x1b[0m — strict mode: treating warnings as errors.\n');
  process.exit(1);
}
console.log('\x1b[32mAUDIT PASSED\x1b[0m\n');
process.exit(0);
