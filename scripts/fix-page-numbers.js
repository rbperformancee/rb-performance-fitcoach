// Overlay correct page numbers (X/10) on all slides
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = '/Users/rayan/Desktop/Carrousel-B2B-FINAL';
const TMP = '/tmp/page-num-fix';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const W = 1080, H = 1350;

const slides = [
  { file: 'slide-2-founder-hook.png', num: '02 / 10' },
  { file: 'slide-3-dashboard.png',   num: '03 / 10' },
  { file: 'slide-4-sentinel.png',    num: '04 / 10' },
  { file: 'slide-5-programme.png',   num: '05 / 10' },
  { file: 'slide-6-clients.png',     num: '06 / 10' },
  { file: 'slide-7-overview.png',    num: '07 / 10' },
  { file: 'slide-8-zero.png',        num: '08 / 10' },
  { file: 'slide-9-compare.png',     num: '09 / 10' },
  { file: 'slide-10-cta.png',        num: '10 / 10' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (const s of slides) {
    const src = path.join(DIR, s.file);
    if (!fs.existsSync(src)) { console.log('⚠ skip', s.file); continue; }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; overflow:hidden; position:relative; background:#0d1726; }
.bg { position:absolute; inset:0; }
.bg img { width:100%; height:100%; display:block; }
/* Cover old page-num with a dark patch sampling the BG */
.cover {
  position:absolute; top:30px; right:38px;
  width:200px; height:40px;
  background: transparent;
}
/* Overlay new page-num — match original style */
.page-num {
  position:absolute; top:38px; right:54px;
  font-family:'Inter', sans-serif;
  font-size:17px; font-weight:700; letter-spacing:0.12em;
  color:rgba(255,255,255,0.42);
  text-shadow: 0 0 10px rgba(13,23,38,1), 0 0 20px rgba(13,23,38,0.8);
  z-index:10;
}
/* Heavy darkening rectangle to hide old number */
.mask {
  position:absolute; top:32px; right:40px;
  width:180px; height:38px;
  background: linear-gradient(to left, rgba(13,23,38,1) 0%, rgba(13,23,38,0.95) 60%, rgba(13,23,38,0) 100%);
  z-index:5;
  border-radius:4px;
}
</style></head><body>
<div class="bg"><img src="file://${src}" /></div>
<div class="mask"></div>
<div class="page-num">${s.num}</div>
</body></html>`;

    const htmlPath = path.join(TMP, '__' + s.file.replace('.png', '.html'));
    fs.writeFileSync(htmlPath, html);
    const p = await ctx.newPage();
    await p.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await p.screenshot({ path: src, clip: { x:0, y:0, width:W, height:H }, type: 'png' });
    await p.close();
    console.log('✓', s.file, '→', s.num);
    try { fs.unlinkSync(htmlPath); } catch(e) {}
  }

  await browser.close();
  console.log('\n✓ DONE');
})();
