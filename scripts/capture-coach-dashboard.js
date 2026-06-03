const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/coach-dashboard-captures';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function dismissAllModals(page, label = '') {
  // Repeatedly click any forward CTA button in modals until none remain
  const BTN_TEXTS = [
    'SUITE', 'Suite',
    'VOIR SA FICHE', 'Voir sa fiche',
    'Terminer', 'TERMINER',
    "C'est parti", "C'EST PARTI",
    "J'ai compris", "J'AI COMPRIS",
    'Commencer', 'COMMENCER',
    'OK', 'Ok',
    'Fermer', 'FERMER',
    'Continuer', 'CONTINUER',
    '×',
  ];
  for (let i = 0; i < 20; i++) {
    let clicked = false;
    for (const t of BTN_TEXTS) {
      try {
        const btn = page.locator(`button:has-text("${t}")`).first();
        if (await btn.isVisible({ timeout: 600 })) {
          await btn.click({ timeout: 1500 });
          console.log('  ✓ clicked', t, label);
          await page.waitForTimeout(800);
          clicked = true;
          break;
        }
      } catch(e) {}
    }
    if (!clicked) {
      // try Escape as a fallback
      try { await page.keyboard.press('Escape'); await page.waitForTimeout(300); } catch(e) {}
      break;
    }
  }
}

