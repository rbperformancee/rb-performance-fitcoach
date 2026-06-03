const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/rayan/Downloads/setter-onboarding';
const SCREENS = '/Users/rayan/Downloads/coach-dashboard-captures';

// HTML files live in SCREENS dir (where images are) so relative ./paths resolve.
const HTML_DIR = SCREENS;
// PNG outputs go to OUT_DIR (Playwright can write there).

const COMMON = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * {
    margin:0; padding:0; box-sizing:border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  html {
    background:#0d1726 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    width:1190px; height:1684px;
    font-family:'Inter', -apple-system, sans-serif;
    background:#0d1726 !important; color:#fff; overflow:hidden;
    position:relative;
  }
  body {
    background:
      radial-gradient(ellipse 900px 700px at 50% 30%, rgba(20,230,197,0.12) 0%, rgba(13,23,38,0) 60%),
      #0d1726 !important;
  }
  @media print {
    html, body { background:#0d1726 !important; }
  }
  .dot { color:#14e6c5; }
  .page-tag {
    position:absolute; top:50px; right:60px;
    font-size:18px; font-weight:700; letter-spacing:0.16em;
    color:rgba(255,255,255,0.35);
  }
  .brand-tag {
    position:absolute; top:50px; left:60px;
    font-size:18px; font-weight:700; letter-spacing:0.18em;
    color:rgba(255,255,255,0.5);
  }
  .footer-brand {
    position:absolute; bottom:48px; left:0; right:0;
    text-align:center;
    font-size:18px; font-weight:700; letter-spacing:0.2em;
    color:rgba(255,255,255,0.35);
  }
  .footer-brand .dot { font-weight:900; }
`;

// === SLIDE TEMPLATES ===

function cover() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:120px; text-align:center; }
    .eyebrow { font-size:24px; font-weight:700; letter-spacing:0.25em; color:#14e6c5; text-transform:uppercase; margin-bottom:50px; }
    h1 { font-size:140px; font-weight:900; line-height:0.92; letter-spacing:-0.04em; margin-bottom:30px; }
    h1 .accent { color:#14e6c5; }
    .sub { font-size:34px; font-weight:500; color:rgba(255,255,255,0.75); line-height:1.4; max-width:900px; margin-bottom:80px; }
    .pitch { font-size:24px; font-weight:600; color:rgba(255,255,255,0.55); line-height:1.5; max-width:800px; font-style:italic; }
  </style></head><body>
    <div class="brand-tag">RB PERFORM<span class="dot">.</span></div>
    <div class="page-tag">01 / 06</div>
    <div class="wrap">
      <div class="eyebrow">Présentation interne · Setter B2B</div>
      <h1>RB Perform<span class="dot accent">.</span></h1>
      <div class="sub">Le tableau de bord business<br/>des coachs sportifs.</div>
      <div class="pitch">"Gymkee t'apprend à coacher.<br/>Trainerize t'aide à organiser.<br/>RB Perform te dit si ton business va tenir."</div>
    </div>
  </body></html>`;
}

function problem() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:100px 100px 100px; }
    h1 { font-size:100px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:60px; }
    h1 .accent { color:#ff5d5d; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:30px; }
    .card {
      background: rgba(255,93,93,0.07);
      border:1.5px solid rgba(255,93,93,0.3);
      border-radius:24px;
      padding:36px;
    }
    .card .num { font-size:46px; font-weight:900; color:#ff5d5d; margin-bottom:12px; line-height:1; }
    .card h3 { font-size:28px; font-weight:900; margin-bottom:14px; line-height:1.1; }
    .card p { font-size:22px; font-weight:500; color:rgba(255,255,255,0.7); line-height:1.45; }
  </style></head><body>
    <div class="brand-tag">RB PERFORM<span class="dot">.</span></div>
    <div class="page-tag">02 / 06 · Le problème</div>
    <div class="wrap">
      <h1>Les coachs sont<br/><span class="accent">en train de couler<span class="dot">.</span></span></h1>
      <div class="grid">
        <div class="card">
          <div class="num">1</div>
          <h3>Excel le dimanche soir</h3>
          <p>Bricolage manuel : programmes, suivi, factures. 10-15h/sem perdues en admin.</p>
        </div>
        <div class="card">
          <div class="num">2</div>
          <h3>Trainerize/Gymkee = commission 8%</h3>
          <p>10 000€ encaissés → 800€ qui partent en commission. Chaque mois.</p>
        </div>
        <div class="card">
          <div class="num">3</div>
          <h3>Aucune visibilité business</h3>
          <p>"Combien je gagne ce mois? Quel client va churner?" → personne ne sait.</p>
        </div>
        <div class="card">
          <div class="num">4</div>
          <h3>Les outils existants = des builders</h3>
          <p>Ils apprennent à coacher. Pas à piloter un business. Vide stratégique.</p>
        </div>
      </div>
    </div>
  </body></html>`;
}

function solution() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:100px; }
    h1 { font-size:100px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:50px; }
    h1 .accent { color:#14e6c5; }
    .pillars { display:grid; grid-template-columns: 1fr 1fr; gap:24px; }
    .pillar {
      background:rgba(20,230,197,0.05);
      border:1.5px solid rgba(20,230,197,0.25);
      border-radius:24px;
      padding:34px;
    }
    .pillar .icon { font-size:36px; margin-bottom:10px; }
    .pillar h3 { font-size:30px; font-weight:900; margin-bottom:10px; color:#14e6c5; }
    .pillar p { font-size:22px; font-weight:500; color:rgba(255,255,255,0.8); line-height:1.4; }
    .tagline { margin-top:50px; text-align:center; font-size:26px; font-weight:700; color:rgba(255,255,255,0.6); font-style:italic; }
  </style></head><body>
    <div class="brand-tag">RB PERFORM<span class="dot">.</span></div>
    <div class="page-tag">03 / 06 · La solution</div>
    <div class="wrap">
      <h1>Un seul outil<br/>qui fait <span class="accent">tout<span class="dot">.</span></span></h1>
      <div class="pillars">
        <div class="pillar">
          <div class="icon">📊</div>
          <h3>CEO Dashboard</h3>
          <p>Tu vois ton business en live. MRR, rétention, score 0-100, clients à risque. En 1 écran.</p>
        </div>
        <div class="pillar">
          <div class="icon">🛡️</div>
          <h3>Sentinel IA</h3>
          <p>Détecte les clients qui vont churner avant qu'ils partent. Propose les relances. Auto.</p>
        </div>
        <div class="pillar">
          <div class="icon">🏗️</div>
          <h3>Programme Builder</h3>
          <p>Templates, drag-drop, exercices visuels, export PDF, multi-clients. Fini Excel.</p>
        </div>
        <div class="pillar">
          <div class="icon">🎙️</div>
          <h3>Voice AI</h3>
          <p>Tes clients loggent leurs séances en parlant. Logs en 2s. Data précise sans friction.</p>
        </div>
      </div>
      <div class="tagline">"Pas un builder de programmes.<br/>Un tableau de bord business."</div>
    </div>
  </body></html>`;
}

function screens() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; padding:100px 60px; display:flex; flex-direction:column; }
    h1 { font-size:80px; font-weight:900; line-height:1; letter-spacing:-0.03em; text-align:center; margin-bottom:60px; }
    h1 .accent { color:#14e6c5; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:24px; }
    .screen {
      background:#1c2535;
      border-radius:14px;
      overflow:hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      border:1px solid rgba(255,255,255,0.06);
    }
    .bar { height:30px; background:#182232; display:flex; align-items:center; padding:0 12px; gap:6px; }
    .dot-r, .dot-y, .dot-g { width:9px; height:9px; border-radius:50%; }
    .dot-r { background:#ff5f57; } .dot-y { background:#febc2e; } .dot-g { background:#28c840; }
    .image {
      width:100%;
      aspect-ratio: 1440/900;
      background-size:cover; background-position:top center;
    }
    .label {
      padding:14px 18px;
      font-size:20px; font-weight:700;
      background:#0d1726;
      color:#fff;
      border-top:1px solid rgba(20,230,197,0.2);
    }
    .label .accent { color:#14e6c5; }
  </style></head><body>
    <div class="brand-tag">RB PERFORM<span class="dot">.</span></div>
    <div class="page-tag">04 / 06 · Les écrans</div>
    <div class="wrap">
      <h1>Ce que le coach <span class="accent">voit<span class="dot">.</span></span></h1>
      <div class="grid">
        <div class="screen">
          <div class="bar"><div class="dot-r"></div><div class="dot-y"></div><div class="dot-g"></div></div>
          <div class="image" style="background-image:url('./d-00-home.png');"></div>
          <div class="label">01 · <span class="accent">CEO Dashboard</span> — MRR, retention, score, alertes</div>
        </div>
        <div class="screen">
          <div class="bar"><div class="dot-r"></div><div class="dot-y"></div><div class="dot-g"></div></div>
          <div class="image" style="background-image:url('./d-04-business.png');"></div>
          <div class="label">02 · <span class="accent">Sentinel IA</span> — anti-churn + forecast 90j</div>
        </div>
        <div class="screen">
          <div class="bar"><div class="dot-r"></div><div class="dot-y"></div><div class="dot-g"></div></div>
          <div class="image" style="background-image:url('./d-03b-builder.png');"></div>
          <div class="label">03 · <span class="accent">Programme Builder</span> — templates + drag-drop</div>
        </div>
        <div class="screen">
          <div class="bar"><div class="dot-r"></div><div class="dot-y"></div><div class="dot-g"></div></div>
          <div class="image" style="background-image:url('./d-02-clients.png');"></div>
          <div class="label">04 · <span class="accent">Tracking client</span> — 24 athlètes en 1 écran</div>
        </div>
      </div>
    </div>
  </body></html>`;
}

function pricing() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; padding:100px; display:flex; flex-direction:column; justify-content:center; }
    h1 { font-size:90px; font-weight:900; line-height:0.95; letter-spacing:-0.03em; text-align:center; margin-bottom:30px; }
    h1 .accent { color:#14e6c5; }
    .subtitle { text-align:center; font-size:26px; font-weight:500; color:rgba(255,255,255,0.6); margin-bottom:60px; }
    .compare { display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:50px; }
    .col {
      background:rgba(255,255,255,0.03);
      border:1.5px solid rgba(255,255,255,0.08);
      border-radius:28px;
      padding:50px 40px;
    }
    .col.win { border-color:rgba(20,230,197,0.5); background:rgba(20,230,197,0.06); }
    .label { font-size:18px; font-weight:700; letter-spacing:0.18em; opacity:0.5; text-transform:uppercase; margin-bottom:18px; }
    .col.win .label { color:#14e6c5; opacity:1; }
    .name { font-size:44px; font-weight:900; letter-spacing:-0.02em; margin-bottom:24px; }
    .row { font-size:22px; font-weight:500; margin-bottom:12px; color:rgba(255,255,255,0.85); }
    .row.bad { color:#ff7b7b; }
    .row.good { color:#14e6c5; }
    .price { font-size:60px; font-weight:900; margin-top:24px; letter-spacing:-0.02em; }
    .price.win { color:#14e6c5; }
    .price small { font-size:24px; opacity:0.7; font-weight:600; }
    .footer { text-align:center; }
    .footer h2 { font-size:36px; font-weight:900; color:#14e6c5; line-height:1.2; }
  </style></head><body>
    <div class="brand-tag">RB PERFORM<span class="dot">.</span></div>
    <div class="page-tag">05 / 06 · Pricing</div>
    <div class="wrap">
      <h1>Le calcul est<br/>vite <span class="accent">fait<span class="dot">.</span></span></h1>
      <div class="subtitle">Pourquoi les coachs vont signer.</div>
      <div class="compare">
        <div class="col">
          <div class="label">Eux · Trainerize</div>
          <div class="name">Trainerize</div>
          <div class="row bad">+ 8% commission sur chaque vente</div>
          <div class="row bad">79€/mois abonnement</div>
          <div class="row">App pour coacher</div>
          <div class="price">948€<small>/an</small></div>
        </div>
        <div class="col win">
          <div class="label">Nous · RB Perform</div>
          <div class="name">RB Perform</div>
          <div class="row good">0% commission. Jamais.</div>
          <div class="row good">Dès 199€/mois</div>
          <div class="row">App pour piloter le business</div>
          <div class="price win">0€<small>/an de commission</small></div>
        </div>
      </div>
      <div class="footer">
        <h2>10 000€ encaissés/mois?<br/>800€ économisés. Chaque mois.</h2>
      </div>
    </div>
  </body></html>`;
}

function founder() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    body {
      background:#0d1726;
    }
    .photo {
      position:absolute; inset:0;
      background-image:url('./rayan-gym-teal.png');
      background-size:cover;
      background-position: 50% 30%;
      filter: contrast(1.05) brightness(0.78) saturate(1.05);
    }
    .photo::after {
      content:''; position:absolute; inset:0;
      background: linear-gradient(180deg, rgba(13,23,38,0.25) 0%, rgba(13,23,38,0.35) 50%, rgba(13,23,38,0.92) 100%);
    }
    .wrap {
      position:absolute; inset:0;
      display:flex; flex-direction:column; justify-content:flex-end;
      padding:100px;
      z-index:2;
    }
    .eyebrow { font-size:22px; font-weight:700; letter-spacing:0.25em; color:#14e6c5; text-transform:uppercase; margin-bottom:30px; }
    h1 { font-size:110px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:40px; color:#fff; }
    h1 .accent { color:#14e6c5; }
    .bio {
      font-size:26px; font-weight:500; color:rgba(255,255,255,0.85); line-height:1.5;
      max-width:900px;
      background:rgba(13,23,38,0.5);
      padding:30px;
      border-radius:18px;
      border:1px solid rgba(20,230,197,0.2);
    }
    .bio b { color:#14e6c5; font-weight:900; }
    .page-tag, .brand-tag, .footer-brand { color:#fff; opacity:0.7; z-index:3; }
  </style></head><body>
    <div class="photo"></div>
    <div class="brand-tag">RB PERFORM<span class="dot">.</span></div>
    <div class="page-tag">06 / 06 · Fondateur</div>
    <div class="wrap">
      <div class="eyebrow">Construit par un athlète</div>
      <h1>Rayan Bonte<span class="dot accent">.</span></h1>
      <div class="bio">
        <b>21 ans · Rugbyman XIII national (SOA)</b>. Un athlète qui vit du coaching et qui a codé l'outil qui lui manquait.<br/><br/>
        Pas un dev en hoodie. Pas un consultant. Un coach qui connaît les vrais problèmes des coachs — et qui a passé 18 mois à construire la solution.<br/><br/>
        RB Perform, c'est sa réponse à : "comment les coachs sportifs scalent sans cramer leur santé?"
      </div>
    </div>
  </body></html>`;
}

const pages = [
  { name: '01-cover', html: cover() },
  { name: '02-problem', html: problem() },
  { name: '03-solution', html: solution() },
  { name: '04-screens', html: screens() },
  { name: '05-pricing', html: pricing() },
  { name: '06-founder', html: founder() },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1190, height: 1684 }, // A4 portrait at ~144 DPI
    deviceScaleFactor: 2,
  });

  for (const p of pages) {
    const page = await ctx.newPage();
    const tmpPath = path.join(HTML_DIR, '__' + p.name + '.html');
    fs.writeFileSync(tmpPath, p.html);
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '__page-' + p.name + '.png'),
      type: 'png',
      clip: { x:0, y:0, width:1190, height:1684 },
    });
    fs.unlinkSync(tmpPath);
    await page.close();
    console.log('✓ Generated page', p.name);
  }

  await browser.close();
  console.log('All pages generated as PNG.');
})();
