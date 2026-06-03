// Rebuild slides 3 & 4 using REAL /demo screenshots
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CAPS = '/tmp/real-captures';
const OUT = '/Users/rayan/Desktop/Carrousel-B2B-FINAL';
const TMP = '/tmp/slides-real';
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

// Slide template — tight crop to remove dead space
function tplBrowser({ pageNum, tag, headline, sub, imgPath, cropY = 0, cropH = 500 }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding:60px 40px 0; text-align:center; }
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
    .screen-wrap {
      width:100%;
      height: ${Math.round(1000 * cropH / 1440)}px;
      overflow:hidden;
      background:#0d1726;
      position:relative;
    }
    .screen-img {
      width:100%;
      display:block;
      position:absolute;
      top: -${Math.round(1000 * cropY / 1440)}px;
      left:0;
    }
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
        <div class="screen-wrap">
          <img class="screen-img" src="${imgPath}" />
        </div>
      </div>
    </div>
    <div class="brand">RB PERFORM<span class="dot">.</span></div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  // Real capture dimensions = 1440x900 (browser viewport) × DPR 2 = 2880x1800
  // We display at 1000px wide. cropY/cropH are in original 1440 coordinates.

  const slides = [
    {
      name: 'slide-3-dashboard',
      html: tplBrowser({
        pageNum: '03 / 09',
        tag: '01 · CEO Dashboard',
        headline: 'Ton business en <span class="accent">live<span class="dot">.</span></span>',
        sub: '24 clients · 2 260€ MRR · 96% rétention.<br/>Tout. En 1 écran.',
        imgPath: 'file://' + CAPS + '/home.png',
        cropY: 40,
        cropH: 580,
      }),
    },
    {
      name: 'slide-4-sentinel',
      html: tplBrowser({
        pageNum: '04 / 09',
        tag: '02 · Anti-churn IA',
        headline: 'Sentinel détecte<br/>les <span class="accent">fuites<span class="dot">.</span></span>',
        sub: '« 20 clients à réactiver aujourd\'hui. »<br/>Relance auto déclenchée en 1 clic.',
        imgPath: 'file://' + CAPS + '/business.png',
        cropY: 40,
        cropH: 580,
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
