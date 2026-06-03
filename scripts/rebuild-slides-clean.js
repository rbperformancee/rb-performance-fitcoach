// Capture + rebuild slides 3-6 with cleaned data + larger screenshots
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TMP = '/tmp/captures-clean';
const OUT = '/Users/rayan/Desktop/Carrousel-B2B-FINAL';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1350;

// ============================================================
// DOM override to inject clean data BEFORE screenshot
// ============================================================
async function cleanData(page) {
  await page.evaluate(() => {
    const swaps = [
      // counters
      ['24 clients', '47 clients'],
      ['24 athlètes', '47 athlètes'],
      ['340€', '8 200€'],
      ['340 €', '8 200 €'],
      ['/ 10 000€', '/ 10 000€'],
      ['999j', '38j'],
      ['999 j', '38 j'],
      ['il y a 999', 'il y a 38'],
      // sentinel headlines
      ['20 clients à réactiver', '5 clients à réactiver'],
      ['20 clients a reactiver', '5 clients a reactiver'],
      ['8 clients à risque', '3 clients à risque'],
      ['8 clients a risque', '3 clients a risque'],
      // brand strip
      ['Demo.', 'Coach Pro.'],
      ['Demo ', 'Coach Pro '],
    ];
    const walk = (node) => {
      if (node.nodeType === 3) {
        let txt = node.nodeValue;
        const orig = txt;
        for (const [f, t] of swaps) txt = txt.split(f).join(t);
        if (txt !== orig) node.nodeValue = txt;
      } else if (node.nodeType === 1 && !['SCRIPT','STYLE'].includes(node.tagName)) {
        for (const c of Array.from(node.childNodes)) walk(c);
      }
    };
    walk(document.body);

    // Frenchify program page if EN leaked
    const frSwaps = [
      ['Programs.','Programmes.'],['Programs','Programmes'],['programs','programmes'],
      ['Search a program','Rechercher un programme'],['ARCHIVED','ARCHIVÉ'],['Created ','Créé '],
      ['Active','Actifs'],['Archived','Archivés'],['Edit','Modifier'],
    ];
    const walk2 = (node) => {
      if (node.nodeType === 3) {
        let txt = node.nodeValue;
        const orig = txt;
        for (const [f, t] of frSwaps) txt = txt.split(f).join(t);
        if (txt !== orig) node.nodeValue = txt;
      } else if (node.nodeType === 1 && !['SCRIPT','STYLE'].includes(node.tagName)) {
        for (const c of Array.from(node.childNodes)) walk2(c);
      }
    };
    walk2(document.body);
  });
}

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

