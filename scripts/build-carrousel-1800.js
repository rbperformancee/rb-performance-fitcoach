// Carrousel "1 800€" — style 37900€ avec nouvelle photo Rayan en fond.
// 5 slides 1080×1350.
// Lance via: cd /Users/rayan/fitcoach_updated && node /tmp/build-carrousel-1800.js

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PHOTO = '/Users/rayan/Library/CloudStorage/OneDrive-Personnel/IMG_6892 2.PNG';
const OUT_DIR = '/tmp/carrousel-1800';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1080, H = 1350;
const TOTAL_SLIDES = 5;

// Copie la photo dans /tmp avec un nom sans espace pour fiabiliser file://
const PHOTO_SAFE = '/tmp/rayan-gym-hoodie.png';
if (fs.existsSync(PHOTO)) {
  fs.copyFileSync(PHOTO, PHOTO_SAFE);
  console.log('Photo copiée vers ' + PHOTO_SAFE);
} else {
  console.error('Photo introuvable: ' + PHOTO);
  process.exit(1);
}

const COMMON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; font-family:'Inter', -apple-system, sans-serif; background:#0d1726; color:#fff; position:relative; }

  /* Photo fond + overlay sombre + gradient teal */
  .photo {
    position:absolute; inset:0;
    background-image:url('file://${PHOTO_SAFE}');
    background-size:cover; background-position:60% 30%;
    filter: contrast(1.05) brightness(0.42) saturate(1.0);
  }
  .photo::after {
    content:''; position:absolute; inset:0;
    background:
      linear-gradient(180deg, rgba(13,23,38,0.45) 0%, rgba(13,23,38,0.55) 50%, rgba(13,23,38,0.85) 100%),
      radial-gradient(ellipse 900px 700px at 30% 50%, rgba(20,230,197,0.10) 0%, rgba(13,23,38,0) 70%);
  }

  /* Brand top-left */
  .brand-top {
    position:absolute; top:48px; left:60px;
    font-size:26px; font-weight:800; letter-spacing:0.04em;
    color:rgba(255,255,255,0.95);
    z-index:5;
  }
  .brand-top .dot { color:#14e6c5; font-weight:900; }

  /* Pagination top-right */
  .page-num {
    position:absolute; top:48px; right:60px;
    font-size:22px; font-weight:700; letter-spacing:0.18em;
    color:rgba(255,255,255,0.5);
    z-index:5;
  }

  /* Tag teal */
  .tag {
    display:inline-flex; align-items:center; gap:12px;
    font-size:22px; font-weight:800; letter-spacing:0.20em;
    color:#14e6c5;
    text-transform:uppercase;
    margin-bottom:30px;
  }
  .tag::before {
    content:'•'; color:#14e6c5; font-size:34px; line-height:0;
  }

  /* Content wrap, padding 60px */
  .content {
    position:absolute; left:60px; right:60px; bottom:120px;
    z-index:4;
  }

  /* Big number (teal) */
  .big {
    font-size:200px; font-weight:900; color:#14e6c5;
    line-height:0.95; letter-spacing:-0.04em;
    margin-bottom:30px;
  }

  .headline {
    font-size:64px; font-weight:800; color:#fff;
    line-height:1.05; letter-spacing:-0.02em;
    margin-bottom:18px;
  }
  .headline.smaller { font-size:54px; }

  .sub {
    font-size:28px; font-weight:500;
    color:rgba(255,255,255,0.78);
    line-height:1.35;
    max-width:920px;
  }

  /* Lists for slide 2 */
  .pain-list {
    font-size:42px; font-weight:700; color:#fff;
    line-height:1.35; letter-spacing:-0.01em;
  }
  .pain-list .accent { color:#14e6c5; font-weight:900; }
  .pain-list div { margin-bottom:18px; display:flex; gap:24px; align-items:baseline; }
  .pain-list .bullet { color:#14e6c5; font-size:48px; line-height:0.8; }

  /* Slide 3 hero quote style */
  .quote {
    font-size:84px; font-weight:900; color:#fff;
    line-height:1.05; letter-spacing:-0.03em;
    margin-bottom:24px;
  }
  .quote .accent { color:#14e6c5; }

  /* CTA slide */
  .cta-eyebrow {
    font-size:24px; font-weight:700; letter-spacing:0.18em;
    color:#14e6c5; text-transform:uppercase;
    margin-bottom:24px;
  }
  .cta-headline {
    font-size:80px; font-weight:900; color:#fff;
    line-height:1.0; letter-spacing:-0.03em;
    margin-bottom:30px;
  }
  .cta-headline .accent { color:#14e6c5; }
  .cta-benefit {
    font-size:30px; font-weight:600; color:rgba(255,255,255,0.85);
    line-height:1.4; margin-bottom:8px;
  }
  .cta-link {
    margin-top:34px;
    font-size:24px; font-weight:700; letter-spacing:0.02em;
    color:#fff;
  }
  .cta-link .arrow { color:#14e6c5; font-weight:900; margin-right:8px; }
`;

function brand(i) {
  return `<div class="brand-top">RB<span class="dot">.</span>PERFORM</div>
          <div class="page-num">0${i} / 0${TOTAL_SLIDES}</div>`;
}

function slideHTML(i, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}</style></head>
  <body>
    <div class="photo"></div>
    ${brand(i)}
    <div class="content">${inner}</div>
  </body></html>`;
}

const slides = [
  // ──────────────────────────────────────────────
  // Slide 1 — Hero "1 800€"
  // ──────────────────────────────────────────────
  slideHTML(1, `
    <div class="tag">POUR LES COACHS SPORTIFS</div>
    <div class="big">1&nbsp;800€</div>
    <div class="headline">Le revenu médian d'un coach sportif en France.</div>
    <div class="sub">Net par mois. Tous statuts confondus. Et c'est ton plafond si tu changes rien.</div>
  `),

  // ──────────────────────────────────────────────
  // Slide 2 — Pourquoi ce plafond
  // ──────────────────────────────────────────────
  slideHTML(2, `
    <div class="tag">POURQUOI CE PLAFOND</div>
    <div class="pain-list">
      <div><span class="bullet">→</span><span>+10K nouveaux coachs diplômés par an.</span></div>
      <div><span class="bullet">→</span><span>Plateformes qui prennent <span class="accent">7 à 12&nbsp;%</span> de marge.</span></div>
      <div><span class="bullet">→</span><span>Tes leads revendus à ton concurrent.</span></div>
      <div><span class="bullet">→</span><span>Algos qui te déclassent quand tu vieillis.</span></div>
    </div>
  `),

  // ──────────────────────────────────────────────
  // Slide 3 — Punchline
  // ──────────────────────────────────────────────
  slideHTML(3, `
    <div class="tag">LE CONSTAT</div>
    <div class="quote">Tu construis<br>sur du <span class="accent">sable</span>.</div>
    <div class="sub">L'industrie est conçue pour churner ses propres pros. Si tu pilotes pas ton business, elle le fera pour toi.</div>
  `),

  // ──────────────────────────────────────────────
  // Slide 4 — La seule sortie
  // ──────────────────────────────────────────────
  slideHTML(4, `
    <div class="tag">LA SEULE SORTIE</div>
    <div class="quote">Récupère<br>le <span class="accent">pilotage</span>.</div>
    <div class="sub">Ta marque. Ta data. Ton pipeline. C'est tout ce qui reste à toi quand le système t'éjecte.</div>
  `),

  // ──────────────────────────────────────────────
  // Slide 5 — CTA Founder
  // ──────────────────────────────────────────────
  slideHTML(5, `
    <div class="cta-eyebrow">RB PERFORM</div>
    <div class="cta-headline">30 places<br><span class="accent">fondatrices</span>.</div>
    <div class="cta-benefit">→ 199€/mois bloqué à vie</div>
    <div class="cta-benefit">→ 0% commission sur tes clients</div>
    <div class="cta-benefit">→ Pilote ton MRR, ton churn, ton pipeline</div>
    <div class="cta-link"><span class="arrow">↗</span>Lien en bio.</div>
  `),
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (let i = 0; i < slides.length; i++) {
    const page = await ctx.newPage();
    const tmpHtml = path.join(OUT_DIR, `__slide-${i + 1}.html`);
    fs.writeFileSync(tmpHtml, slides[i]);
    await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900); // fonts settle
    const outFile = path.join(OUT_DIR, `carrousel-1800-0${i + 1}.png`);
    await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`✓ ${outFile}`);
    await page.close();
  }

  await browser.close();
  console.log(`\n✅ 5 slides générés dans ${OUT_DIR}`);
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
