// Cover LinkedIn PAGE ENTREPRISE — 2x resolution = 2256×382 (upload size)
// Format natif 1128×191, ratio 6:1
// No-go zone bas-gauche 300×70 (logo de page LinkedIn s'y place)
// Crop mobile : centre 900px → texte centré

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/tmp/linkedin-page-cover';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 2x pour netteté (LinkedIn downscale)
const W = 2256, H = 382;

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; font-family:'Inter', -apple-system, sans-serif; background:#0d1726; color:#fff; position:relative; }

  /* Fond gradient navy + flares teal */
  body::before {
    content:''; position:absolute; inset:0;
    background:
      radial-gradient(ellipse 1200px 600px at 50% 50%, rgba(20,230,197,0.18) 0%, rgba(13,23,38,0) 60%),
      radial-gradient(ellipse 700px 400px at 15% 30%, rgba(20,230,197,0.10) 0%, rgba(13,23,38,0) 70%),
      radial-gradient(ellipse 700px 400px at 85% 70%, rgba(20,230,197,0.10) 0%, rgba(13,23,38,0) 70%),
      linear-gradient(135deg, #0d1726 0%, #111e35 50%, #0d1726 100%);
  }

  /* Grid pattern subtle background */
  .grid-bg {
    position:absolute; inset:0;
    opacity:0.10;
    background-image:
      linear-gradient(rgba(20,230,197,0.30) 1px, transparent 1px),
      linear-gradient(90deg, rgba(20,230,197,0.30) 1px, transparent 1px);
    background-size:80px 80px;
    mask-image: radial-gradient(ellipse 1400px 400px at 50% 50%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: radial-gradient(ellipse 1400px 400px at 50% 50%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
  }

  /* Dot accents */
  .dot-deco {
    position:absolute;
    width:16px; height:16px; border-radius:50%;
    background:#14e6c5;
    box-shadow: 0 0 32px rgba(20,230,197,0.7);
  }
  .dot-1 { top:80px; left:380px; }
  .dot-2 { top:280px; right:420px; width:12px; height:12px; opacity:0.5; }

  /* Texte aligné droite — gauche vide pour logo de page en bas-gauche */
  .content {
    position:absolute;
    top:50%; right:160px; transform:translateY(-50%);
    text-align:right;
    z-index:5;
    max-width:1600px;
  }

  .brand {
    font-size:72px; font-weight:900; letter-spacing:-0.025em;
    color:#fff; line-height:1; margin-bottom:24px;
  }
  .brand .dot { color:#14e6c5; }

  .tagline {
    font-size:54px; font-weight:800; color:#fff;
    line-height:1.1; letter-spacing:-0.025em;
    margin-bottom:28px;
  }
  .tagline .accent { color:#14e6c5; font-weight:900; }
  .tagline .you { color:rgba(255,255,255,0.75); font-weight:600; }

  .pillars {
    display:flex; justify-content:flex-end; align-items:center; gap:32px;
    font-size:32px; font-weight:700;
    color:rgba(255,255,255,0.92); letter-spacing:0.01em;
  }
  .pillars .sep { color:#14e6c5; font-weight:900; font-size:26px; }
</style></head>
<body>
  <div class="grid-bg"></div>
  <div class="dot-deco dot-1"></div>
  <div class="dot-deco dot-2"></div>
  <div class="content">
    <div class="brand">RB<span class="dot">.</span>PERFORM<span class="dot">.</span></div>
    <div class="tagline"><span class="you">Tu coaches.</span> RB Perform <span class="accent">pilote ton business</span>.</div>
    <div class="pillars">
      <span>Revenu temps réel</span><span class="sep">·</span>
      <span>Alertes départ</span><span class="sep">·</span>
      <span>0% commission</span>
    </div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const tmpHtml = path.join(OUT_DIR, '__cover.html');
  fs.writeFileSync(tmpHtml, HTML);
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const outFile = path.join(OUT_DIR, 'linkedin-page-cover-rb-perform-2x.png');
  await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`✓ ${outFile}`);
  await browser.close();
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
