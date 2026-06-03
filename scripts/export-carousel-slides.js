const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/carrousel-saas';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SCREENS_DIR = '/Users/rayan/Downloads/coach-dashboard-captures';

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
  .brand {
    position:absolute; bottom:48px; left:0; right:0;
    text-align:center;
    font-size:22px; font-weight:700; letter-spacing:0.18em;
    color:rgba(255,255,255,0.4);
  }
  .brand .dot { font-weight:900; }
  .page-num {
    position:absolute; top:48px; right:60px;
    font-size:20px; font-weight:700; letter-spacing:0.12em;
    color:rgba(255,255,255,0.35);
  }
  .tag {
    display:inline-block;
    padding:10px 20px;
    border:1.5px solid rgba(20,230,197,0.4);
    border-radius:999px;
    font-size:18px; font-weight:700; letter-spacing:0.16em;
    color:#14e6c5;
    text-transform:uppercase;
  }
`;

function templateText({ pageNum, headline, sub, brand = true }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:80px; text-align:center; }
    h1 { font-size:140px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:40px; }
    h1 .accent { color:#14e6c5; }
    .sub { font-size:36px; font-weight:500; color:rgba(255,255,255,0.7); line-height:1.4; max-width:900px; }
  </style></head><body>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      <h1>${headline}</h1>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
    </div>
    ${brand ? `<div class="brand">RB PERFORM<span class="dot">.</span></div>` : ''}
  </body></html>`;
}

