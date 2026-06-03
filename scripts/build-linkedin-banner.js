// Bannière LinkedIn 1584×396 — v5 respecte specs LinkedIn 2026 :
// - Safe zone centre-droit (50-85% width)
// - Coin bas-gauche 568×264 = vide volontaire (avatar y vient)
// - Bas 25% évité (zone chevauchement avatar)
// - Texte minimal, sub-line = 3 piliers produit
// - Charte navy #0d1726 + teal #14e6c5

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/tmp/linkedin-banner';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1584, H = 396;

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; font-family:'Inter', -apple-system, sans-serif; background:#0d1726; color:#fff; position:relative; }

  /* Fond gradient navy + flare teal subtil côté droit (où est le texte) */
  body::before {
    content:''; position:absolute; inset:0;
    background:
      radial-gradient(ellipse 800px 500px at 75% 50%, rgba(20,230,197,0.18) 0%, rgba(13,23,38,0) 60%),
      radial-gradient(ellipse 500px 400px at 25% 30%, rgba(20,230,197,0.06) 0%, rgba(13,23,38,0) 70%),
      linear-gradient(135deg, #0d1726 0%, #111e35 60%, #0d1726 100%);
  }

  /* Grid pattern subtle gauche — visible mais sera partiellement masqué par avatar */
  .grid-bg {
    position:absolute; top:0; left:0; width:35%; height:100%;
    opacity:0.15;
    background-image:
      linear-gradient(rgba(20,230,197,0.30) 1px, transparent 1px),
      linear-gradient(90deg, rgba(20,230,197,0.30) 1px, transparent 1px);
    background-size:54px 54px;
    mask-image: linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%);
  }

  /* Dots accent teal — dans zone gauche (cachés partiellement par avatar = OK) */
  .dot-deco {
    position:absolute;
    width:10px; height:10px; border-radius:50%;
    background:#14e6c5;
    box-shadow: 0 0 24px rgba(20,230,197,0.6);
  }
  .dot-1 { top:75px; left:140px; }
  .dot-2 { top:75px; left:410px; width:6px; height:6px; opacity:0.4; }

  /* Bloc texte — centré vertical, décalé vers le centre horizontalement */
  .content {
    position:absolute;
    top:50%; right:180px; transform:translateY(-50%);
    text-align:right;
    z-index:5;
    max-width:980px;
  }

  .brand {
    font-size:52px; font-weight:900; letter-spacing:-0.025em;
    color:#fff; line-height:1; margin-bottom:16px;
  }
  .brand .dot { color:#14e6c5; }

  .tagline {
    font-size:42px; font-weight:800; color:#fff;
    line-height:1.1; letter-spacing:-0.025em;
    margin-bottom:22px;
  }
  .tagline .accent { color:#14e6c5; font-weight:900; }
  .tagline .you { color:rgba(255,255,255,0.75); font-weight:600; }

  .pillars {
    display:flex; justify-content:flex-end; align-items:center; gap:18px;
    font-size:22px; font-weight:700;
    color:rgba(255,255,255,0.92); letter-spacing:0.01em;
    margin-bottom:18px;
  }
  .pillars .sep { color:#14e6c5; font-weight:900; font-size:18px; }

  .url {
    display:inline-flex; align-items:center; gap:10px;
    padding:11px 22px;
    background:rgba(20,230,197,0.10);
    border:1.5px solid rgba(20,230,197,0.45);
    border-radius:999px;
    font-size:17px; font-weight:700; letter-spacing:0.04em;
    color:#14e6c5;
  }
  .url::before { content:'→'; font-weight:900; }
</style></head>
<body>
  <div class="grid-bg"></div>
  <div class="dot-deco dot-1"></div>
  <div class="dot-deco dot-2"></div>
  <div class="content">
    <div class="brand">RB<span class="dot">.</span>PERFORM<span class="dot">.</span></div>
    <div class="tagline"><span class="you">Tu coaches.</span><br>RB Perform <span class="accent">pilote ton business</span>.</div>
    <div class="pillars">
      <span>Revenu temps réel</span><span class="sep">·</span>
      <span>Alertes départ</span><span class="sep">·</span>
      <span>0% commission</span>
    </div>
    <div class="url">rbperform.app</div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const tmpHtml = path.join(OUT_DIR, '__banner.html');
  fs.writeFileSync(tmpHtml, HTML);
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const outFile = path.join(OUT_DIR, 'linkedin-banner-rb-perform.png');
  await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`✓ ${outFile}`);
  await browser.close();
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
