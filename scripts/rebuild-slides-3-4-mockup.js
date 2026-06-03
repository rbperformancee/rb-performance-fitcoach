// Rebuild slides 3 & 4 with pure HTML dashboard mockups (no live demo capture)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = '/Users/rayan/Desktop/Carrousel-B2B-FINAL';
const TMP = '/tmp/slides-mockup';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const W = 1080, H = 1350;

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

// ===========================
// MOCKUP 1: CEO Dashboard (slide 3)
// ===========================
const DASHBOARD_MOCKUP = `
  <div class="dash">
    <div class="dash-header">
      <div class="dash-brand">Coach<span style="color:#14e6c5">.</span></div>
      <div class="dash-user">
        <div class="dash-avatar">R</div>
        <div class="dash-name">Rayan</div>
      </div>
    </div>
    <div class="dash-kpis">
      <div class="kpi">
        <div class="kpi-label">CLIENTS ACTIFS</div>
        <div class="kpi-value">47</div>
        <div class="kpi-trend up">+5 ce mois</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">MRR</div>
        <div class="kpi-value accent">8 200€</div>
        <div class="kpi-trend up">+18% / mois</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">RÉTENTION 90j</div>
        <div class="kpi-value">96%</div>
        <div class="kpi-trend up">+2 pts</div>
      </div>
    </div>
    <div class="dash-alert">
      <div class="alert-dot"></div>
      <div class="alert-text">
        <span class="alert-title">⚠ Sentinel — 5 clients à réactiver</span>
        <span class="alert-sub">Marc (38j), Sarah (24j), Léa (18j), Tom (15j), Hugo (12j)</span>
      </div>
      <div class="alert-cta">Voir actions →</div>
    </div>
    <div class="dash-row">
      <div class="dash-card">
        <div class="card-label">PROCHAINES SÉANCES</div>
        <div class="card-list">
          <div class="card-item"><span class="dot-time">09:00</span> Pierre R. · Push</div>
          <div class="card-item"><span class="dot-time">11:00</span> Élise M. · Pull</div>
          <div class="card-item"><span class="dot-time">14:30</span> Marc B. · Legs</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="card-label">OBJECTIF MENSUEL</div>
        <div class="card-progress">
          <div class="progress-num">8 200€<span class="progress-target"> / 10 000€</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:82%"></div></div>
          <div class="progress-pct">82%</div>
        </div>
      </div>
    </div>
  </div>
`;

const DASHBOARD_STYLE = `
  .dash { width:100%; padding:20px 24px; color:#fff; background:#0a1322; }
  .dash-header { display:flex; justify-content:space-between; align-items:center; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.06); }
  .dash-brand { font-size:22px; font-weight:900; letter-spacing:-0.02em; }
  .dash-user { display:flex; align-items:center; gap:10px; }
  .dash-avatar { width:30px; height:30px; border-radius:50%; background:#14e6c5; color:#0d1726; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:13px; }
  .dash-name { font-size:14px; font-weight:600; }
  .dash-kpis { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-top:16px; }
  .kpi { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px 18px; }
  .kpi-label { font-size:10px; font-weight:700; letter-spacing:0.14em; color:rgba(255,255,255,0.5); margin-bottom:8px; }
  .kpi-value { font-size:36px; font-weight:900; letter-spacing:-0.02em; line-height:1; }
  .kpi-trend { font-size:11px; font-weight:600; margin-top:6px; color:#14e6c5; }
  .dash-alert { display:flex; align-items:center; gap:14px; background:linear-gradient(90deg, rgba(255,123,123,0.10), rgba(255,123,123,0.03)); border:1px solid rgba(255,123,123,0.25); border-radius:12px; padding:14px 18px; margin-top:14px; }
  .alert-dot { width:10px; height:10px; border-radius:50%; background:#ff7b7b; box-shadow:0 0 12px rgba(255,123,123,0.6); flex-shrink:0; }
  .alert-text { flex:1; display:flex; flex-direction:column; gap:2px; }
  .alert-title { font-size:13px; font-weight:800; color:#ff9b9b; }
  .alert-sub { font-size:11px; font-weight:500; color:rgba(255,255,255,0.55); }
  .alert-cta { font-size:12px; font-weight:700; color:#14e6c5; }
  .dash-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px; }
  .dash-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px 18px; }
  .card-label { font-size:10px; font-weight:700; letter-spacing:0.14em; color:rgba(255,255,255,0.5); margin-bottom:10px; }
  .card-list { display:flex; flex-direction:column; gap:8px; }
  .card-item { font-size:12px; font-weight:500; color:rgba(255,255,255,0.85); display:flex; align-items:center; gap:8px; }
  .dot-time { font-size:11px; font-weight:700; color:#14e6c5; background:rgba(20,230,197,0.1); padding:2px 8px; border-radius:6px; }
  .progress-num { font-size:24px; font-weight:900; letter-spacing:-0.01em; }
  .progress-num .progress-target { font-size:12px; color:rgba(255,255,255,0.5); font-weight:600; }
  .progress-bar { width:100%; height:6px; background:rgba(255,255,255,0.06); border-radius:999px; margin-top:8px; overflow:hidden; }
  .progress-fill { height:100%; background:linear-gradient(90deg, #14e6c5, #0fb89c); border-radius:999px; }
  .progress-pct { font-size:11px; font-weight:700; color:#14e6c5; margin-top:6px; text-align:right; }
`;

