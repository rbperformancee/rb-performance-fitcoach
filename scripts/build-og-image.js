/**
 * OG Image RB Perform — 1200×630 standard Open Graph.
 *
 * V2 Hormozi-style : photo Rayan à gauche + promesse forte à droite.
 *
 * Pourquoi cette compo :
 *   - Tu vends à des coachs qui te confient leur revenu mensuel → ils doivent
 *     voir un humain, pas un logo abstrait
 *   - Différenciation immédiate vs Trainerize/Trueform (SaaS anonymes)
 *   - Conventions : Hormozi (acquisition.com), Iman Gadzhi, Andrew Tate
 *     mettent leur visage parce que ça convertit chez l'audience coach/business
 *
 * Affichée quand on partage rbperform.app sur iMessage, WhatsApp, LinkedIn,
 * Twitter, Facebook, Slack, etc.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_PATH = path.resolve(__dirname, '../public/og-image.png');
const PHOTO_PATH = path.resolve(__dirname, '../public/images/rayan-hero.png');
const W = 1200, H = 630;
const G = '#02d1ba';

// On encode la photo en base64 pour pouvoir l'embed dans le HTML
// (sinon Playwright a besoin d'un serveur file://)
const photoB64 = fs.readFileSync(PHOTO_PATH).toString('base64');
const photoSrc = `data:image/png;base64,${photoB64}`;

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    font-family: 'DM Sans', 'Inter', -apple-system, sans-serif;
    background: #050505; color: #fff; position: relative;
  }
  /* Filet teal en haut + bas (signature visuelle) */
  .top-bar    { position: absolute; top: 0;    left: 0; right: 0; height: 4px; background: ${G}; z-index: 10; }
  .bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: ${G}; z-index: 10; }

  /* Ambient glow teal (signature) */
  .ambient-1 {
    position: absolute; top: -200px; right: 30%;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(2,209,186,0.18), transparent 70%);
    pointer-events: none;
  }
  .ambient-2 {
    position: absolute; bottom: -150px; right: -100px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(2,209,186,0.08), transparent 70%);
    pointer-events: none;
  }

  /* PHOTO GAUCHE — bleed full height pour impact maximal */
  .photo-wrap {
    position: absolute; top: 0; left: 0;
    width: 540px; height: ${H}px;
    overflow: hidden;
  }
  .photo {
    position: absolute; top: 0; left: -60px;
    width: 750px; height: ${H}px;
    object-fit: cover; object-position: center top;
  }
  /* Dégradé subtil sur la droite de la photo pour transition douce vers le texte */
  .photo-fade {
    position: absolute; top: 0; right: 0; width: 200px; height: 100%;
    background: linear-gradient(to right, transparent, #050505);
    z-index: 2;
  }

  /* COLONNE TEXTE — droite */
  .text-col {
    position: absolute; top: 0; right: 0; bottom: 0;
    width: 660px; padding: 60px 60px 60px 30px;
    display: flex; flex-direction: column;
    justify-content: center;
    z-index: 3;
  }

  /* Eyebrow */
  .eyebrow {
    display: inline-flex; align-items: center; gap: 12px;
    font-size: 14px; font-weight: 800;
    letter-spacing: 0.3em; text-transform: uppercase;
    color: ${G};
    margin-bottom: 24px;
  }
  .eyebrow .dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: ${G};
    box-shadow: 0 0 10px ${G};
  }

  /* Titre — promesse forte (Hormozi style) */
  .hero {
    font-size: 64px; font-weight: 900;
    letter-spacing: -0.035em; line-height: 0.98;
    color: #fff;
    margin-bottom: 22px;
  }
  .hero .dot { color: ${G}; }

  /* Sub — explication courte */
  .sub {
    font-size: 21px; font-weight: 500;
    color: rgba(255,255,255,0.62);
    line-height: 1.4;
    letter-spacing: -0.01em;
    margin-bottom: 30px;
  }
  .sub strong { color: #fff; font-weight: 700; }

  /* Scarcity row */
  .scarcity {
    display: inline-flex; align-items: center; gap: 14px;
    padding: 12px 18px;
    background: rgba(2,209,186,0.08);
    border: 1px solid rgba(2,209,186,0.35);
    border-radius: 100px;
    width: fit-content;
    margin-bottom: 24px;
  }
  .scarcity-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: ${G};
    box-shadow: 0 0 10px ${G};
  }
  .scarcity-text {
    font-size: 14px; font-weight: 800;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #fff;
  }
  .scarcity-text .accent { color: ${G}; }

  /* Footer domain */
  .domain {
    font-size: 18px; font-weight: 700;
    color: ${G};
    letter-spacing: 0.04em;
  }
</style></head>
<body>
  <div class="ambient-1"></div>
  <div class="ambient-2"></div>
  <div class="top-bar"></div>
  <div class="bottom-bar"></div>

  <div class="photo-wrap">
    <img src="${photoSrc}" alt="" class="photo" />
    <div class="photo-fade"></div>
  </div>

  <div class="text-col">
    <div class="eyebrow">
      <span class="dot"></span>
      <span>RB · Perform</span>
    </div>

    <div class="hero">
      L'app que<br/>
      les coachs<br/>
      attendaient<span class="dot">.</span>
    </div>

    <div class="sub">
      Tu coaches. <strong>RB Perform pilote ton business.</strong><br/>
      MRR, churn, paiements, programmes. 0% commission.
    </div>

    <div class="scarcity">
      <span class="scarcity-dot"></span>
      <span class="scarcity-text"><span class="accent">199€/mois</span> bloqué à vie · 30 places</span>
    </div>

    <div class="domain">rbperform.app</div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(HTML, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT_PATH, type: 'png', omitBackground: false });
  await browser.close();
  console.log('✅ OG image V2 (Hormozi-style avec photo) :', OUT_PATH);
  const stat = fs.statSync(OUT_PATH);
  console.log(`   Taille : ${(stat.size / 1024).toFixed(1)} KB`);
})();