function templateBrowser({ pageNum, tag, headline, sub, imgPath, imgPos = 'top center' }) {
  // Safari/Chrome window mockup — desktop screenshot inside browser frame
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding:80px 60px 0; text-align:center; }
    .tag { margin-bottom:30px; }
    h1 { font-size:78px; font-weight:900; line-height:1; letter-spacing:-0.03em; margin-bottom:20px; max-width:960px; }
    h1 .accent { color:#14e6c5; }
    .sub { font-size:30px; font-weight:500; color:rgba(255,255,255,0.65); line-height:1.4; margin-bottom:50px; max-width:900px; }
    .browser {
      width:920px;
      border-radius:16px;
      background:#1c2535;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.06),
        0 40px 100px rgba(0,0,0,0.55),
        0 0 120px rgba(20,230,197,0.12);
      overflow:hidden;
      position:relative;
    }
    .browser-bar {
      height:44px;
      background:linear-gradient(180deg, #1f2a3d 0%, #182232 100%);
      display:flex; align-items:center; padding:0 16px;
      border-bottom:1px solid rgba(255,255,255,0.05);
    }
    .traffic {
      display:flex; gap:8px; margin-right:20px;
    }
    .traffic span {
      width:14px; height:14px; border-radius:50%; display:block;
    }
    .traffic .r { background:#ff5f57; }
    .traffic .y { background:#febc2e; }
    .traffic .g { background:#28c840; }
    .url {
      flex:1;
      max-width:380px;
      margin:0 auto;
      background:#0d1726;
      border:1px solid rgba(255,255,255,0.06);
      border-radius:8px;
      padding:8px 18px;
      font-size:14px;
      font-weight:500;
      color:rgba(255,255,255,0.7);
      text-align:center;
      letter-spacing:-0.01em;
    }
    .url .lock { color:#14e6c5; margin-right:8px; font-size:11px; }
    .browser-screen {
      width:100%;
      aspect-ratio: 1440 / 900;
      background-image:url('${imgPath}');
      background-size:cover;
      background-position:${imgPos};
    }
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

function templateBigText({ pageNum, line1, line2, line3 = '' }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:80px; text-align:center; }
    .line1 { font-size:180px; font-weight:900; line-height:0.92; letter-spacing:-0.05em; color:#14e6c5; }
    .line2 { font-size:120px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#fff; margin-top:20px; }
    .line3 { font-size:32px; font-weight:500; color:rgba(255,255,255,0.55); margin-top:60px; max-width:800px; line-height:1.4; }
  </style></head><body>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      <div class="line1">${line1}</div>
      <div class="line2">${line2}</div>
      ${line3 ? `<div class="line3">${line3}</div>` : ''}
    </div>
    <div class="brand">RB PERFORM<span class="dot">.</span></div>
  </body></html>`;
}

function templateCompare({ pageNum }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:60px; }
    h1 { font-size:78px; font-weight:900; text-align:center; letter-spacing:-0.03em; margin-bottom:60px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:30px; width:100%; }
    .col {
      background:rgba(255,255,255,0.03);
      border:1.5px solid rgba(255,255,255,0.08);
      border-radius:32px;
      padding:50px 36px;
      display:flex; flex-direction:column; justify-content:flex-start;
    }
    .col.win { border-color:rgba(20,230,197,0.5); background:rgba(20,230,197,0.06); }
    .label { font-size:22px; font-weight:700; letter-spacing:0.18em; opacity:0.5; text-transform:uppercase; margin-bottom:24px; }
    .col.win .label { color:#14e6c5; opacity:1; }
    .name { font-size:48px; font-weight:900; letter-spacing:-0.02em; margin-bottom:30px; }
    .row { font-size:28px; font-weight:500; margin-bottom:18px; color:rgba(255,255,255,0.85); }
    .row.bad { color:#ff7b7b; }
    .row.good { color:#14e6c5; }
    .price { font-size:64px; font-weight:900; margin-top:30px; letter-spacing:-0.03em; }
    .price.win { color:#14e6c5; }
    .lifetime { font-size:22px; font-weight:700; letter-spacing:0.2em; color:#14e6c5; margin-top:8px; }
    .strike { text-decoration:line-through; opacity:0.6; }
  </style></head><body>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      <h1>Le calcul est vite fait<span class="dot">.</span></h1>
      <div class="grid">
        <div class="col">
          <div class="label">Eux</div>
          <div class="name">Trainerize</div>
          <div class="row bad">+8% commission</div>
          <div class="row bad">79€/mois</div>
          <div class="row">App pour coacher</div>
          <div class="price">948€<span style="font-size:32px;opacity:0.6">/an</span></div>
        </div>
        <div class="col win">
          <div class="label">Toi</div>
          <div class="name">RB Perform</div>
          <div class="row good">0% commission</div>
          <div class="row good">Dès 199€/mois</div>
          <div class="row">App pour piloter</div>
          <div class="price win">0€<span style="font-size:32px;opacity:0.6">/an de commission</span></div>
          <div class="lifetime">Ta data. Tes clients.</div>
        </div>
      </div>
    </div>
    <div class="brand">RB PERFORM<span class="dot">.</span></div>
  </body></html>`;
}

function templateCTA({ pageNum }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding:80px 90px; text-align:left; }
    h1 { font-size:88px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:50px; }
    h1 .accent { color:#14e6c5; }
    .stack {
      list-style:none; padding:0; margin:0 0 50px; width:100%;
    }
    .stack li {
      display:flex; align-items:flex-start; gap:18px;
      font-size:32px; font-weight:600; color:#fff;
      line-height:1.35;
      padding:14px 0;
      border-top:1px solid rgba(255,255,255,0.08);
    }
    .stack li:last-child { border-bottom:1px solid rgba(255,255,255,0.08); }
    .stack .check {
      color:#14e6c5; font-size:36px; font-weight:900; flex-shrink:0;
      width:36px; text-align:center; margin-top:-2px;
    }
    .stack b { color:#14e6c5; font-weight:900; }
    .cta-block {
      width:100%;
      display:flex; flex-direction:column; align-items:flex-start; gap:18px;
    }
    .cmd {
      font-size:44px; font-weight:900; letter-spacing:-0.02em; color:#fff;
      line-height:1.05;
    }
    .cmd .accent { color:#14e6c5; }
    .url-pill {
      background:#14e6c5; color:#0d1726;
      padding:24px 44px;
      border-radius:999px;
      font-size:34px; font-weight:900; letter-spacing:-0.01em;
      box-shadow: 0 20px 60px rgba(20,230,197,0.35);
      display:inline-flex; align-items:center; gap:12px;
    }
    .arrow { font-size:38px; }
  </style></head><body>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      <h1>Si tu veux scaler<br/>sans <span class="accent">cramer<span class="dot">.</span></span></h1>
      <ul class="stack">
        <li><span class="check">→</span><span><b>CEO Dashboard</b> — ton business en temps réel</span></li>
        <li><span class="check">→</span><span><b>Sentinel IA</b> — détecte les fuites avant qu'elles partent</span></li>
        <li><span class="check">→</span><span><b>Programme builder</b> visuel — fini Excel</span></li>
        <li><span class="check">→</span><span><b>Voice AI</b> — tes clients loggent en 2s</span></li>
        <li><span class="check">→</span><span><b>0% commission.</b> Jamais.</span></li>
      </ul>
      <div class="cta-block">
        <div class="cmd">Lien en <span class="accent">bio<span class="dot">.</span></span></div>
        <div class="url-pill"><span class="arrow">→</span>rbperform.app</div>
      </div>
    </div>
    <div class="brand">RB PERFORM<span class="dot">.</span></div>
  </body></html>`;
}

function templateFounderPhoto({ pageNum, imgPath, line1, line2, sub }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    body {
      background:#0d1726;
    }
    .photo {
      position:absolute; inset:0;
      background-image:url('${imgPath}');
      background-size:cover;
      background-position: 50% 35%;
      filter: contrast(1.05) brightness(0.92) saturate(1.05);
    }
    .photo::after {
      content:''; position:absolute; inset:0;
      background:
        linear-gradient(180deg, rgba(13,23,38,0.15) 0%, rgba(13,23,38,0.25) 50%, rgba(13,23,38,0.88) 100%);
    }
    .wrap {
      position:absolute; inset:0;
      display:flex; flex-direction:column; justify-content:flex-end; align-items:center;
      padding: 80px 70px 200px;
      text-align:center;
      z-index:2;
    }
    .line1 { font-size:96px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:14px; color:#fff; }
    .line2 { font-size:96px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#14e6c5; margin-bottom:40px; }
    .sub {
      font-size:28px; font-weight:500; color:rgba(255,255,255,0.85); line-height:1.45;
      max-width:820px;
      background:rgba(13,23,38,0.5);
      padding:24px 32px;
      border-radius:18px;
      border:1px solid rgba(20,230,197,0.18);
      backdrop-filter:blur(4px);
    }
    .page-num { color:rgba(255,255,255,0.6); z-index:3; }
    .brand { color:rgba(255,255,255,0.65); z-index:3; }
  </style></head><body>
    <div class="photo"></div>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      <div class="line1">${line1}</div>
      <div class="line2">${line2}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
    </div>
    <div class="brand">RB PERFORM<span class="dot">.</span></div>
  </body></html>`;
}

const slides = [
  {
    name: 'slide-2-founder-hook',
    html: templateFounderPhoto({
      pageNum: '02 / 09',
      imgPath: 'file://' + SCREENS_DIR + '/rayan-gym-teal.png',
      line1: `L'app qui transforme`,
      line2: `les coachs en CEO<span class="dot">.</span>`,
      sub: '',
    })
  },
  {
    name: 'slide-3-dashboard',
    html: templateBrowser({
      pageNum: '03 / 09',
      tag: '01 · CEO Dashboard',
      headline: `Ton business en <span class="accent">live<span class="dot">.</span></span>`,
      sub: `24 clients · 340€ MRR · 96% rétention.<br/>Tout. En 1 écran.`,
      imgPath: 'file://' + SCREENS_DIR + '/d-00-home.png',
      imgPos: 'top center',
    })
  },
  {
    name: 'slide-4-sentinel',
    html: templateBrowser({
      pageNum: '04 / 09',
      tag: '02 · Anti-churn AI',
      headline: `Sentinel détecte<br/>les <span class="accent">fuites<span class="dot">.</span></span>`,
      sub: `« 20 clients à réactiver aujourd'hui. »<br/>Marc inactif depuis 999j → relance auto.`,
      imgPath: 'file://' + SCREENS_DIR + '/d-04-business.png',
      imgPos: 'top center',
    })
  },
  {
    name: 'slide-5-programme',
    html: templateBrowser({
      pageNum: '05 / 09',
      tag: '03 · Programme Builder',
      headline: `Plus jamais<br/>d'<span class="accent">Excel<span class="dot">.</span></span>`,
      sub: `Templates, exercices visuels, export PDF natif, application multi-clients.<br/>Le builder que tu aurais voulu coder toi-même.`,
      imgPath: 'file://' + SCREENS_DIR + '/d-03b-builder.png',
      imgPos: 'top center',
    })
  },
  {
    name: 'slide-6-clients',
    html: templateBrowser({
      pageNum: '06 / 09',
      tag: '04 · Tracking client',
      headline: `Tes <span class="accent">24 athlètes</span>.<br/>1 écran<span class="dot">.</span>`,
      sub: `Force · perf · hybrid. Filtres en 1 clic.<br/>Voice AI intégré pour logger en 2s.`,
      imgPath: 'file://' + SCREENS_DIR + '/d-02-clients.png',
      imgPos: 'top center',
    })
  },
  {
    name: 'slide-7-zero',
    html: templateBigText({
      pageNum: '07 / 09',
      line1: `0% commission<span class="dot">.</span>`,
      line2: `Jamais.`,
      line3: `Trainerize prend 8% sur chaque vente.<br/>Sur 10 000€ encaissés → 800€ qui partent.<br/>Chez RB Perform : 0€.`,
    })
  },
  {
    name: 'slide-8-compare',
    html: templateCompare({ pageNum: '08 / 09' })
  },
  {
    name: 'slide-9-cta',
    html: templateCTA({ pageNum: '09 / 09' })
  },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
  });

  // Write HTMLs into the screenshots directory so file:// refs to images resolve
  const TMP_DIR = SCREENS_DIR;
  for (const s of slides) {
    // Replace absolute file:// paths with relative paths since HTML lives in same dir
    const htmlAdjusted = s.html.replace(new RegExp('file://' + SCREENS_DIR + '/', 'g'), './');
    const tmpPath = path.join(TMP_DIR, '__slide_' + s.name + '.html');
    fs.writeFileSync(tmpPath, htmlAdjusted);

    const page = await ctx.newPage();
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200); // wait for fonts + images
    await page.screenshot({
      path: path.join(OUT_DIR, s.name + '.png'),
      clip: { x:0, y:0, width:1080, height:1350 },
      type: 'png',
    });
    await page.screenshot({
      path: path.join(OUT_DIR, s.name + '.jpg'),
      clip: { x:0, y:0, width:1080, height:1350 },
      type: 'jpeg',
      quality: 92,
    });
    console.log('✓', s.name);
    await page.close();
    fs.unlinkSync(tmpPath);
  }

  await browser.close();
  console.log('\nDone. Output:', OUT_DIR);
})();
