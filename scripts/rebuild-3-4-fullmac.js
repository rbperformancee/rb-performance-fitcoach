// Rebuild slides 3 & 4 with FULL Mac window (no crop)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CAPS = '/tmp/real-captures';
const OUT = '/Users/rayan/Desktop/Carrousel-B2B-FINAL';
const TMP = '/tmp/slides-fullmac';
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
  .brand { position:absolute; bottom:32px; left:0; right:0; text-align:center; font-size:18px; font-weight:700; letter-spacing:0.18em; color:rgba(255,255,255,0.4); }
  .page-num { position:absolute; top:34px; right:48px; font-size:17px; font-weight:700; letter-spacing:0.12em; color:rgba(255,255,255,0.35); }
  .tag { display:inline-block; padding:7px 16px; border:1.5px solid rgba(20,230,197,0.4); border-radius:999px; font-size:15px; font-weight:700; letter-spacing:0.16em; color:#14e6c5; text-transform:uppercase; }
`;

// Slide 3 & 4 — FULL MAC window, no crop, screen at correct 16:10 aspect
function tplMacFull({ pageNum, tag, headline, sub, imgPath }) {
  // Screen: 940px wide → height = 940 * (900/1440) = 587.5 → 588
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding:48px 40px 0; text-align:center; }
    .tag { margin-bottom:18px; }
    h1 { font-size:66px; font-weight:900; line-height:1; letter-spacing:-0.03em; margin-bottom:14px; max-width:960px; }
    h1 .accent { color:#14e6c5; }
    .sub { font-size:23px; font-weight:500; color:rgba(255,255,255,0.65); line-height:1.4; margin-bottom:30px; max-width:880px; }

    /* === MAC WINDOW === */
    .mac {
      width: 940px;
      border-radius: 14px;
      background: #1a2230;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.07),
        0 1px 0 rgba(255,255,255,0.04) inset,
        0 50px 120px rgba(0,0,0,0.55),
        0 0 140px rgba(20,230,197,0.10);
      overflow: hidden;
      position: relative;
    }
    .mac-titlebar {
      height: 38px;
      background: linear-gradient(180deg, #2a3346 0%, #1f2735 100%);
      display: flex;
      align-items: center;
      padding: 0 14px;
      border-bottom: 1px solid rgba(0,0,0,0.35);
      position: relative;
    }
    .traffic { display: flex; gap: 8px; }
    .traffic span {
      width: 13px; height: 13px; border-radius: 50%;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.25);
    }
    .traffic .r { background: #ff5f57; }
    .traffic .y { background: #febc2e; }
    .traffic .g { background: #28c840; }
    .mac-controls {
      display: flex; gap: 18px;
      margin-left: 16px;
      color: rgba(255,255,255,0.45);
      font-size: 13px;
      align-items: center;
    }
    .mac-controls span { font-size: 16px; }
    .mac-url {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      background: #0d1726;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 7px;
      padding: 6px 18px;
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(255,255,255,0.7);
      letter-spacing: -0.01em;
      min-width: 340px;
      text-align: center;
    }
    .mac-url .lock { color: #14e6c5; margin-right: 7px; font-size: 10px; }
    .mac-right {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      display: flex; gap: 14px;
      color: rgba(255,255,255,0.4);
      font-size: 15px;
    }
    .mac-screen {
      width: 100%;
      aspect-ratio: 1440 / 900;
      background: #0d1726;
      position: relative;
    }
    .mac-screen img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      object-position: top center;
    }
  </style></head><body>
    <div class="page-num">${pageNum}</div>
    <div class="wrap">
      <div class="tag">${tag}</div>
      <h1>${headline}</h1>
      <div class="sub">${sub}</div>
      <div class="mac">
        <div class="mac-titlebar">
          <div class="traffic"><span class="r"></span><span class="y"></span><span class="g"></span></div>
          <div class="mac-controls">
            <span>‹</span>
            <span>›</span>
          </div>
          <div class="mac-url"><span class="lock">●</span>rbperform.app</div>
          <div class="mac-right">
            <span>⤴</span>
            <span>⋯</span>
          </div>
        </div>
        <div class="mac-screen"><img src="${imgPath}" /></div>
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
      html: tplMacFull({
        pageNum: '03 / 09',
        tag: '01 · CEO Dashboard',
        headline: 'Ton business en <span class="accent">live<span class="dot">.</span></span>',
        sub: '24 clients · 2 260€ MRR · 96% rétention.<br/>Tout. En 1 écran.',
        imgPath: 'file://' + CAPS + '/home.png',
      }),
    },
    {
      name: 'slide-4-sentinel',
      html: tplMacFull({
        pageNum: '04 / 09',
        tag: '02 · Anti-churn IA',
        headline: 'Sentinel détecte<br/>les <span class="accent">fuites<span class="dot">.</span></span>',
        sub: '« 20 clients à réactiver aujourd\'hui. »<br/>Relance auto déclenchée en 1 clic.',
        imgPath: 'file://' + CAPS + '/business.png',
      }),
    },
    {
      name: 'slide-5-programme',
      html: tplMacFull({
        pageNum: '05 / 09',
        tag: '03 · Programme Builder',
        headline: 'Plus jamais<br/>d\'<span class="accent">Excel<span class="dot">.</span></span>',
        sub: 'Templates, exercices visuels, export PDF natif.<br/>Le builder pensé pour les coachs.',
        imgPath: 'file://' + CAPS + '/builder.png',
      }),
    },
    {
      name: 'slide-6-clients',
      html: tplMacFull({
        pageNum: '06 / 09',
        tag: '04 · Tracking client',
        headline: 'Tes athlètes<span class="dot">.</span><br/>1 écran.',
        sub: 'Force · perf · hybrid. Filtres en 1 clic.<br/>Voice AI pour logger en 2s.',
        imgPath: 'file://' + CAPS + '/clients.png',
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
