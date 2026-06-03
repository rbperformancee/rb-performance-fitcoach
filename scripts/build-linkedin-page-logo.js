// Logo carré LinkedIn Page — 800×800 (2x du standard 400×400)
// Apparaît partout : recherche, posts, mentions = critical brand asset
// Format : fond navy + monogram brand

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/tmp/linkedin-page-logo';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 800, H = 800; // 2x du 400×400 LinkedIn

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; font-family:'Inter', sans-serif; background:#0d1726; position:relative; }

  /* Fond gradient navy + flare teal central */
  body::before {
    content:''; position:absolute; inset:0;
    background:
      radial-gradient(circle at 50% 50%, rgba(20,230,197,0.15) 0%, rgba(13,23,38,0) 65%),
      linear-gradient(135deg, #0d1726 0%, #111e35 50%, #0d1726 100%);
  }

  /* Wordmark centré */
  .logo {
    position:absolute;
    top:50%; left:50%; transform:translate(-50%,-50%);
    text-align:center;
    z-index:5;
  }
  .wordmark {
    font-size:130px; font-weight:900;
    color:#fff; letter-spacing:-0.04em; line-height:1;
  }
  .wordmark .dot {
    color:#14e6c5; font-weight:900;
  }
  .tagline-mini {
    margin-top:24px;
    font-size:30px; font-weight:700;
    letter-spacing:0.20em;
    color:rgba(20,230,197,0.85);
    text-transform:uppercase;
  }
</style></head>
<body>
  <div class="logo">
    <div class="wordmark">RB<span class="dot">.</span></div>
    <div class="wordmark" style="margin-top:6px">PERFORM<span class="dot">.</span></div>
    <div class="tagline-mini">· Pour les coachs</div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const tmpHtml = path.join(OUT_DIR, '__logo.html');
  fs.writeFileSync(tmpHtml, HTML);
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const outFile = path.join(OUT_DIR, 'linkedin-page-logo-rb-perform-800.png');
  await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`✓ ${outFile}`);
  await browser.close();
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
