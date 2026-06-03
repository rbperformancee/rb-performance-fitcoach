const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/coach-dashboard-captures';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function dismissAllModals(page, label = '') {
  const BTN_TEXTS = ['SUITE','Suite','VOIR SA FICHE','Voir sa fiche','Terminer','TERMINER',"C'est parti","C'EST PARTI","J'ai compris","J'AI COMPRIS",'Commencer','COMMENCER','OK','Ok','Fermer','FERMER','Continuer','CONTINUER','×'];
  for (let i = 0; i < 20; i++) {
    let clicked = false;
    for (const t of BTN_TEXTS) {
      try {
        const btn = page.locator(`button:has-text("${t}")`).first();
        if (await btn.isVisible({ timeout: 600 })) {
          await btn.click({ timeout: 1500 });
          await page.waitForTimeout(800);
          clicked = true;
          break;
        }
      } catch(e) {}
    }
    if (!clicked) { try { await page.keyboard.press('Escape'); await page.waitForTimeout(300); } catch(e) {} break; }
  }
}

(async () => {
  const browser = await chromium.launch();
  // Desktop viewport: 1440x900 (laptop), DPR 2
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
  });
  const page = await ctx.newPage();

  await page.goto('https://rbperform.app/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('rbperf_locale', 'fr');
    localStorage.setItem('rb_lang', 'fr');
  });

  console.log('→ /demo desktop FR...');
  await page.goto('https://rbperform.app/demo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);

  try { await page.click('text=Accept all', { timeout: 1500 }); } catch(e) {}
  try { await page.click('text=Reject', { timeout: 1500 }); } catch(e) {}

  console.log('→ Skip onboarding...');
  await dismissAllModals(page);
  await page.waitForTimeout(1500);
  await dismissAllModals(page);
  await page.waitForTimeout(1500);

  // EN→FR DOM swap (covers stale i18n on PROG page)
  async function frenchify() {
    await page.evaluate(() => {
      const replaceMap = [
        ['Programs.', 'Programmes.'],
        ['Programs', 'Programmes'],
        ['programs', 'programmes'],
        ['Search a program or client...', 'Rechercher un programme ou un client...'],
        ['ARCHIVED', 'ARCHIVÉ'],
        ['Created ', 'Créé '],
      ];
      const exactReplace = { 'Active':'Actifs','Archived':'Archivés','All':'Tous','Edit':'Modifier','+ Duplicate':'+ Dupliquer','Duplicate':'Dupliquer' };
      const regexReplace = [[/(\d+)d ago/g, 'il y a $1j'],[/(\d+) active/g, '$1 actifs'],[/(\d+) archived/g, '$1 archivés']];
      const walk = (node) => {
        if (node.nodeType === 3) {
          let txt = node.nodeValue;
          const orig = txt;
          for (const [f, t] of replaceMap) txt = txt.split(f).join(t);
          for (const [re, t] of regexReplace) txt = txt.replace(re, t);
          const trimmed = txt.trim();
          if (exactReplace[trimmed]) txt = txt.replace(trimmed, exactReplace[trimmed]);
          if (txt !== orig) node.nodeValue = txt;
        } else if (node.nodeType === 1 && !['SCRIPT','STYLE'].includes(node.tagName)) {
          for (const c of Array.from(node.childNodes)) walk(c);
        }
      };
      walk(document.body);
    });
  }

  // Capture HOME / Dashboard
  await page.screenshot({ path: path.join(OUT_DIR, 'd-00-home.png'), fullPage: false });
  await page.screenshot({ path: path.join(OUT_DIR, 'd-00-home-full.png'), fullPage: true });
  console.log('✓ d-00-home');

  // Look for desktop nav (links in header or sidebar) — fallback to mobile aria-labels
  const navTargets = [
    { sels: ['a:has-text("Clients")', '[aria-label="Clients"]', 'nav a[href*="clients"]', 'button:has-text("Clients")'], name: 'd-02-clients' },
    { sels: ['a:has-text("Programmes")', 'a:has-text("Programs")', '[aria-label="Prog"]', '[aria-label="Plan"]', 'button:has-text("Programmes")', 'button:has-text("Programs")'], name: 'd-03-plan' },
    { sels: ['a:has-text("Business")', 'a:has-text("Biz")', '[aria-label="Business"]', 'button:has-text("Business")'], name: 'd-04-business' },
  ];

  for (const t of navTargets) {
    let clicked = false;
    for (const sel of t.sels) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 })) {
          await btn.click({ force: true });
          await page.waitForTimeout(3000);
          try { await page.keyboard.press('Escape'); await page.waitForTimeout(300); } catch(e) {}
          await dismissAllModals(page);
          await page.waitForTimeout(800);
          await frenchify();
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(OUT_DIR, t.name + '.png'), fullPage: false });
          await page.screenshot({ path: path.join(OUT_DIR, t.name + '-full.png'), fullPage: true });
          console.log('✓', t.name, '← ' + sel);
          clicked = true;
          break;
        }
      } catch(e) {}
    }
    if (!clicked) console.log('⚠', t.name, 'not clickable');
  }

  // Now open the actual builder: navigate to Programmes → click "Modifier" on first card
  try {
    const progBtn = page.locator('[aria-label="Prog"]').first();
    if (await progBtn.isVisible({ timeout: 2000 })) {
      await progBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }
    // First strategy: click Modifier → goes to client fiche → click "Programme" tab or CREER UN PROGRAMME
    const editBtn = page.locator('button:has-text("Modifier"), button:has-text("Editer"), button:has-text("Éditer"), button:has-text("Edit")').first();
    if (await editBtn.isVisible({ timeout: 2000 })) {
      await editBtn.click({ force: true });
      console.log('  → Clicked Modifier on first programme');
      await page.waitForTimeout(3500);
      try { await page.keyboard.press('Escape'); await page.waitForTimeout(300); } catch(e) {}
      await dismissAllModals(page);
      await page.waitForTimeout(500);

      // Capture fiche client first (bonus)
      await frenchify();
      await page.screenshot({ path: path.join(OUT_DIR, 'd-03c-fiche-client.png'), fullPage: false });
      console.log('✓ d-03c-fiche-client');

      // PRIORITY: click "CREER UN PROGRAMME" — this opens the actual ProgrammeBuilder modal
      let opened = false;
      const creerSelectors = [
        'button:has-text("CREER UN PROGRAMME")',
        'button:has-text("Créer un programme")',
        'button:has-text("CRÉER UN PROGRAMME")',
        'button:has-text("Créer")',
      ];
      for (const sel of creerSelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1500 })) {
            await btn.click({ force: true });
            await page.waitForTimeout(4500);
            console.log('  → Clicked CREER via', sel);
            opened = true;
            break;
          }
        } catch(e) {}
      }

      if (opened) {
        await page.waitForTimeout(1500);
        // The CREER opens template selection. Click a real template to load the builder.
        const tplSelectors = [
          'text=/PPL Hypertrophie.*4 sem/i',
          'text=/Force pure.*4 sem/i',
          'text=/Full body.*3 sem/i',
          'text=/^Vierge$/i',
        ];
        let tplClicked = false;
        for (const sel of tplSelectors) {
          try {
            const tpl = page.locator(sel).first();
            if (await tpl.isVisible({ timeout: 1200 })) {
              await tpl.click({ force: true });
              console.log('  → Selected template:', sel);
              await page.waitForTimeout(4000);
              tplClicked = true;
              break;
            }
          } catch(e) {}
        }
        if (!tplClicked) {
          // Scroll the modal first then retry
          await page.evaluate(() => window.scrollBy(0, 600));
          await page.waitForTimeout(800);
          for (const sel of tplSelectors) {
            try {
              const tpl = page.locator(sel).first();
              if (await tpl.isVisible({ timeout: 1200 })) {
                await tpl.click({ force: true });
                console.log('  → Selected template (after scroll):', sel);
                await page.waitForTimeout(4000);
                tplClicked = true;
                break;
              }
            } catch(e) {}
          }
        }

        try { await page.keyboard.press('Escape'); await page.waitForTimeout(300); } catch(e) {}
        await dismissAllModals(page);
        await page.waitForTimeout(800);
        await frenchify();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(OUT_DIR, 'd-03b-builder.png'), fullPage: false });
        await page.screenshot({ path: path.join(OUT_DIR, 'd-03b-builder-full.png'), fullPage: true });
        console.log('✓ d-03b-builder');
      } else {
        console.log('⚠ builder: create button not found');
      }
    }
  } catch(e) {
    console.log('⚠ builder capture fail:', e.message.slice(0, 80));
  }

  // Final visible nav for debug
  const navDebug = await page.$$eval('a, button, [role="tab"]', els =>
    els.map(e => ({ text:(e.innerText||'').slice(0,40).trim(), aria:e.getAttribute('aria-label')||'', href:e.getAttribute('href')||'' }))
       .filter(l => l.text || l.aria).slice(0, 40)
  );
  console.log('\nNav debug:', JSON.stringify(navDebug, null, 2).slice(0, 2500));

  await browser.close();
  console.log('\nDone:', OUT_DIR);
})();
