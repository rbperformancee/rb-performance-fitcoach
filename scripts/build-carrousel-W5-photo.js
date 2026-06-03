// Carrousel W-5 "Industrie coaching bulle" — contenu/ordre exact du HTML d'origine,
// mais re-rendu au style 37 900€ (photo en fond + brand + pagination + tag teal),
// SANS gros chiffre en hero.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PHOTO = '/Users/rayan/Library/CloudStorage/OneDrive-Personnel/IMG_6892 2.PNG';
const OUT_DIR = '/tmp/carrousel-W5-photo';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1080, H = 1350;

const PHOTO_SAFE = '/tmp/rayan-gym-hoodie.png';
if (fs.existsSync(PHOTO)) {
  fs.copyFileSync(PHOTO, PHOTO_SAFE);
}

const COMMON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; font-family:'Inter', -apple-system, sans-serif; background:#0d1726; color:#fff; position:relative; }

  /* Photo fond + overlay sombre + gradient teal */
  .photo {
    position:absolute; inset:0;
    background-image:url('file://${PHOTO_SAFE}');
    background-size:cover; background-position:50% 50%;
    filter: contrast(1.05) brightness(0.40) saturate(1.0);
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
    display:inline-flex; align-items:center; gap:14px;
    font-size:28px; font-weight:800; letter-spacing:0.20em;
    color:#14e6c5;
    text-transform:uppercase;
    margin-bottom:38px;
  }
  .tag::before {
    content:'•'; color:#14e6c5; font-size:42px; line-height:0;
  }

  /* Content wrap, padding 60px */
  .content {
    position:absolute; left:60px; right:60px; bottom:90px;
    z-index:4;
  }

  /* Headline (taille normale, pas un gros chiffre) */
  .headline {
    font-size:104px; font-weight:900; color:#fff;
    line-height:1.02; letter-spacing:-0.035em;
    margin-bottom:32px;
  }
  .headline.smaller { font-size:84px; line-height:1.05; }
  .headline .accent { color:#14e6c5; }

  .sub {
    font-size:42px; font-weight:500;
    color:rgba(255,255,255,0.85);
    line-height:1.35;
    max-width:960px;
  }

  /* Bullet list (pour slides avec stats) */
  .stat-list {
    font-size:46px; font-weight:600; color:#fff;
    line-height:1.4; letter-spacing:-0.01em;
  }
  .stat-list .accent { color:#14e6c5; font-weight:800; }
  .stat-list div { margin-bottom:20px; display:flex; gap:22px; align-items:baseline; }
  .stat-list .bullet { color:#14e6c5; font-size:52px; line-height:0.8; }

  /* CTA slide */
  .cta-headline {
    font-size:120px; font-weight:900; color:#fff;
    line-height:1.0; letter-spacing:-0.035em;
    margin-bottom:34px;
  }
  .cta-headline .accent { color:#14e6c5; }
  .cta-benefit {
    font-size:38px; font-weight:600; color:rgba(255,255,255,0.88);
    line-height:1.35; margin-bottom:10px;
  }
  .cta-link {
    margin-top:32px;
    font-size:34px; font-weight:700; letter-spacing:0.02em;
    color:#fff;
  }
  .cta-link .arrow { color:#14e6c5; font-weight:900; margin-right:10px; }
`;

const TOTAL = 7;
function brand(i) {
  return `<div class="brand-top">RB<span class="dot">.</span>PERFORM</div>
          <div class="page-num">0${i} / 0${TOTAL}</div>`;
}
function slideHTML(i, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}</style></head>
  <body>
    <div class="photo"></div>
    ${brand(i)}
    <div class="content">${inner}</div>
  </body></html>`;
}

// Contenu W-5 exact (7 slides, ordre HTML d'origine), Reveal 26 mai retiré.
const slides = [
  slideHTML(1, `
    <div class="tag">INDUSTRIE 2026</div>
    <div class="headline">L'industrie du coaching est en train de <span class="accent">péter</span>.</div>
    <div class="sub">Tu construis sur du sable.</div>
  `),

  slideHTML(2, `
    <div class="tag">SATURATION 1</div>
    <div class="headline smaller">+10K nouveaux coachs diplômés par an.</div>
    <div class="sub">Médiane revenu en France : <span style="color:#14e6c5;font-weight:800">1 800€/mois net</span>. La majorité ne vit pas de son métier.</div>
  `),

  slideHTML(3, `
    <div class="tag">SATURATION 2</div>
    <div class="headline smaller">Les plateformes te prennent ta marge.</div>
    <div class="stat-list" style="margin-top:20px">
      <div><span class="bullet">→</span><span>TrueCoach <span class="accent">10%</span></span></div>
      <div><span class="bullet">→</span><span>Trainerize <span class="accent">7-12%</span></span></div>
      <div><span class="bullet">→</span><span>Stripe <span class="accent">3%</span> en plus</span></div>
    </div>
    <div class="sub" style="margin-top:24px">Tu paies pour bosser.</div>
  `),

  slideHTML(4, `
    <div class="tag">SATURATION 3</div>
    <div class="headline smaller">Ils te revendent <span class="accent">tes leads</span>.</div>
    <div class="sub">Quand tu signes un client via leur plateforme, ils ont son email. Le revendent au coach d'à côté.</div>
  `),

  slideHTML(5, `
    <div class="tag">SATURATION 4</div>
    <div class="headline smaller">L'algo te déclasse quand tu vieillis.</div>
    <div class="sub">Instagram, TikTok, plateformes coach. Plus tu vieillis sur le système, moins tu es vu. Système conçu pour churner ses propres pros.</div>
  `),

  slideHTML(6, `
    <div class="tag">VERDICT</div>
    <div class="headline">Si tu pilotes pas ton business, <span class="accent">l'industrie le fera</span> pour toi.</div>
  `),

  slideHTML(7, `
    <div class="tag">LA SEULE OPTION</div>
    <div class="cta-headline">Récupère le <span class="accent">pilotage</span>.</div>
    <div class="cta-benefit">→ Ta marque. Ta data. Ton pipeline.</div>
    <div class="cta-benefit">→ 30 places fondatrices · 199€/mois bloqué à vie</div>
    <div class="cta-benefit">→ 0% commission sur tes clients</div>
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
    await page.waitForTimeout(900);
    const outFile = path.join(OUT_DIR, `carrousel-W5-photo-0${i + 1}.png`);
    await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`✓ ${outFile}`);
    await page.close();
  }

  await browser.close();
  console.log(`\n✅ ${TOTAL} slides W-5 photo générés dans ${OUT_DIR}`);
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
