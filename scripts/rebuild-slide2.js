const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = '/Users/rayan/Desktop/Carrousel-B2B-FINAL';
const TMP = '/tmp/slide2';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
const W = 1080, H = 1350;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; font-family:'Inter', sans-serif; background:#0d1726; color:#fff; overflow:hidden; }
.photo { position:absolute; inset:0; background-image:url('file:///tmp/rayan-gym-teal.png'); background-size:cover; background-position:50% 35%; filter:contrast(1.05) brightness(0.92) saturate(1.05); }
.photo::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(13,23,38,0.15) 0%, rgba(13,23,38,0.30) 45%, rgba(13,23,38,0.92) 100%); }
.wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; padding:80px 70px 180px; text-align:center; z-index:2; }
.line1 { font-size:82px; font-weight:900; line-height:0.98; letter-spacing:-0.04em; margin-bottom:10px; color:#fff; }
.line2 { font-size:82px; font-weight:900; line-height:0.98; letter-spacing:-0.04em; color:#14e6c5; margin-bottom:32px; }
.subline { font-size:32px; font-weight:600; color:rgba(255,255,255,0.85); line-height:1.3; max-width:880px; background:rgba(13,23,38,0.45); padding:18px 28px; border-radius:18px; border:1px solid rgba(20,230,197,0.22); backdrop-filter:blur(4px); }
.subline b { color:#14e6c5; font-weight:800; }
.dot { color:#14e6c5; }
.page-num { position:absolute; top:38px; right:54px; font-size:18px; font-weight:700; letter-spacing:0.12em; color:rgba(255,255,255,0.6); z-index:3; }
.brand { position:absolute; bottom:38px; left:0; right:0; text-align:center; font-size:20px; font-weight:700; letter-spacing:0.18em; color:rgba(255,255,255,0.65); z-index:3; }
</style></head><body>
<div class="photo"></div>
<div class="page-num">02 / 09</div>
<div class="wrap">
  <div class="line1">J'ai créé l'outil</div>
  <div class="line2">que les coachs attendaient<span class="dot">.</span></div>
  <div class="subline">L'app qui transforme les coachs en <b>CEO<span class="dot">.</span></b></div>
</div>
<div class="brand">RB PERFORM<span class="dot">.</span></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const htmlPath = path.join(TMP, '__slide2.html');
  fs.writeFileSync(htmlPath, html);
  await p.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'slide-2-founder-hook.png'), clip: { x:0, y:0, width:W, height:H }, type: 'png' });
  await p.close();
  await browser.close();
  console.log('✓ slide-2-founder-hook rebuilt');
})();
