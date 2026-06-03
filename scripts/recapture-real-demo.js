// Re-capture REAL screenshots from rbperform.app/demo
// NO data invention — what the demo shows is what we use
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = '/tmp/real-captures';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function dismissAllModals(page) {
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

async function frenchify(page) {
  await page.evaluate(() => {
    const swaps = [['Programs.','Programmes.'],['Programs','Programmes'],['programs','programmes'],
      ['Search a program or client...','Rechercher un programme ou un client...'],
      ['ARCHIVED','ARCHIVÉ'],['Created ','Créé '],['Active','Actifs'],['Archived','Archivés'],['All','Tous'],['Edit','Modifier']];
    const walk = (n) => {
      if (n.nodeType === 3) {
        let t = n.nodeValue, o = t;
        for (const [f, r] of swaps) t = t.split(f).join(r);
        if (t !== o) n.nodeValue = t;
      } else if (n.nodeType === 1 && !['SCRIPT','STYLE'].includes(n.tagName)) {
        for (const c of Array.from(n.childNodes)) walk(c);
      }
    };
    walk(document.body);
  });
}

(async () => {
  console.log('→ Capturing REAL /demo screenshots (no invention)\n');
  const browser = await chromium.launch();
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
  await page.goto('https://rbperform.app/demo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  try { await page.click('text=Accept all', { timeout: 1500 }); } catch(e) {}
  try { await page.click('text=Reject', { timeout: 1500 }); } catch(e) {}
  await dismissAllModals(page);
  await page.waitForTimeout(1500);
  await dismissAllModals(page);
  await page.waitForTimeout(1500);

  // Dump the actual data the demo shows so we know what to write in copy
  const realData = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      clientsMatch: (body.match(/(\d+)\s*(?:client|athl)/gi) || []).slice(0, 5),
      mrrMatch: (body.match(/(\d[\d\s]*)\s*€/g) || []).slice(0, 5),
      pctMatch: (body.match(/(\d+)\s*%/g) || []).slice(0, 5),
      hasDemo: body.includes('Demo'),
      sentinel: (body.match(/(\d+)\s*clients?\s+(?:à réactiver|a reactiver|à risque|a risque|inactifs?)/gi) || []).slice(0, 5),
    };
  });
  console.log('REAL DEMO DATA:', JSON.stringify(realData, null, 2));

  await page.screenshot({ path: path.join(OUT, 'home.png'), fullPage: false });
  console.log('✓ home.png');

  // Business / Sentinel
  for (const sel of ['a:has-text("Business")', 'a:has-text("Biz")', '[aria-label="Business"]', 'button:has-text("Business")']) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ force: true });
        await page.waitForTimeout(3000);
        await dismissAllModals(page);
        await page.screenshot({ path: path.join(OUT, 'business.png'), fullPage: false });
        console.log('✓ business.png');
        break;
      }
    } catch(e) {}
  }

  // Clients
  for (const sel of ['a:has-text("Clients")', '[aria-label="Clients"]', 'nav a[href*="clients"]', 'button:has-text("Clients")']) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ force: true });
        await page.waitForTimeout(3000);
        await dismissAllModals(page);
        await frenchify(page);
        await page.screenshot({ path: path.join(OUT, 'clients.png'), fullPage: false });
        console.log('✓ clients.png');
        break;
      }
    } catch(e) {}
  }

  // Builder
  try {
    const progBtn = page.locator('a:has-text("Programmes"), [aria-label="Prog"], [aria-label="Plan"]').first();
    if (await progBtn.isVisible({ timeout: 2000 })) {
      await progBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }
    const editBtn = page.locator('button:has-text("Modifier"), button:has-text("Editer"), button:has-text("Éditer"), button:has-text("Edit")').first();
    if (await editBtn.isVisible({ timeout: 2000 })) {
      await editBtn.click({ force: true });
      await page.waitForTimeout(3500);
      await dismissAllModals(page);
      const creerSels = ['button:has-text("CREER UN PROGRAMME")','button:has-text("Créer un programme")','button:has-text("CRÉER UN PROGRAMME")','button:has-text("Créer")'];
      let opened = false;
      for (const sel of creerSels) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1500 })) {
            await btn.click({ force: true });
            await page.waitForTimeout(4500);
            opened = true; break;
          }
        } catch(e) {}
      }
      if (opened) {
        for (const sel of ['text=/PPL Hypertrophie.*4 sem/i','text=/Force pure.*4 sem/i','text=/Full body.*3 sem/i']) {
          try {
            const tpl = page.locator(sel).first();
            if (await tpl.isVisible({ timeout: 1200 })) {
              await tpl.click({ force: true });
              await page.waitForTimeout(4000);
              break;
            }
          } catch(e) {}
        }
        await dismissAllModals(page);
        await frenchify(page);
        await page.screenshot({ path: path.join(OUT, 'builder.png'), fullPage: false });
        console.log('✓ builder.png');
      }
    }
  } catch(e) { console.log('⚠ builder fail:', e.message.slice(0, 60)); }

  await browser.close();
  console.log('\n✓ Real captures saved to:', OUT);
})();
