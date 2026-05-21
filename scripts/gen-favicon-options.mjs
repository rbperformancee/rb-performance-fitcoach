// Génère 3 propositions de favicon SERP côte à côte (512x512 chacun + un mosaïque preview)
// pour que Rayan choisisse.

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;padding:32px}
.row{display:flex;gap:24px;justify-content:center;align-items:flex-start;flex-wrap:wrap}
.card{display:flex;flex-direction:column;align-items:center;gap:12px}
.tile{width:280px;height:280px;border-radius:64px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.label{font-size:14px;font-weight:700;color:#1a1a1a;letter-spacing:-.01em}
.serp{display:flex;align-items:center;gap:10px;padding:8px 14px;background:#fff;border-radius:100px;box-shadow:0 2px 8px rgba(0,0,0,.08);font-size:13px;color:#1a1a1a}
.serp-fav{width:24px;height:24px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center}
.serp-name{font-weight:500}

/* Option A — "RB" turquoise sur fond noir */
.opt-a{background:#0a0a0a}
.opt-a-text{font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;font-size:170px;font-weight:900;color:#02d1ba;letter-spacing:-12px;line-height:1;font-style:italic}

/* Option B — "RB" blanc sur fond turquoise (marque dominante) */
.opt-b{background:#02d1ba}
.opt-b-text{font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;font-size:170px;font-weight:900;color:#0a0a0a;letter-spacing:-12px;line-height:1;font-style:italic}

/* Option C — Éclair turquoise simple, plus gros et centré */
.opt-c{background:#0a0a0a;display:flex;align-items:center;justify-content:center}
.opt-c svg{width:65%;height:65%}

/* Mini SERP previews */
.serp-fav-a{background:#0a0a0a}
.serp-fav-a-text{font-family:'Arial Black',sans-serif;font-size:16px;font-weight:900;color:#02d1ba;letter-spacing:-1px;font-style:italic;line-height:1}
.serp-fav-b{background:#02d1ba}
.serp-fav-b-text{font-family:'Arial Black',sans-serif;font-size:16px;font-weight:900;color:#0a0a0a;letter-spacing:-1px;font-style:italic;line-height:1}
.serp-fav-c{background:#0a0a0a;display:flex;align-items:center;justify-content:center}
.serp-fav-c svg{width:70%;height:70%}

.opt-num{display:inline-block;padding:4px 12px;background:#02d1ba;color:#000;border-radius:100px;font-size:12px;font-weight:800;letter-spacing:.05em;margin-bottom:4px}
.actual{background:#0a0a0a;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px}
.actual-bolt{color:#02d1ba;font-size:140px;line-height:.85}
.actual-rb{position:absolute;color:#fff;font-family:'Arial Black',sans-serif;font-size:54px;font-weight:900;font-style:italic;letter-spacing:-3px;text-shadow:0 0 6px rgba(0,0,0,.4)}
.actual-perform{position:absolute;bottom:32px;color:#fff;font-family:'Arial Black',sans-serif;font-size:32px;font-weight:900;letter-spacing:2px}
</style></head>
<body>

<div style="text-align:center;margin-bottom:24px">
  <div style="font-size:22px;font-weight:800;color:#1a1a1a;margin-bottom:6px">Favicons proposés pour la SERP Google</div>
  <div style="font-size:13px;color:#666">3 options à choisir + actuel pour comparaison</div>
</div>

<div class="row">

  <div class="card">
    <span class="opt-num">ACTUEL</span>
    <div class="tile actual">
      <span class="actual-bolt">⚡</span>
      <span class="actual-rb">RB</span>
      <span class="actual-perform">PERFORM</span>
    </div>
    <div class="serp">
      <div class="serp-fav actual" style="width:24px;height:24px;border-radius:50%">
        <span style="color:#02d1ba;font-size:18px">⚡</span>
      </div>
      <span class="serp-name">rbperform.app</span>
    </div>
    <div class="label" style="color:#999">illisible en SERP</div>
  </div>

  <div class="card">
    <span class="opt-num">OPTION 1</span>
    <div class="tile opt-a">
      <span class="opt-a-text">RB</span>
    </div>
    <div class="serp">
      <div class="serp-fav serp-fav-a">
        <span class="serp-fav-a-text">RB</span>
      </div>
      <span class="serp-name">rbperform.app</span>
    </div>
    <div class="label">RB turquoise · fond noir</div>
  </div>

  <div class="card">
    <span class="opt-num">OPTION 2</span>
    <div class="tile opt-b">
      <span class="opt-b-text">RB</span>
    </div>
    <div class="serp">
      <div class="serp-fav serp-fav-b">
        <span class="serp-fav-b-text">RB</span>
      </div>
      <span class="serp-name">rbperform.app</span>
    </div>
    <div class="label">RB noir · fond turquoise</div>
  </div>

  <div class="card">
    <span class="opt-num">OPTION 3</span>
    <div class="tile opt-c">
      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill="#02d1ba"/>
      </svg>
    </div>
    <div class="serp">
      <div class="serp-fav serp-fav-c">
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill="#02d1ba"/>
        </svg>
      </div>
      <span class="serp-name">rbperform.app</span>
    </div>
    <div class="label">Éclair seul · sans texte</div>
  </div>

</div>

</body></html>`;

await writeFile('/tmp/favicon-options.html', html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 700 } });
await page.goto('file:///tmp/favicon-options.html');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/favicon-options.png', fullPage: true });
await browser.close();
console.log('OK /tmp/favicon-options.png');