// ===========================
// MOCKUP 2: Sentinel detail (slide 4)
// ===========================
const SENTINEL_MOCKUP = `
  <div class="dash">
    <div class="dash-header">
      <div class="dash-brand">Coach<span style="color:#14e6c5">.</span> <span style="color:rgba(255,255,255,0.4); font-weight:500; font-size:14px; margin-left:6px;">/ Business</span></div>
      <div class="dash-user">
        <div class="dash-avatar">R</div>
        <div class="dash-name">Rayan</div>
      </div>
    </div>
    <div class="sentinel-title">
      <div class="sentinel-icon">⚠</div>
      <div>
        <div class="sentinel-h">Sentinel — 5 clients à réactiver aujourd'hui</div>
        <div class="sentinel-sub">Analyse anti-churn · mise à jour il y a 2 min</div>
      </div>
    </div>
    <div class="sentinel-list">
      <div class="sent-row priority">
        <div class="sent-avatar" style="background:#ff7b7b">M</div>
        <div class="sent-info">
          <div class="sent-name">Marc Bertin <span class="sent-tag">FORCE</span></div>
          <div class="sent-meta">Inactif depuis 38j · dernier paiement 12 avril</div>
        </div>
        <div class="sent-action">Lancer relance auto →</div>
      </div>
      <div class="sent-row">
        <div class="sent-avatar" style="background:#febc2e">S</div>
        <div class="sent-info">
          <div class="sent-name">Sarah Dupont <span class="sent-tag">HYBRID</span></div>
          <div class="sent-meta">Inactive depuis 24j · 3 séances ratées</div>
        </div>
        <div class="sent-action">Lancer relance auto →</div>
      </div>
      <div class="sent-row">
        <div class="sent-avatar" style="background:#febc2e">L</div>
        <div class="sent-info">
          <div class="sent-name">Léa Moreau <span class="sent-tag">PERF</span></div>
          <div class="sent-meta">Inactive depuis 18j · pas de log app</div>
        </div>
        <div class="sent-action">Lancer relance auto →</div>
      </div>
      <div class="sent-row">
        <div class="sent-avatar" style="background:#14e6c5">T</div>
        <div class="sent-info">
          <div class="sent-name">Tom Renard <span class="sent-tag">FORCE</span></div>
          <div class="sent-meta">Inactif depuis 15j · objectif manqué</div>
        </div>
        <div class="sent-action">Lancer relance auto →</div>
      </div>
      <div class="sent-row">
        <div class="sent-avatar" style="background:#14e6c5">H</div>
        <div class="sent-info">
          <div class="sent-name">Hugo Lefebvre <span class="sent-tag">HYBRID</span></div>
          <div class="sent-meta">Inactif depuis 12j · paiement à risque</div>
        </div>
        <div class="sent-action">Lancer relance auto →</div>
      </div>
    </div>
  </div>
`;

