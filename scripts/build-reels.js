const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const OUT_DIR = '/Users/rayan/Downloads/reels';
const SCREENS = '/Users/rayan/Downloads/coach-dashboard-captures';
const CARROUSEL = '/Users/rayan/Downloads/carrousel-saas';
const TMP = '/tmp/reels-build';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const W = 1080, H = 1920, FPS = 30;

// ===========================
// COMMON CSS (1080×1920 vertical)
// ===========================
const COMMON = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box;
       -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  html, body {
    width:${W}px; height:${H}px;
    font-family:'Inter', -apple-system, sans-serif;
    background:#0d1726; color:#fff; overflow:hidden;
    position:relative;
  }
  body {
    background:
      radial-gradient(ellipse 900px 700px at 50% 40%, rgba(20,230,197,0.18) 0%, rgba(13,23,38,0) 60%),
      #0d1726;
  }
  .dot { color:#14e6c5; }
`;

// ===========================
// TEMPLATES
// ===========================
function tplBigText({ line1, line2 = '', sub = '', accentLine1 = false, accentLine2 = true }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:120px 80px; text-align:center; }
    .l1 { font-size:160px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:20px; color:${accentLine1 ? '#14e6c5' : '#fff'}; }
    .l2 { font-size:160px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:${accentLine2 ? '#14e6c5' : '#fff'}; }
    .sub { font-size:42px; font-weight:500; color:rgba(255,255,255,0.7); line-height:1.4; margin-top:60px; max-width:880px; }
  </style></head><body>
    <div class="wrap">
      ${line1 ? `<div class="l1">${line1}</div>` : ''}
      ${line2 ? `<div class="l2">${line2}</div>` : ''}
      ${sub ? `<div class="sub">${sub}</div>` : ''}
    </div>
  </body></html>`;
}

