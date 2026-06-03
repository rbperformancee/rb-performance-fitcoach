const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = '/Users/rayan/Desktop/Carrousel-B2B-FINAL';
const TMP = '/tmp/slide-overview';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
const W = 1080, H = 1350;

const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  blocks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>`,
  body: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 3 6-7"/></svg>`,
  run: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="2"/><path d="m5 22 5-7 4 2 3-3-4-5-5 4"/><path d="M14 17h4"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
};

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body {
  width:${W}px; height:${H}px; overflow:hidden;
  font-family:'Inter', -apple-system, sans-serif; color:#fff;
  background:
    radial-gradient(ellipse 900px 600px at 50% 25%, rgba(20,230,197,0.13) 0%, rgba(20,230,197,0) 60%),
    radial-gradient(ellipse 700px 500px at 85% 95%, rgba(20,230,197,0.08) 0%, rgba(20,230,197,0) 70%),
    #0a1322;
  position:relative;
  -webkit-font-smoothing:antialiased;
}
.page-num { position:absolute; top:38px; right:54px; font-size:16px; font-weight:700; letter-spacing:0.14em; color:rgba(255,255,255,0.32); z-index:5; }
.brand { position:absolute; bottom:30px; left:0; right:0; text-align:center; font-size:17px; font-weight:700; letter-spacing:0.2em; color:rgba(255,255,255,0.38); z-index:5; }
.brand .dot { color:#14e6c5; }
.dot { color:#14e6c5; }
.accent { color:#14e6c5; }

.header {
  padding: 56px 60px 0;
  text-align:center;
  position:relative;
  z-index:3;
}
.tag {
  display:inline-block;
  padding:7px 18px;
  border:1.5px solid rgba(20,230,197,0.4);
  border-radius:999px;
  font-size:14px; font-weight:700; letter-spacing:0.18em;
  color:#14e6c5; text-transform:uppercase;
  margin-bottom:18px;
}
h1 {
  font-size:64px; font-weight:900; line-height:1; letter-spacing:-0.035em;
  margin-bottom:14px;
}
h1 .accent { color:#14e6c5; }
.sub {
  font-size:21px; font-weight:500; color:rgba(255,255,255,0.62);
  line-height:1.35; max-width:760px; margin:0 auto;
}

.bento {
  position:absolute;
  top: 340px;
  left: 50px; right: 50px;
  display:grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 130px;
  gap: 12px;
  z-index:2;
}
.card {
  background: linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 22px 24px;
  display:flex; flex-direction:column;
  position:relative;
  overflow:hidden;
}
.card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
}
.card .ico {
  width:36px; height:36px;
  display:flex; align-items:center; justify-content:center;
  background: rgba(20,230,197,0.12);
  border-radius: 10px;
  color: #14e6c5;
  margin-bottom: 14px;
}
.card .ico svg { width:20px; height:20px; }
.card .lbl {
  font-size:10px; font-weight:800; letter-spacing:0.18em;
  color:rgba(20,230,197,0.85); text-transform:uppercase;
  margin-bottom:6px;
}
.card .ttl {
  font-size:18px; font-weight:800; letter-spacing:-0.015em;
  color:#fff; line-height:1.1;
}
.card .desc {
  font-size:12px; font-weight:500; color:rgba(255,255,255,0.5);
  line-height:1.35; margin-top:6px;
}

/* HERO — full width, double height */
.hero {
  grid-column: 1 / 7;
  grid-row: 1 / 3;
  background: linear-gradient(135deg, rgba(20,230,197,0.10) 0%, rgba(20,230,197,0.02) 100%);
  border: 1px solid rgba(20,230,197,0.25);
  flex-direction:row; align-items:center; gap:30px;
  padding: 28px 32px;
}
.hero .ico { width:54px; height:54px; margin-bottom:0; flex-shrink:0; }
.hero .ico svg { width:30px; height:30px; }
.hero-text { flex:1; }
.hero .lbl { font-size:11px; }
.hero .ttl { font-size:32px; margin-top:2px; }
.hero .desc { font-size:14px; margin-top:8px; max-width:520px; }
.hero-kpis { display:flex; gap:24px; flex-shrink:0; }
.hero-kpi { display:flex; flex-direction:column; align-items:flex-end; }
.hero-kpi .v { font-size:30px; font-weight:900; letter-spacing:-0.02em; color:#14e6c5; line-height:1; }
.hero-kpi .l { font-size:9px; font-weight:700; letter-spacing:0.16em; color:rgba(255,255,255,0.45); margin-top:4px; }

/* MEDIUM — 3 wide */
.medium { grid-column: span 3; grid-row: span 1; }

/* SMALL — 2 wide */
.small { grid-column: span 2; grid-row: span 1; }

.footer-stack {
  position:absolute;
  bottom: 80px; left: 50px; right: 50px;
  text-align:center;
  z-index:3;
}
.stack-line {
  font-size:22px; font-weight:800; letter-spacing:-0.01em;
  color:#fff;
}
.stack-line .sep { color:rgba(255,255,255,0.25); margin:0 14px; font-weight:400; }
.stack-line .accent { color:#14e6c5; }
</style></head><body>
  <div class="page-num">07 / 10</div>

  <div class="header">
    <div class="tag">L'app complète</div>
    <h1>Tout ce qu'il y a<br/>dans <span class="accent">l'app<span class="dot">.</span></span></h1>
    <div class="sub">10 modules. 1 abonnement. Pensé pour les coachs qui veulent piloter, pas bricoler.</div>
  </div>

  <div class="bento">
    <!-- HERO -->
    <div class="card hero">
      <div class="ico">${ICONS.dashboard}</div>
      <div class="hero-text">
        <div class="lbl">Le module pivot</div>
        <div class="ttl">CEO Dashboard</div>
        <div class="desc">Clients, MRR, rétention, alertes Sentinel anti-churn — tout en 1 écran. Mis à jour en temps réel.</div>
      </div>
      <div class="hero-kpis">
        <div class="hero-kpi"><div class="v">24</div><div class="l">CLIENTS</div></div>
        <div class="hero-kpi"><div class="v">2 260€</div><div class="l">MRR</div></div>
        <div class="hero-kpi"><div class="v">96%</div><div class="l">RÉTENTION</div></div>
      </div>
    </div>

    <!-- MEDIUM -->
    <div class="card medium">
      <div class="ico">${ICONS.shield}</div>
      <div class="ttl">Sentinel IA</div>
      <div class="desc">Détecte les clients qui décrochent avant qu'ils partent.</div>
    </div>
    <div class="card medium">
      <div class="ico">${ICONS.blocks}</div>
      <div class="ttl">Programme builder</div>
      <div class="desc">Templates, exercices visuels, export PDF natif.</div>
    </div>

    <!-- SMALL ROW 1 -->
    <div class="card small">
      <div class="ico">${ICONS.users}</div>
      <div class="ttl">Tracking client</div>
    </div>
    <div class="card small">
      <div class="ico">${ICONS.mic}</div>
      <div class="ttl">Voice AI</div>
    </div>
    <div class="card small">
      <div class="ico">${ICONS.apple}</div>
      <div class="ttl">Plan nutrition</div>
    </div>

    <!-- SMALL ROW 2 -->
    <div class="card small">
      <div class="ico">${ICONS.body}</div>
      <div class="ttl">Body composition</div>
    </div>
    <div class="card small">
      <div class="ico">${ICONS.run}</div>
      <div class="ttl">Cardio · Running</div>
    </div>
    <div class="card small">
      <div class="ico">${ICONS.chat}</div>
      <div class="ttl">Chat coach-client</div>
    </div>
  </div>

  <div class="footer-stack">
    <div class="stack-line"><span>10 modules</span><span class="sep">·</span><span>1 abonnement</span><span class="sep">·</span><span class="accent">0% commission<span class="dot">.</span></span></div>
  </div>

  <div class="brand">RB PERFORM<span class="dot">.</span></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const htmlPath = path.join(TMP, '__overview.html');
  fs.writeFileSync(htmlPath, html);
  await p.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'slide-7-overview.png'), clip: { x:0, y:0, width:W, height:H }, type: 'png' });
  await p.close();
  await browser.close();
  console.log('✓ slide-7-overview built');
})();