// ============================================================
// SLIDE TEMPLATES (rebuilt with bigger browser + better crop)
// ============================================================
const COMMON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1080px; height:1350px; font-family:'Inter', -apple-system, sans-serif; background:#0d1726; color:#fff; overflow:hidden; }
  body {
    position:relative;
    background:
      radial-gradient(ellipse 800px 600px at 50% 40%, rgba(20,230,197,0.18) 0%, rgba(20,230,197,0) 60%),
      radial-gradient(ellipse 600px 400px at 80% 90%, rgba(20,230,197,0.10) 0%, rgba(20,230,197,0) 70%),
      #0d1726;
  }
  .dot { color:#14e6c5; }
  .accent { color:#14e6c5; }
  .brand { position:absolute; bottom:38px; left:0; right:0; text-align:center; font-size:20px; font-weight:700; letter-spacing:0.18em; color:rgba(255,255,255,0.4); }
  .page-num { position:absolute; top:40px; right:54px; font-size:18px; font-weight:700; letter-spacing:0.12em; color:rgba(255,255,255,0.35); }
  .tag { display:inline-block; padding:8px 18px; border:1.5px solid rgba(20,230,197,0.4); border-radius:999px; font-size:16px; font-weight:700; letter-spacing:0.16em; color:#14e6c5; text-transform:uppercase; }
`;

// Bigger browser frame, tighter aspect ratio to crop empty bottom of dashboard
function templateBrowser({ pageNum, tag, headline, sub, imgPath, imgPos = 'top center', cropRatio = '1440 / 760' }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding:60px 50px 0; text-align:center; }
    .tag { margin-bottom:22px; }
    h1 { font-size:74px; font-weight:900; line-height:1; letter-spacing:-0.03em; margin-bottom:16px; max-width:960px; }
    h1 .accent { color:#14e6c5; }
    .sub { font-size:26px; font-weight:500; color:rgba(255,255,255,0.65); line-height:1.4; margin-bottom:40px; max-width:880px; }
    .browser { width:1000px; border-radius:16px; background:#1c2535; box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.55), 0 0 120px rgba(20,230,197,0.12); overflow:hidden; position:relative; }
    .browser-bar { height:42px; background:linear-gradient(180deg, #1f2a3d 0%, #182232 100%); display:flex; align-items:center; padding:0 16px; border-bottom:1px solid rgba(255,255,255,0.05); }
    .traffic { display:flex; gap:8px; margin-right:20px; }
    .traffic span { width:13px; height:13px; border-radius:50%; display:block; }
    .traffic .r { background:#ff5f57; } .traffic .y { background:#febc2e; } .traffic .g { background:#28c840; }
    .url { flex:1; max-width:380px; margin:0 auto; background:#0d1726; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:7px 18px; font-size:13px; font-weight:500; color:rgba(255,255,255,0.7); text-align:center; letter-spacing:-0.01em; }
    .url .lock { color:#14e6c5; margin-right:8px; font-size:11px; }
    .browser-screen { width:100%; aspect-ratio: ${cropRatio}; background-image:url('${imgPath}'); background-size:cover; background-position:${imgPos}; }
  </style></head><body>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      ${tag ? `<div class="tag">${tag}</div>` : ''}
      <h1>${headline}</h1>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
      <div class="browser">
        <div class="browser-bar">
          <div class="traffic"><span class="r"></span><span class="y"></span><span class="g"></span></div>
          <div class="url"><span class="lock">●</span>rbperform.app</div>
        </div>
        <div class="browser-screen"></div>
      </div>
    </div>
    <div class="brand">RB PERFORM<span class="dot">.</span></div>
  </body></html>`;
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  REBUILDING SLIDES 3-6 WITH CLEAN DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
  });
  const page = await ctx.newPage();

  // --- 1. /demo HOME (CEO dashboard) ---
  await page.goto('https://rbperform.app/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('rbperf_locale', 'fr');
    localStorage.setItem('rb_lang', 'fr');
  });
  await page.goto('https://rbperform.app/demo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(7000);
  try { await page.click('text=Accept all', { timeout: 1500 }); } catch(e) {}
  try { await page.click('text=Reject', { timeout: 1500 }); } catch(e) {}
  await dismissAllModals(page); await page.waitForTimeout(1500); await dismissAllModals(page);
  await page.waitForTimeout(1500);
  await cleanData(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(TMP, 'home.png'), fullPage: false });
  console.log('✓ home.png (clean: 47/8 200€/96%)');

  // --- 2. BUSINESS (sentinel) ---
  const bizSels = ['a:has-text("Business")', 'a:has-text("Biz")', '[aria-label="Business"]', 'button:has-text("Business")'];
  for (const sel of bizSels) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ force: true });
        await page.waitForTimeout(3000);
        await dismissAllModals(page);
        await cleanData(page);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(TMP, 'business.png'), fullPage: false });
        console.log('✓ business.png (clean: 5 réactiver/38j)');
        break;
      }
    } catch(e) {}
  }

  // --- 3. CLIENTS ---
  const clientSels = ['a:has-text("Clients")', '[aria-label="Clients"]', 'nav a[href*="clients"]', 'button:has-text("Clients")'];
  for (const sel of clientSels) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ force: true });
        await page.waitForTimeout(3000);
        await dismissAllModals(page);
        await cleanData(page);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(TMP, 'clients.png'), fullPage: false });
        console.log('✓ clients.png');
        break;
      }
    } catch(e) {}
  }

  // --- 4. BUILDER (programme) ---
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
      await dismissAllModals(page); await page.waitForTimeout(500);
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
        const tplSels = ['text=/PPL Hypertrophie.*4 sem/i','text=/Force pure.*4 sem/i','text=/Full body.*3 sem/i'];
        for (const sel of tplSels) {
          try {
            const tpl = page.locator(sel).first();
            if (await tpl.isVisible({ timeout: 1200 })) {
              await tpl.click({ force: true });
              await page.waitForTimeout(4000);
              break;
            }
          } catch(e) {}
        }
        await dismissAllModals(page); await page.waitForTimeout(800);
        await cleanData(page);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(TMP, 'builder.png'), fullPage: false });
        console.log('✓ builder.png');
      }
    }
  } catch(e) { console.log('⚠ builder fail:', e.message.slice(0, 60)); }

  await browser.close();

  // ============================================================
  // PHASE 2 — Render new slides 3-6
  // ============================================================
  console.log('\n→ Rendering slides 3-6 with bigger screenshots...');
  const browser2 = await chromium.launch();
  const ctx2 = await browser2.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  const slides = [
    { name: 'slide-3-dashboard', html: templateBrowser({ pageNum: '03 / 09', tag: '01 · CEO Dashboard', headline: 'Ton business en <span class="accent">live<span class="dot">.</span></span>', sub: '47 clients · 8 200€ MRR · 96% rétention.<br/>Tout. En 1 écran.', imgPath: 'file://' + TMP + '/home.png' }) },
    { name: 'slide-4-sentinel', html: templateBrowser({ pageNum: '04 / 09', tag: '02 · Anti-churn IA', headline: 'Sentinel détecte<br/>les <span class="accent">fuites<span class="dot">.</span></span>', sub: '« 5 clients à réactiver aujourd\'hui. »<br/>Marc inactif depuis 38j → relance auto.', imgPath: 'file://' + TMP + '/business.png' }) },
    { name: 'slide-5-programme', html: templateBrowser({ pageNum: '05 / 09', tag: '03 · Programme Builder', headline: 'Plus jamais<br/>d\'<span class="accent">Excel<span class="dot">.</span></span>', sub: 'Templates, exercices visuels, export PDF natif.<br/>Le builder pensé pour les coachs, pas pour les devs.', imgPath: 'file://' + TMP + '/builder.png' }) },
    { name: 'slide-6-clients', html: templateBrowser({ pageNum: '06 / 09', tag: '04 · Tracking client', headline: 'Tes 47 <span class="accent">athlètes<span class="dot">.</span></span><br/>1 écran.', sub: 'Force · perf · hybrid. Filtres en 1 clic.<br/>Voice AI pour que tes clients loggent en 2s.', imgPath: 'file://' + TMP + '/clients.png' }) },
  ];

  for (const s of slides) {
    const htmlPath = path.join(TMP, `__${s.name}.html`);
    fs.writeFileSync(htmlPath, s.html);
    const p = await ctx2.newPage();
    await p.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(OUT, s.name + '.png'), clip: { x: 0, y: 0, width: W, height: H }, type: 'png' });
    await p.close();
    console.log('✓', s.name);
    try { fs.unlinkSync(htmlPath); } catch(e) {}
  }

  await browser2.close();
  console.log('\n✓ DONE → ' + OUT);
})();
