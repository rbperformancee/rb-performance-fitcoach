/**
 * OG Image RB Perform — 1200×630 standard Open Graph.
 *
 * Aligné brand teal #02d1ba (vs l'ancien orange).
 * Positioning B2B SaaS pour coachs (pas B2C coaching) → évite les mots
 * "coaching premium" / "individualisé" qui posent problème NAF avant
 * juin 2026 (CQP ALS).
 *
 * Affiché quand on partage rbperform.app sur iMessage, WhatsApp, LinkedIn,
 * Twitter, Facebook, Slack, etc.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_PATH = path.resolve(__dirname, '../public/og-image.png');
const W = 1200, H = 630;
const G = '#02d1ba';

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    font-family: 'DM Sans', 'Inter', -apple-system, sans-serif;
    background: #050505; color: #fff; position: relative;
  }
  /* Filet teal en haut */
  .top-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: ${G};
  }
  /* Filet teal en bas */
  .bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
    background: ${G};
  }
  /* Ambient glow teal en haut-droit (signature visuelle) */
  .ambient {
    position: absolute; top: -200px; right: -200px;
    width: 700px; height: 700px;
    background: radial-gradient(circle, rgba(2,209,186,0.12), transparent 70%);
    pointer-events: none;
  }
  .ambient-2 {
    position: absolute; bottom: -150px; left: -150px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(2,209,186,0.06), transparent 70%);
    pointer-events: none;
  }

  /* Container */
  .wrap {
    position: absolute; inset: 0;
    padding: 70px 80px;
    display: flex; flex-direction: column;
    justify-content: space-between;
  }

  /* Eyebrow brand */
  .eyebrow {
    display: inline-flex; align-items: center; gap: 14px;
    font-size: 17px; font-weight: 800;
    letter-spacing: 0.32em; text-transform: uppercase;
    color: ${G};
  }
  .eyebrow .dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: ${G};
    box-shadow: 0 0 14px ${G};
  }

  /* Main title */
  .hero {
    font-size: 86px; font-weight: 900;
    letter-spacing: -0.04em; line-height: 0.98;
    color: #fff;
    max-width: 900px;
  }
  .hero .dot {
    color: ${G};
  }

  /* Subtitle */
  .sub {
    font-size: 26px; font-weight: 500;
    color: rgba(255,255,255,0.55);
    margin-top: 26px;
    letter-spacing: -0.01em;
    line-height: 1.35;
    max-width: 840px;
  }

  /* Footer 3 piliers */
  .pillars {
    display: flex; gap: 36px; align-items: center;
    font-size: 14px; font-weight: 700;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: rgba(255,255,255,0.45);
  }
  .pillars .sep {
    width: 4px; height: 4px; border-radius: 50%;
    background: ${G};
    opacity: 0.7;
  }
  .domain {
    font-size: 18px; font-weight: 700;
    color: ${G};
    letter-spacing: 0.05em;
  }
</style></head>
<body>
  <div class="ambient"></div>
  <div class="ambient-2"></div>
  <div class="top-bar"></div>
  <div class="bottom-bar"></div>

  <div class="wrap">
    <div class="eyebrow">
      <span class="dot"></span>
      <span>RB · Perform</span>
    </div>

    <div>
      <div class="hero">
        L'app que les coachs<br/>attendaient<span class="dot">.</span>
      </div>
      <div class="sub">
        Pilote ton business sportif : clients, programmes, paiements, alertes
        churn. Tu coaches, RB Perform pilote.
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
      <div class="pillars">
        <span>MRR temps réel</span>
        <span class="sep"></span>
        <span>Alertes churn</span>
        <span class="sep"></span>
        <span>0% commission</span>
      </div>
      <div class="domain">rbperform.app</div>
    </div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(HTML, { waitUntil: 'networkidle' });
  // Petit délai supplémentaire pour assurer le rendu des fonts Google
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT_PATH, type: 'png', omitBackground: false });
  await browser.close();
  console.log('✅ OG image générée :', OUT_PATH);
  const stat = fs.statSync(OUT_PATH);
  console.log(`   Taille : ${(stat.size / 1024).toFixed(1)} KB`);
})();