(async () => {
  const browser = await chromium.launch();
  // Mobile viewport: PWA RB Perform is mobile-first — captures look natural in a phone frame
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
  });
  const page = await ctx.newPage();

  // Inject FR locale before page load (origin = rbperform.app)
  await page.goto('https://rbperform.app/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('rbperf_locale', 'fr');
    localStorage.setItem('rb_lang', 'fr');
  });

  console.log('→ /demo (auto-login coach démo, mobile viewport, locale FR)...');
  await page.goto('https://rbperform.app/demo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(7000);

  // Dismiss cookies if present
  try {
    await page.click('text=Accept all', { timeout: 2000 });
    await page.waitForTimeout(500);
  } catch(e) {}
  try {
    await page.click('text=Reject', { timeout: 1500 });
    await page.waitForTimeout(500);
  } catch(e) {}

  console.log('→ Cycling through onboarding...');
  await dismissAllModals(page, 'initial');
  await page.waitForTimeout(2000);
  await dismissAllModals(page, 'pass2');
  await page.waitForTimeout(1500);
  await dismissAllModals(page, 'pass3');
  await page.waitForTimeout(1500);

  console.log('Current URL:', page.url());

  // Capture clean dashboard (HOME)
  await page.screenshot({ path: path.join(OUT_DIR, 'm-00-home.png'), fullPage: false });
  await page.screenshot({ path: path.join(OUT_DIR, 'm-00-home-full.png'), fullPage: true });
  console.log('✓ m-00-home');

  // Now click bottom nav by aria-label
  const navItems = [
    { aria: ['Home', 'Accueil'], name: 'm-01-home-nav' },
    { aria: ['Clients'], name: 'm-02-clients' },
    { aria: ['Prog', 'Plan'], name: 'm-03-plan' },
    { aria: ['Business'], name: 'm-04-business' },
    { aria: ['Plus', 'More'], name: 'm-05-more' },
  ];

  // EN→FR text replacement (for stale i18n strings on Programmes page)
  const FR_MAP = [
    ['Programs.', 'Programmes.'],
    ['Programs', 'Programmes'],
    ['programs', 'programmes'],
    ['Search a program or client...', 'Cherche un programme ou un client...'],
    [/^Active$/, 'Actifs'],
    [/^Archived$/, 'Archivés'],
    [/^All$/, 'Tous'],
    [/^Edit$/, 'Modifier'],
    [/^\+ Duplicate$/, '+ Dupliquer'],
    [/^Duplicate$/, 'Dupliquer'],
    ['ARCHIVED', 'ARCHIVÉ'],
    ['Created ', 'Créé il y a '],
    [/(\d+)d ago/g, 'il y a $1j'],
    [/(\d+) active/g, '$1 actifs'],
    [/(\d+) archived/g, '$1 archivés'],
  ];

  async function frenchifyDOM(page) {
    await page.evaluate((rules) => {
      const walk = (node) => {
        if (node.nodeType === 3) { // text node
          let txt = node.nodeValue;
          for (const [from, to] of rules) {
            if (from instanceof RegExp || /^\/.+\/[gimuy]*$/.test(from)) {
              const re = from instanceof RegExp ? from : new RegExp(from.slice(1, -1), 'g');
              txt = txt.replace(re, to);
            } else if (typeof from === 'string') {
              txt = txt.split(from).join(to);
            }
          }
          node.nodeValue = txt;
        } else if (node.nodeType === 1) {
          for (const child of Array.from(node.childNodes)) walk(child);
        }
      };
      walk(document.body);
    }, rules => rules ? rules : null, FR_MAP.map(([f, t]) => [
      f instanceof RegExp ? { __re: f.source, __flags: f.flags } : f,
      t,
    ]).map(([f, t]) => [f && f.__re ? new RegExp(f.__re, f.__flags) : f, t]));
  }

  for (const it of navItems) {
    try {
      const ariaSel = it.aria.map(a => `[aria-label="${a}"]`).join(', ');
      const btn = page.locator(ariaSel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click({ force: true });
        console.log('  → clicked nav', it.aria.join('/'));
        await page.waitForTimeout(2500);
        // dismiss any popup
        try { await page.keyboard.press('Escape'); await page.waitForTimeout(300); } catch(e) {}
        await dismissAllModals(page, it.aria);
        await page.waitForTimeout(1000);

        // Frenchify DOM (handles stale EN strings on some pages)
        await page.evaluate(() => {
          const replaceMap = [
            ['Programs.', 'Programmes.'],
            ['Programs', 'Programmes'],
            ['programs', 'programmes'],
            ['Search a program or client...', 'Cherche un programme ou un client...'],
            ['ARCHIVED', 'ARCHIVÉ'],
            ['Created ', 'Créé '],
          ];
          const exactReplace = {
            'Active': 'Actifs',
            'Archived': 'Archivés',
            'All': 'Tous',
            'Edit': 'Modifier',
            '+ Duplicate': '+ Dupliquer',
            'Duplicate': 'Dupliquer',
          };
          const regexReplace = [
            [/(\d+)d ago/g, 'il y a $1j'],
            [/(\d+) active/g, '$1 actifs'],
            [/(\d+) archived/g, '$1 archivés'],
            [/^Created (.+)/g, 'Créé $1'],
          ];
          const walk = (node) => {
            if (node.nodeType === 3) {
              let txt = node.nodeValue;
              const original = txt;
              for (const [f, t] of replaceMap) txt = txt.split(f).join(t);
              for (const [re, t] of regexReplace) txt = txt.replace(re, t);
              const trimmed = txt.trim();
              if (exactReplace[trimmed]) txt = txt.replace(trimmed, exactReplace[trimmed]);
              if (txt !== original) node.nodeValue = txt;
            } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
              for (const child of Array.from(node.childNodes)) walk(child);
            }
          };
          walk(document.body);
        });
        await page.waitForTimeout(300);

        await page.screenshot({ path: path.join(OUT_DIR, it.name + '.png'), fullPage: false });
        await page.screenshot({ path: path.join(OUT_DIR, it.name + '-full.png'), fullPage: true });
        console.log('  ✓', it.name);
      } else {
        console.log('  ⚠', it.aria, 'not visible');
      }
    } catch(e) {
      console.log('  ⚠', it.aria, 'fail:', e.message.slice(0,60));
    }
  }

  // Try clicking a client card from CLIENTS tab to capture fiche client
  try {
    const clientsBtn = page.locator('button[aria-label="Clients"]').first();
    if (await clientsBtn.isVisible({ timeout: 1500 })) {
      await clientsBtn.click({ force: true });
      await page.waitForTimeout(2500);
      // click first client card
      const firstCard = page.locator('button:has-text("VOIR SA FICHE"), [role="button"]:has-text("VOIR"), .client-card, [data-testid*="client"]').first();
      if (await firstCard.isVisible({ timeout: 2000 })) {
        await firstCard.click({ force: true });
        await page.waitForTimeout(3000);
        await dismissAllModals(page, 'client-fiche');
        await page.screenshot({ path: path.join(OUT_DIR, 'm-06-fiche-client.png'), fullPage: false });
        await page.screenshot({ path: path.join(OUT_DIR, 'm-06-fiche-client-full.png'), fullPage: true });
        console.log('  ✓ m-06-fiche-client');
      }
    }
  } catch(e) {
    console.log('  ⚠ fiche client fail:', e.message.slice(0,60));
  }

  // List visible nav for debug
  const nav = await page.$$eval('button, a, [role="tab"]', els =>
    els.map(e => ({
      text: (e.innerText || '').slice(0,40).trim(),
      aria: e.getAttribute('aria-label') || ''
    })).filter(l => l.text || l.aria).slice(0, 30)
  );
  console.log('\nFinal nav:', JSON.stringify(nav, null, 2).slice(0, 1500));

  await browser.close();
  console.log('\nDone. Output:', OUT_DIR);
})();