function tplPhoneScreen({ tag, headline, sub = '', imgFile, imgPos = 'top center' }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding:140px 60px 0; text-align:center; }
    .tag { display:inline-block; padding:14px 30px; border:1.5px solid rgba(20,230,197,0.4); border-radius:999px; font-size:24px; font-weight:700; letter-spacing:0.16em; color:#14e6c5; text-transform:uppercase; margin-bottom:40px; }
    h1 { font-size:96px; font-weight:900; line-height:1; letter-spacing:-0.03em; margin-bottom:24px; max-width:960px; }
    h1 .accent { color:#14e6c5; }
    .sub { font-size:34px; font-weight:500; color:rgba(255,255,255,0.7); line-height:1.4; margin-bottom:60px; max-width:880px; }
    .browser {
      width:920px;
      border-radius:16px;
      background:#1c2535;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.55), 0 0 120px rgba(20,230,197,0.12);
      overflow:hidden;
    }
    .browser-bar { height:44px; background:#182232; display:flex; align-items:center; padding:0 16px; gap:8px; }
    .traffic { display:flex; gap:8px; }
    .traffic span { width:14px; height:14px; border-radius:50%; display:block; }
    .traffic .r { background:#ff5f57; } .traffic .y { background:#febc2e; } .traffic .g { background:#28c840; }
    .browser-screen { width:100%; aspect-ratio: 1440/900; background-image:url('./${imgFile}'); background-size:cover; background-position:${imgPos}; }
  </style></head><body>
    <div class="wrap">
      ${tag ? `<div class="tag">${tag}</div>` : ''}
      <h1>${headline}</h1>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
      <div class="browser">
        <div class="browser-bar"><div class="traffic"><span class="r"></span><span class="y"></span><span class="g"></span></div></div>
        <div class="browser-screen"></div>
      </div>
    </div>
  </body></html>`;
}

function tplCompareCard({ rank, name, points, isBad, color = null }) {
  const c = color || (isBad ? '#ff5d5d' : '#14e6c5');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:140px 80px; }
    .rank { font-size:300px; font-weight:900; line-height:0.85; color:${c}; opacity:0.18; position:absolute; top:140px; left:80px; }
    .badge { font-size:30px; font-weight:700; letter-spacing:0.25em; text-transform:uppercase; color:${c}; margin-bottom:30px; }
    .name { font-size:160px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:60px; color:#fff; }
    .pts { display:flex; flex-direction:column; gap:24px; align-items:center; }
    .pt { font-size:42px; font-weight:600; color:rgba(255,255,255,0.85); line-height:1.3; max-width:880px; text-align:center; }
    .pt b { color:${c}; font-weight:900; }
  </style></head><body>
    <div class="rank">${rank}</div>
    <div class="wrap">
      <div class="badge">Option ${rank}</div>
      <div class="name">${name}<span class="dot">.</span></div>
      <div class="pts">
        ${points.map(p => `<div class="pt">${p}</div>`).join('')}
      </div>
    </div>
  </body></html>`;
}

function tplCTA() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:120px; text-align:center; }
    .pre { font-size:42px; font-weight:600; color:rgba(255,255,255,0.6); margin-bottom:40px; }
    h1 { font-size:140px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; margin-bottom:80px; }
    h1 .accent { color:#14e6c5; }
    .cta {
      background:#14e6c5; color:#0d1726;
      padding:40px 80px;
      border-radius:999px;
      font-size:52px; font-weight:900;
      box-shadow: 0 30px 80px rgba(20,230,197,0.45);
    }
    .url { font-size:38px; font-weight:600; color:rgba(255,255,255,0.5); margin-top:60px; letter-spacing:-0.01em; }
  </style></head><body>
    <div class="wrap">
      <div class="pre">Le tableau de bord business<br/>des coachs sportifs<span class="dot">.</span></div>
      <h1>Lien en <span class="accent">bio<span class="dot">.</span></span></h1>
      <div class="cta">→ rbperform.app</div>
      <div class="url">@rb_perform</div>
    </div>
  </body></html>`;
}

function tplFounderHook() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    body { background:#0d1726; }
    .photo {
      position:absolute; inset:0;
      background-image:url('./rayan-gym-teal.png');
      background-size:cover; background-position:50% 35%;
      filter: contrast(1.05) brightness(0.65) saturate(1.05);
    }
    .photo::after {
      content:''; position:absolute; inset:0;
      background: linear-gradient(180deg, rgba(13,23,38,0.20) 0%, rgba(13,23,38,0.45) 50%, rgba(13,23,38,0.92) 100%);
    }
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-end; align-items:flex-start; padding:200px 100px; z-index:2; }
    h1 { font-size:140px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#fff; max-width:900px; }
    h1 .accent { color:#14e6c5; }
  </style></head><body>
    <div class="photo"></div>
    <div class="wrap">
      <h1>J'étais coach<span class="dot accent">.</span></h1>
    </div>
  </body></html>`;
}

function tplPhotoHook({ line1, line2 = '', accentLine2 = true }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON}
    body { background:#0d1726; }
    .photo {
      position:absolute; inset:0;
      background-image:url('./rayan-gym-teal.png');
      background-size:cover; background-position:50% 30%;
      filter: contrast(1.05) brightness(0.50) saturate(1.0);
    }
    .photo::after {
      content:''; position:absolute; inset:0;
      background:
        linear-gradient(180deg, rgba(13,23,38,0.40) 0%, rgba(13,23,38,0.55) 50%, rgba(13,23,38,0.80) 100%),
        radial-gradient(ellipse 900px 700px at 50% 50%, rgba(20,230,197,0.18) 0%, rgba(13,23,38,0) 70%);
    }
    .wrap { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:140px 80px; text-align:center; z-index:2; }
    h1 { font-size:160px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#fff; text-shadow: 0 4px 30px rgba(0,0,0,0.6); }
    h1 .l2 { color:${accentLine2 ? '#14e6c5' : '#fff'}; display:block; }
  </style></head><body>
    <div class="photo"></div>
    <div class="wrap">
      <h1>${line1}<span class="l2">${line2}</span></h1>
    </div>
  </body></html>`;
}

// ===========================
// FRAME RENDERER
// ===========================
async function renderFrame(html, name, ctx, htmlDir) {
  const page = await ctx.newPage();
  const tmpPath = path.join(htmlDir, '__' + name + '.html');
  fs.writeFileSync(tmpPath, html);
  await page.goto('file://' + tmpPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const outPath = path.join(TMP, name + '.png');
  await page.screenshot({ path: outPath, clip: { x:0, y:0, width:W, height:H }, type: 'png' });
  fs.unlinkSync(tmpPath);
  await page.close();
  return outPath;
}

// Convert a PNG into a video clip of `dur` seconds at 1080×1920 30fps
function pngToClip(png, dur, outMp4) {
  execSync(
    `ffmpeg -y -loop 1 -framerate ${FPS} -i "${png}" -t ${dur} ` +
    `-vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:0x0d1726,setsar=1" ` +
    `-c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -r ${FPS} "${outMp4}"`,
    { stdio: 'ignore' }
  );
}

// Re-encode the calculator from the ORIGINAL Desktop .mov directly to 1080×1920
// Source recording (~26s, 3024×1964). We crop the centered ROI then pad to 9:16.
// Same crop params as the carrousel build (crop=2360:1875:332:60, scale=1080:858).
function calculatorTo9_16(outMp4) {
  const SRC = "/Users/rayan/Desktop/Enregistrement de l’écran 2026-05-15 à 11.58.20.mov";
  // Trim 3s..21s = 18s window with full slider + reveal action.
  // Then crop the ROI, scale to 1080 width, pad to 1080×1920 with dark color.
  // y_offset = (1920-858)/2 ~ 531
  execSync(
    `ffmpeg -y -ss 3 -t 18 -i "${SRC}" ` +
    `-vf "crop=2360:1875:332:60,scale=1080:858,pad=${W}:${H}:0:531:0x0d1726,setsar=1,fps=${FPS}" ` +
    `-c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an "${outMp4}"`,
    { stdio: 'ignore' }
  );
}

// Concat list of mp4s into one (uses concat demuxer with re-encode-safe)
function concatClips(clips, outMp4) {
  const list = path.join(TMP, 'concat-list.txt');
  fs.writeFileSync(list, clips.map(c => `file '${c}'`).join('\n') + '\n');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${list}" ` +
    `-c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an "${outMp4}"`,
    { stdio: 'ignore' }
  );
}

// ===========================
// MAIN
// ===========================
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  // HTML files must be in same dir as referenced images for file:// to work
  const HTML_DIR = SCREENS;

  // ============================================
  // REEL A — "Combien tu perds?" (calculator)
  // ============================================
  console.log('\n=== REEL A ===');
  const a1 = await renderFrame(tplPhotoHook({
    line1: 'Si tu coaches',
    line2: '...',
    accentLine2: true,
  }), 'reel_a_01', ctx, HTML_DIR);

  const a3 = await renderFrame(tplPhoneScreen({
    tag: 'CEO Dashboard',
    headline: `Ton business<br/>en <span class="accent">live<span class="dot">.</span></span>`,
    imgFile: 'd-00-home.png',
  }), 'reel_a_03', ctx, HTML_DIR);

  const a4 = await renderFrame(tplBigText({
    line1: '0% commission<span class="dot">.</span>',
    line2: 'Jamais.',
    accentLine1: true, accentLine2: false,
  }), 'reel_a_04', ctx, HTML_DIR);

  const a5 = await renderFrame(tplCTA(), 'reel_a_05', ctx, HTML_DIR);

  const a1c = path.join(TMP, 'a1.mp4');
  const a2c = path.join(TMP, 'a2.mp4'); // calculator
  const a3c = path.join(TMP, 'a3.mp4');
  const a4c = path.join(TMP, 'a4.mp4');
  const a5c = path.join(TMP, 'a5.mp4');

  pngToClip(a1, 1.8, a1c);
  console.log('→ Converting calculator to 9:16...');
  calculatorTo9_16(a2c);
  pngToClip(a3, 3.5, a3c);
  pngToClip(a4, 2.5, a4c);
  pngToClip(a5, 3.5, a5c);

  console.log('→ Concat REEL A...');
  concatClips([a1c, a2c, a3c, a4c, a5c], path.join(OUT_DIR, 'reel-A-calculator.mp4'));
  console.log('✓ reel-A-calculator.mp4');

  // ============================================
  // REEL B — "3 outils des coachs" (comparison)
  // ============================================
  console.log('\n=== REEL B ===');
  const b1 = await renderFrame(tplBigText({
    line1: `T'es coach.`,
    line2: 'Voilà tes 3 options.',
    accentLine1: false, accentLine2: true,
  }), 'reel_b_01', ctx, HTML_DIR);

  const b2 = await renderFrame(tplCompareCard({
    rank: '01',
    name: 'Excel',
    points: [
      'Brouillon le dimanche soir.',
      'Aucun suivi auto.',
      '<b>0 vue business.</b>',
    ],
    isBad: true,
  }), 'reel_b_02', ctx, HTML_DIR);

  const b3 = await renderFrame(tplCompareCard({
    rank: '02',
    name: 'Trainerize',
    points: [
      'Builder de programmes.',
      '<b>+ 8% commission</b> sur chaque vente.',
      '800€/an perdus sur 10K€ de CA.',
    ],
    isBad: true,
  }), 'reel_b_03', ctx, HTML_DIR);

  const b4 = await renderFrame(tplCompareCard({
    rank: '03',
    name: 'RB Perform',
    points: [
      'Dashboard business + IA anti-churn.',
      '<b>0% commission. Jamais.</b>',
      `Pour les coachs qui veulent scaler.`,
    ],
    isBad: false,
  }), 'reel_b_04', ctx, HTML_DIR);

  const b5 = await renderFrame(tplCTA(), 'reel_b_05', ctx, HTML_DIR);

  const b1c = path.join(TMP, 'b1.mp4');
  const b2c = path.join(TMP, 'b2.mp4');
  const b3c = path.join(TMP, 'b3.mp4');
  const b4c = path.join(TMP, 'b4.mp4');
  const b5c = path.join(TMP, 'b5.mp4');

  pngToClip(b1, 2.5, b1c);
  pngToClip(b2, 4.5, b2c);
  pngToClip(b3, 5, b3c);
  pngToClip(b4, 5, b4c);
  pngToClip(b5, 3.5, b5c);

  console.log('→ Concat REEL B...');
  concatClips([b1c, b2c, b3c, b4c, b5c], path.join(OUT_DIR, 'reel-B-comparison.mp4'));
  console.log('✓ reel-B-comparison.mp4');

  // ============================================
  // REEL C — "J'étais coach" (founder story)
  // ============================================
  console.log('\n=== REEL C ===');
  const c1 = await renderFrame(tplFounderHook(), 'reel_c_01', ctx, HTML_DIR);

  const c2 = await renderFrame(tplBigText({
    line1: 'Je gérais 24 clients',
    line2: 'sur Excel<span class="dot">.</span>',
    accentLine1: false, accentLine2: true,
  }), 'reel_c_02', ctx, HTML_DIR);

  const c3 = await renderFrame(tplBigText({
    line1: 'Je perdais',
    line2: '12h par semaine<span class="dot">.</span>',
    accentLine1: false, accentLine2: true,
  }), 'reel_c_03', ctx, HTML_DIR);

  const c4 = await renderFrame(tplBigText({
    line1: `Donc j'ai construit`,
    line2: `l'outil que je rêvais d'avoir<span class="dot">.</span>`,
    accentLine1: false, accentLine2: true,
  }), 'reel_c_04', ctx, HTML_DIR);

  const c5 = await renderFrame(tplPhoneScreen({
    tag: 'RB Perform',
    headline: `Le tableau de bord<br/>des <span class="accent">coachs<span class="dot">.</span></span>`,
    imgFile: 'd-00-home.png',
  }), 'reel_c_05', ctx, HTML_DIR);

  const c6 = await renderFrame(tplCTA(), 'reel_c_06', ctx, HTML_DIR);

  const c1c = path.join(TMP, 'c1.mp4');
  const c2c = path.join(TMP, 'c2.mp4');
  const c3c = path.join(TMP, 'c3.mp4');
  const c4c = path.join(TMP, 'c4.mp4');
  const c5c = path.join(TMP, 'c5.mp4');
  const c6c = path.join(TMP, 'c6.mp4');

  pngToClip(c1, 2.5, c1c);
  pngToClip(c2, 3, c2c);
  pngToClip(c3, 3, c3c);
  pngToClip(c4, 3.5, c4c);
  pngToClip(c5, 4.5, c5c);
  pngToClip(c6, 3.5, c6c);

  console.log('→ Concat REEL C...');
  concatClips([c1c, c2c, c3c, c4c, c5c, c6c], path.join(OUT_DIR, 'reel-C-founder.mp4'));
  console.log('✓ reel-C-founder.mp4');

  await browser.close();

  // Cleanup TMP
  for (const f of fs.readdirSync(TMP)) {
    fs.unlinkSync(path.join(TMP, f));
  }

  console.log('\n🎬 All reels generated in:', OUT_DIR);
})();