const SENTINEL_STYLE = `
  ${DASHBOARD_STYLE}
  .sentinel-title { display:flex; align-items:center; gap:16px; margin-top:18px; padding:16px 18px; background:rgba(255,123,123,0.08); border:1px solid rgba(255,123,123,0.25); border-radius:12px; }
  .sentinel-icon { width:40px; height:40px; border-radius:10px; background:rgba(255,123,123,0.18); display:flex; align-items:center; justify-content:center; font-size:22px; color:#ff9b9b; }
  .sentinel-h { font-size:16px; font-weight:800; color:#fff; }
  .sentinel-sub { font-size:11px; font-weight:500; color:rgba(255,255,255,0.5); margin-top:2px; }
  .sentinel-list { margin-top:14px; display:flex; flex-direction:column; gap:8px; }
  .sent-row { display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 16px; }
  .sent-row.priority { border-color:rgba(255,123,123,0.35); background:rgba(255,123,123,0.04); }
  .sent-avatar { width:32px; height:32px; border-radius:50%; color:#0d1726; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
  .sent-info { flex:1; }
  .sent-name { font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px; }
  .sent-tag { font-size:9px; font-weight:800; letter-spacing:0.1em; padding:2px 7px; border-radius:4px; background:rgba(20,230,197,0.12); color:#14e6c5; }
  .sent-meta { font-size:11px; font-weight:500; color:rgba(255,255,255,0.55); margin-top:2px; }
  .sent-action { font-size:11px; font-weight:700; color:#14e6c5; flex-shrink:0; }
`;

// ===========================
// SLIDE TEMPLATE WRAPPER
// ===========================
function slideWithDashboard({ pageNum, tag, headline, sub, dashboardHtml, dashboardStyle }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding:60px 50px 0; text-align:center; }
    .tag { margin-bottom:22px; }
    h1 { font-size:74px; font-weight:900; line-height:1; letter-spacing:-0.03em; margin-bottom:16px; max-width:960px; }
    h1 .accent { color:#14e6c5; }
    .sub { font-size:26px; font-weight:500; color:rgba(255,255,255,0.65); line-height:1.4; margin-bottom:36px; max-width:880px; }
    .browser { width:1000px; border-radius:16px; background:#1c2535; box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.55), 0 0 120px rgba(20,230,197,0.12); overflow:hidden; position:relative; }
    .browser-bar { height:42px; background:linear-gradient(180deg, #1f2a3d 0%, #182232 100%); display:flex; align-items:center; padding:0 16px; border-bottom:1px solid rgba(255,255,255,0.05); }
    .traffic { display:flex; gap:8px; margin-right:20px; }
    .traffic span { width:13px; height:13px; border-radius:50%; display:block; }
    .traffic .r { background:#ff5f57; } .traffic .y { background:#febc2e; } .traffic .g { background:#28c840; }
    .url { flex:1; max-width:380px; margin:0 auto; background:#0d1726; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:7px 18px; font-size:13px; font-weight:500; color:rgba(255,255,255,0.7); text-align:center; letter-spacing:-0.01em; }
    .url .lock { color:#14e6c5; margin-right:8px; font-size:11px; }
    ${dashboardStyle}
  </style></head><body>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      <div class="tag">${tag}</div>
      <h1>${headline}</h1>
      <div class="sub">${sub}</div>
      <div class="browser">
        <div class="browser-bar">
          <div class="traffic"><span class="r"></span><span class="y"></span><span class="g"></span></div>
          <div class="url"><span class="lock">●</span>rbperform.app</div>
        </div>
        ${dashboardHtml}
      </div>
    </div>
    <div class="brand">RB PERFORM<span class="dot">.</span></div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  const slides = [
    {
      name: 'slide-3-dashboard',
      html: slideWithDashboard({
        pageNum: '03 / 09',
        tag: '01 · CEO Dashboard',
        headline: 'Ton business en <span class="accent">live<span class="dot">.</span></span>',
        sub: '47 clients · 8 200€ MRR · 96% rétention.<br/>Tout. En 1 écran.',
        dashboardHtml: DASHBOARD_MOCKUP,
        dashboardStyle: DASHBOARD_STYLE,
      }),
    },
    {
      name: 'slide-4-sentinel',
      html: slideWithDashboard({
        pageNum: '04 / 09',
        tag: '02 · Anti-churn IA',
        headline: 'Sentinel détecte<br/>les <span class="accent">fuites<span class="dot">.</span></span>',
        sub: '« 5 clients à réactiver aujourd\'hui. »<br/>Marc inactif depuis 38j → relance auto.',
        dashboardHtml: SENTINEL_MOCKUP,
        dashboardStyle: SENTINEL_STYLE,
      }),
    },
  ];

  for (const s of slides) {
    const htmlPath = path.join(TMP, `__${s.name}.html`);
    fs.writeFileSync(htmlPath, s.html);
    const p = await ctx.newPage();
    await p.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(OUT, s.name + '.png'), clip: { x: 0, y: 0, width: W, height: H }, type: 'png' });
    await p.close();
    console.log('✓', s.name);
    try { fs.unlinkSync(htmlPath); } catch(e) {}
  }

  await browser.close();
  console.log('\n✓ DONE');
})();
