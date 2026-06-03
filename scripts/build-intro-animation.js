const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const OUT_DIR = '/Users/rayan/Downloads/carrousel-saas';
const SCREENS = '/Users/rayan/Downloads/coach-dashboard-captures';
const TMP_DIR = '/tmp/intro-frames';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// 1080×1350 portrait, 30 fps, 1.5s = 45 frames
const FRAMES = 45;
const FPS = 30;
const DURATION_MS = 1500;

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body {
  width:1080px; height:1350px;
  background:#0d1726;
  overflow:hidden;
  font-family:'Inter', -apple-system, sans-serif;
  position:relative;
}
.photo {
  position:absolute; inset:0;
  background-image:url('./rayan-gym-teal.png');
  background-size:cover;
  background-position:50% 30%;
  filter: contrast(1.05) brightness(0.50) saturate(1.0);
}
.photo::after {
  content:''; position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(13,23,38,0.40) 0%, rgba(13,23,38,0.60) 50%, rgba(13,23,38,0.85) 100%),
    radial-gradient(ellipse 800px 600px at 50% 50%, rgba(20,230,197,0.18) 0%, rgba(13,23,38,0) 70%);
}
.center {
  position:absolute;
  top:50%; left:50%;
  transform:translate(-50%, -50%);
  text-align:center;
  width:100%;
  z-index:2;
}
.text {
  font-size:180px;
  font-weight:900;
  color:#fff;
  letter-spacing:-0.04em;
  line-height:1;
  text-shadow: 0 4px 30px rgba(0,0,0,0.6);
}
.dots {
  color:#14e6c5;
}
</style></head><body>
  <div class="photo"></div>
  <div class="center">
    <div class="text">Si tu coaches<span class="dots">...</span></div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  // HTML must live alongside the image for relative ./ refs to load.
  const tmpHtml = path.join(SCREENS, '__intro.html');
  fs.writeFileSync(tmpHtml, HTML);
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // wait for fonts + image to load

  console.log('→ Capturing ' + FRAMES + ' frames over ' + DURATION_MS + 'ms...');
  for (let i = 0; i < FRAMES; i++) {
    const t = i / (FRAMES - 1); // 0 → 1 progression
    // Animation: fade-in 0→0.25, scale 0.85→1.0 over 0→0.5, then hold
    const fadeProgress = Math.min(t / 0.25, 1);
    const scaleProgress = Math.min(t / 0.5, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - scaleProgress, 3);
    const scale = 0.85 + 0.15 * ease;
    const opacity = fadeProgress;

    await page.evaluate(({ scale, opacity }) => {
      const el = document.querySelector('.text');
      el.style.transform = `scale(${scale})`;
      el.style.opacity = opacity;
    }, { scale, opacity });

    const filename = path.join(TMP_DIR, 'frame_' + String(i).padStart(3, '0') + '.png');
    await page.screenshot({ path: filename, clip: { x:0, y:0, width:1080, height:1350 } });
    if (i % 10 === 0) console.log('  frame ' + i + '/' + FRAMES);
  }

  await browser.close();
  try { fs.unlinkSync(tmpHtml); } catch(e) {}
  console.log('✓ All frames captured');

  // Use ffmpeg to assemble frames into a video
  const introMp4 = path.join(OUT_DIR, 'intro.mp4');
  console.log('\n→ Encoding intro.mp4...');
  execSync(
    `ffmpeg -y -framerate ${FPS} -i ${TMP_DIR}/frame_%03d.png ` +
    `-c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart ` +
    `${introMp4}`,
    { stdio: 'inherit' }
  );

  console.log('✓ intro.mp4 generated');

  // Concat intro + existing slide-1-video.mp4
  const finalSlide = path.join(OUT_DIR, 'slide-1-video-with-intro.mp4');
  console.log('\n→ Concatenating with calculator...');
  const concatList = path.join(TMP_DIR, 'concat.txt');
  fs.writeFileSync(concatList,
    `file '${path.join(OUT_DIR, 'intro.mp4')}'\n` +
    `file '${path.join(OUT_DIR, 'slide-1-video.mp4')}'\n`
  );

  // Use concat demuxer (requires same codec/resolution/fps — re-encode safe version)
  execSync(
    `ffmpeg -y -f concat -safe 0 -i ${concatList} ` +
    `-c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an ` +
    `${finalSlide}`,
    { stdio: 'inherit' }
  );

  console.log('\n✓ Final video: ' + finalSlide);

  // Cleanup frames
  for (const f of fs.readdirSync(TMP_DIR)) {
    fs.unlinkSync(path.join(TMP_DIR, f));
  }
})();
