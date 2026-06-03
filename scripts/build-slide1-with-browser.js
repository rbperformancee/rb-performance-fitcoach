const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const OUT_DIR = '/Users/rayan/Downloads/carrousel-saas';
const SCREENS = '/Users/rayan/Downloads/coach-dashboard-captures';
const TMP = '/tmp/slide1-build';
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const SRC_MOV = "/Users/rayan/Desktop/Enregistrement de l’écran 2026-05-15 à 11.58.20.mov";

const W = 1080, H = 1350, FPS = 30;

// ===========================
// 1. INTRO (photo bg + "Si tu coaches...") — 1.5s, 45 frames
// ===========================
const INTRO_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; background:#0d1726; overflow:hidden; font-family:'Inter', sans-serif; position:relative; }
.photo {
  position:absolute; inset:0;
  background-image:url('./rayan-gym-teal.png');
  background-size:cover; background-position:50% 30%;
  filter: contrast(1.05) brightness(0.50) saturate(1.0);
}
.photo::after {
  content:''; position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(13,23,38,0.40) 0%, rgba(13,23,38,0.60) 50%, rgba(13,23,38,0.85) 100%),
    radial-gradient(ellipse 800px 600px at 50% 50%, rgba(20,230,197,0.18) 0%, rgba(13,23,38,0) 70%);
}
.center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; width:100%; z-index:2; }
.text { font-size:180px; font-weight:900; color:#fff; letter-spacing:-0.04em; line-height:1; text-shadow:0 4px 30px rgba(0,0,0,0.6); }
.dots { color:#14e6c5; }
</style></head><body>
<div class="photo"></div>
<div class="center">
  <div class="text">Si tu coaches<span class="dots">...</span></div>
</div>
</body></html>`;

// ===========================
// 2. BROWSER BAR PNG (top overlay for calculator part)
// ===========================
const BAR_H = 70;
const BROWSER_BAR_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${BAR_H}px; overflow:hidden; font-family:'Inter', sans-serif; background:transparent; }
.bar {
  width:${W}px; height:${BAR_H}px;
  background:linear-gradient(180deg, #1f2a3d 0%, #182232 100%);
  border-bottom:1px solid rgba(255,255,255,0.06);
  display:flex; align-items:center; padding:0 24px;
  position:relative;
}
.traffic { display:flex; gap:10px; margin-right:24px; }
.traffic span { width:18px; height:18px; border-radius:50%; display:block; }
.traffic .r { background:#ff5f57; }
.traffic .y { background:#febc2e; }
.traffic .g { background:#28c840; }
.url {
  flex:1; max-width:480px; margin:0 auto;
  background:#0d1726; border:1px solid rgba(255,255,255,0.08);
  border-radius:12px; padding:11px 24px;
  font-size:20px; font-weight:600;
  color:rgba(255,255,255,0.78); text-align:center;
  letter-spacing:-0.01em;
}
.url .lock { color:#14e6c5; margin-right:10px; font-size:14px; vertical-align:1px; }
</style></head><body>
<div class="bar">
  <div class="traffic"><span class="r"></span><span class="y"></span><span class="g"></span></div>
  <div class="url"><span class="lock">●</span>rbperform.app</div>
</div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  // --- A. Generate intro frames (45 frames over 1.5s) ---
  console.log('→ Generating intro frames...');
  const introPage = await ctx.newPage();
  const introHtmlPath = path.join(SCREENS, '__intro_browser.html');
  fs.writeFileSync(introHtmlPath, INTRO_HTML);
  await introPage.goto('file://' + introHtmlPath, { waitUntil: 'networkidle' });
  await introPage.waitForTimeout(1500);

  const INTRO_FRAMES = 45;
  for (let i = 0; i < INTRO_FRAMES; i++) {
    const t = i / (INTRO_FRAMES - 1);
    const fadeProgress = Math.min(t / 0.25, 1);
    const scaleProgress = Math.min(t / 0.5, 1);
    const ease = 1 - Math.pow(1 - scaleProgress, 3);
    const scale = 0.85 + 0.15 * ease;
    const opacity = fadeProgress;
    await introPage.evaluate(({ scale, opacity }) => {
      const el = document.querySelector('.text');
      el.style.transform = `scale(${scale})`;
      el.style.opacity = opacity;
    }, { scale, opacity });
    await introPage.screenshot({ path: path.join(TMP, 'intro_' + String(i).padStart(3,'0') + '.png'), clip: { x:0, y:0, width:W, height:H } });
  }
  try { fs.unlinkSync(introHtmlPath); } catch(e) {}
  await introPage.close();
  console.log('✓ Intro frames done');

  // --- B. Generate browser bar PNG (with transparent body via screenshot omitClip) ---
  // Browser bar: 1080x70 with the bar visible. We render against alpha 0 by using the html body as transparent.
  const barPage = await ctx.newPage();
  const barHtmlPath = path.join(SCREENS, '__bar.html');
  fs.writeFileSync(barHtmlPath, BROWSER_BAR_HTML);
  await barPage.goto('file://' + barHtmlPath, { waitUntil: 'networkidle' });
  await barPage.waitForTimeout(800);
  // Note: omitBackground gives transparent body but our .bar has its own bg so it's visible.
  await barPage.screenshot({
    path: path.join(TMP, 'browser-bar.png'),
    clip: { x:0, y:0, width:W, height:BAR_H },
    omitBackground: true,
    type: 'png',
  });
  try { fs.unlinkSync(barHtmlPath); } catch(e) {}
  await barPage.close();
  console.log('✓ Browser bar PNG generated');

  await browser.close();

  // --- C. Build intro.mp4 from intro frames ---
  console.log('→ Encoding intro.mp4...');
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${TMP}/intro_%03d.png ` +
    `-c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart ` +
    `${TMP}/intro.mp4`,
    { stdio: 'ignore' }
  );

  // --- D. Build calculator part with browser bar overlay ---
  // Source: Desktop .mov (3-21s window). Crop, scale, pad to 1080×1350.
  // Then overlay browser bar at top.
  console.log('→ Building calculator with browser bar overlay...');
  execSync(
    `ffmpeg -y -ss 3 -t 18 -i "${SRC_MOV}" -i ${TMP}/browser-bar.png ` +
    `-filter_complex "` +
      `[0:v]crop=2360:1875:332:60,scale=1080:858,pad=${W}:${H}:0:246:0x0d1726,setsar=1,fps=${FPS}[bg];` +
      `[bg][1:v]overlay=0:0[v]` +
    `" -map "[v]" ` +
    `-c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an ` +
    `${TMP}/calculator.mp4`,
    { stdio: 'ignore' }
  );

  // --- E. Concat intro + calculator ---
  console.log('→ Concatenating final...');
  const concatList = path.join(TMP, 'concat.txt');
  fs.writeFileSync(concatList, `file '${TMP}/intro.mp4'\nfile '${TMP}/calculator.mp4'\n`);

  const finalPath = path.join(OUT_DIR, 'slide-1-video-final.mp4');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i ${concatList} ` +
    `-c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an ` +
    `${finalPath}`,
    { stdio: 'ignore' }
  );

  // Cleanup
  for (const f of fs.readdirSync(TMP)) {
    fs.unlinkSync(path.join(TMP, f));
  }

  console.log('\n✓ Final video: ' + finalPath);
})();
