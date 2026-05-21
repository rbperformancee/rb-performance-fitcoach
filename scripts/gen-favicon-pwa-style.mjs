// Génère les favicons style "nav-logo PWA" : RB blanc + PERFORM turquoise sur fond noir
// Sortie : icon-512.png, icon-192.png, favicon-32.png, favicon-16.png, apple-touch-icon.png
// + icon-maskable-* avec padding safe (PWA Android)
// Affiche aussi un preview comparatif (16/32/192 px) côte à côte.

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

// HTML tile : fond noir, RB massif blanc, PERFORM petit turquoise en dessous (style nav-logo)
// Le tile maskable a un padding intérieur de ~10% (safe zone Android)
const tileHTML = ({ size = 512, maskable = false }) => {
  const pad = maskable ? Math.round(size * 0.10) : 0;
  const inner = size - pad * 2;
  // À petite taille (<48px), on enlève "PERFORM" qui devient illisible — on garde
  // un point turquoise discret comme signature visuelle de la marque
  const compact = size < 64;
  return `<!DOCTYPE html>
<html><head><style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{width:${size}px;height:${size}px;overflow:hidden;background:transparent}
.outer{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center}
.tile{
  width:${inner}px;height:${inner}px;
  background:#0a0a0a;
  ${maskable ? '' : `border-radius:${Math.round(size * 0.22)}px;`}
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:'Inter','Helvetica Neue',Arial,sans-serif;
  ${maskable ? `border-radius:50%;` : ''}
}
.rb{
  font-size:${Math.round(inner * (compact ? 0.62 : 0.52))}px;
  font-weight:900;
  color:#fff;
  letter-spacing:${compact ? '-2px' : '-6px'};
  line-height:1;
  font-style:normal;
}
.perform{
  font-size:${Math.round(inner * 0.13)}px;
  font-weight:900;
  color:#02d1ba;
  letter-spacing:${Math.round(inner * 0.013)}px;
  text-transform:uppercase;
  margin-top:${Math.round(inner * 0.04)}px;
  line-height:1;
}
.dot{
  width:${Math.round(inner * 0.10)}px;
  height:${Math.round(inner * 0.10)}px;
  background:#02d1ba;
  border-radius:50%;
  margin-top:${Math.round(inner * 0.06)}px;
}
</style></head>
<body>
<div class="outer">
  <div class="tile">
    <span class="rb">RB</span>
    ${compact
      ? `<span class="dot"></span>`
      : `<span class="perform">PERFORM</span>`
    }
  </div>
</div>
</body></html>`;
};

const browser = await chromium.launch();

async function renderIcon(size, outPath, maskable = false) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1
  });
  await page.setContent(tileHTML({ size, maskable }));
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: outPath,
    type: 'png',
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size }
  });
  await page.close();
  console.log('✓', outPath);
}

const PUBLIC = '/Users/rayan/fitcoach_updated/public';

await renderIcon(512, `${PUBLIC}/icon-512.png`);
await renderIcon(192, `${PUBLIC}/icon-192.png`);
await renderIcon(180, `${PUBLIC}/apple-touch-icon.png`);
await renderIcon(32,  `${PUBLIC}/favicon-32.png`);
await renderIcon(16,  `${PUBLIC}/favicon-16.png`);
await renderIcon(512, `${PUBLIC}/icon-maskable-512.png`, true);
await renderIcon(192, `${PUBLIC}/icon-maskable-192.png`, true);

// Generate a preview that shows all sizes side-by-side for verification
const previewHTML = `<!DOCTYPE html>
<html><head><style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{background:#f4f4f4;font-family:-apple-system,'Inter',sans-serif;padding:32px;text-align:center}
h1{font-size:18px;margin-bottom:24px;color:#1a1a1a}
.row{display:flex;gap:36px;justify-content:center;align-items:flex-end;flex-wrap:wrap;margin-bottom:32px}
.col{display:flex;flex-direction:column;align-items:center;gap:10px}
.label{font-size:11px;color:#666;font-weight:600;letter-spacing:0.04em}
img{display:block;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);border-radius:8px}
.serp{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#fff;border-radius:100px;box-shadow:0 2px 8px rgba(0,0,0,.08);font-size:13px;color:#1a1a1a;margin:0 auto;width:fit-content}
.serp img{box-shadow:none;border-radius:50%;width:24px;height:24px}
</style></head>
<body>
<h1>Nouveaux favicons RB Perform — preview multi-taille</h1>
<div class="row">
  <div class="col"><img src="file://${PUBLIC}/favicon-16.png" width="16" height="16"><div class="label">16×16</div></div>
  <div class="col"><img src="file://${PUBLIC}/favicon-32.png" width="32" height="32"><div class="label">32×32</div></div>
  <div class="col"><img src="file://${PUBLIC}/apple-touch-icon.png" width="64" height="64"><div class="label">apple-touch (180→64)</div></div>
  <div class="col"><img src="file://${PUBLIC}/icon-192.png" width="96" height="96"><div class="label">icon-192 (à 96)</div></div>
  <div class="col"><img src="file://${PUBLIC}/icon-512.png" width="160" height="160"><div class="label">icon-512 (à 160)</div></div>
</div>
<h1 style="margin-top:24px">Aperçu SERP Google (taille réelle 24px)</h1>
<div class="serp">
  <img src="file://${PUBLIC}/favicon-32.png">
  <span><strong>rbperform.app</strong> · RB Perform — La performance sans compromis</span>
</div>
</body></html>`;
await writeFile('/tmp/favicon-preview.html', previewHTML);
const p = await browser.newPage({ viewport: { width: 1100, height: 480 } });
await p.goto('file:///tmp/favicon-preview.html');
await p.waitForLoadState('networkidle');
await p.screenshot({ path: '/tmp/favicon-pwa-preview.png', fullPage: true });

await browser.close();
console.log('OK preview: /tmp/favicon-pwa-preview.png');
