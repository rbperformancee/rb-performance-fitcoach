/**
 * OG Image dédiée /diagnostic (1200×630).
 *
 * Différenciation vs og-image.png (général RB Perform) :
 *   - Promesse directe : "Diagnostic Coach · Audit gratuit 2 min"
 *   - Visuel "score" pour appeler le clic (gros nombre + mini bar chart 5 piliers)
 *   - Brand cohérent (DM Sans, accent #02d1ba, fond #050505)
 *
 * Sortie : /public/og-diagnostic.png
 * Utilisé par : public/diagnostic.html (og:image), public/blog/diagnostic-business-coach-sportif.html
 *
 * Run : node scripts/build-og-diagnostic.js
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT_PATH = path.resolve(__dirname, "../public/og-diagnostic.png");
const W = 1200, H = 630;
const G = "#02d1ba";

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Bebas+Neue&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    font-family: 'DM Sans', -apple-system, sans-serif;
    background: #050505; color: #fff; position: relative;
  }
  .top-bar    { position: absolute; top: 0;    left: 0; right: 0; height: 4px; background: ${G}; z-index: 10; }
  .bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: ${G}; z-index: 10; }

  /* Ambient glow teal */
  .glow-top  { position: absolute; top: -180px; left: 25%; width: 500px; height: 500px;
               background: radial-gradient(circle, rgba(2,209,186,0.22), transparent 65%);
               pointer-events: none; }
  .glow-br   { position: absolute; bottom: -150px; right: -100px; width: 500px; height: 500px;
               background: radial-gradient(circle, rgba(2,209,186,0.10), transparent 70%);
               pointer-events: none; }

  /* Layout : promesse à gauche, score-mockup à droite */
  .wrap {
    position: relative; z-index: 5;
    display: flex; align-items: center; justify-content: space-between;
    height: 100%; padding: 60px 70px;
    gap: 60px;
  }

  /* COLONNE GAUCHE */
  .left { flex: 1.1; max-width: 540px; }
  .logo { font-size: 18px; font-weight: 900; letter-spacing: 0.16em; color: #fff; margin-bottom: 38px; }
  .logo span { color: ${G}; }
  .eyebrow { font-size: 13px; font-weight: 800; letter-spacing: 0.28em; text-transform: uppercase; color: ${G}; margin-bottom: 22px; }
  .eyebrow::before { content: "●"; margin-right: 10px; }
  h1 {
    font-size: 60px; font-weight: 900; letter-spacing: -0.035em; line-height: 1.02;
    color: #fff; margin-bottom: 22px;
  }
  h1 .accent { color: ${G}; }
  .sub {
    font-size: 19px; color: rgba(255,255,255,0.7); line-height: 1.5;
    max-width: 460px; margin-bottom: 32px;
  }
  .sub strong { color: #fff; font-weight: 600; }
  .meta-row { display: flex; gap: 14px; align-items: center; }
  .chip {
    padding: 9px 16px; background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 100px;
    font-size: 13px; font-weight: 700; letter-spacing: 0.04em;
    color: rgba(255,255,255,0.85);
  }
  .chip-accent {
    background: rgba(2,209,186,0.1); border-color: rgba(2,209,186,0.35); color: ${G};
  }

  /* COLONNE DROITE : mockup score */
  .right {
    flex: 0.9; max-width: 420px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px; padding: 32px;
    box-shadow: 0 0 80px rgba(2,209,186,0.08);
  }
  .mock-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; color: ${G}; margin-bottom: 12px; }
  .score-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 116px; color: ${G}; line-height: 0.9; letter-spacing: -0.03em;
    text-shadow: 0 0 50px rgba(2,209,186,0.4);
  }
  .score-num .max { font-family: 'DM Sans', sans-serif; font-size: 26px; color: rgba(255,255,255,0.35); font-weight: 600; margin-left: 6px; letter-spacing: 0; }
  .score-band {
    font-size: 15px; font-weight: 700; color: #fff;
    margin-top: 8px; margin-bottom: 22px;
  }

  /* Mini pillar bars */
  .pillars-mock { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
  .prow { display: flex; align-items: center; gap: 10px; }
  .plabel { font-size: 11px; color: rgba(255,255,255,0.6); width: 100px; flex-shrink: 0; }
  .pbar { flex: 1; height: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
  .pfill { height: 100%; border-radius: 3px; }
</style></head>
<body>
  <div class="top-bar"></div>
  <div class="bottom-bar"></div>
  <div class="glow-top"></div>
  <div class="glow-br"></div>

  <div class="wrap">

    <div class="left">
      <div class="logo">RB<span>PERFORM</span></div>
      <div class="eyebrow">Diagnostic Coach Indé</div>
      <h1>Ton business<br>tient combien<br>de mois<span class="accent">?</span></h1>
      <div class="sub">
        10 questions, 2 minutes.
        <strong>Ton score sur 100, ton pilier le plus faible, et le plan pour le réparer.</strong>
      </div>
      <div class="meta-row">
        <div class="chip chip-accent">100% gratuit</div>
        <div class="chip">Aucun compte</div>
        <div class="chip">2 min</div>
      </div>
    </div>

    <div class="right">
      <div class="mock-eyebrow">● Aperçu du rapport</div>
      <div class="score-num">47<span class="max">/100</span></div>
      <div class="score-band">Ça tient, mais ça fuit.</div>
      <div class="pillars-mock">
        <div class="prow"><div class="plabel">Prévisibilité</div><div class="pbar"><div class="pfill" style="width:25%;background:#ff6b6b"></div></div></div>
        <div class="prow"><div class="plabel">Rétention</div><div class="pbar"><div class="pfill" style="width:50%;background:#f5b400"></div></div></div>
        <div class="prow"><div class="plabel">Robustesse</div><div class="pbar"><div class="pfill" style="width:75%;background:${G}"></div></div></div>
        <div class="prow"><div class="plabel">Cash</div><div class="pbar"><div class="pfill" style="width:25%;background:#ff6b6b"></div></div></div>
        <div class="prow"><div class="plabel">Pilotage</div><div class="pbar"><div class="pfill" style="width:60%;background:#f5b400"></div></div></div>
      </div>
    </div>

  </div>
</body></html>`;

(async () => {
  console.log("→ Lancement Chromium…");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2, // retina pour image nette
  });
  const page = await ctx.newPage();
  await page.setContent(HTML, { waitUntil: "networkidle" });
  // attend que les fonts soient prêtes
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  console.log("→ Capture…");
  await page.screenshot({ path: OUT_PATH, omitBackground: false });
  await browser.close();
  const stat = fs.statSync(OUT_PATH);
  console.log(`✅ Écrit : ${OUT_PATH} (${(stat.size / 1024).toFixed(1)} KB)`);
})();
