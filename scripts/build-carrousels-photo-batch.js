// Génère W-4, W-6, W-7, J-5 au style "37 900€/W-5 photo" avec photo Rayan en fond.
// Contenu fidèle au HTML d'origine, slide 7 refondu en CTA cohorte (pivot).

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Mapping photo par carrousel (path safe sans espaces)
const PHOTOS = {
  'W-4': '/tmp/photo-W4-tshirt-noir.png', // Firefly composite - t-shirt noir, fond gym teal/navy
  'W-6': '/tmp/photo-W6.jpg',             // gym haltères miroir
  'W-7': '/tmp/photo-W4-tshirt-noir.png', // même photo Firefly (match charte RB Perform)
  'J-5': '/tmp/photo-J5.png',             // bench press spotter
};
// Overlay : photo Firefly déjà dark + teal → brightness 0.85, juste gradient bas pour lisibilité
const OVERLAY_INTENSITY = {
  'W-4': { brightness: 0.88, gradTop: 0.10, gradBot: 0.85 },
  'W-6': { brightness: 0.32, gradTop: 0.55, gradBot: 0.90 },
  'W-7': { brightness: 0.85, gradTop: 0.12, gradBot: 0.88 },
  'J-5': { brightness: 0.32, gradTop: 0.55, gradBot: 0.90 },
};

const W = 1080, H = 1350;
let CURRENT_PHOTO = null;
let CURRENT_OVERLAY = null;

function buildCss(photoPath, overlay) {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; font-family:'Inter', -apple-system, sans-serif; background:#0d1726; color:#fff; position:relative; }
  .photo {
    position:absolute; inset:0;
    background-image:url('file://${photoPath}');
    background-size:cover; background-position:50% 50%;
    filter: contrast(1.05) brightness(${overlay.brightness}) saturate(0.85) hue-rotate(-10deg);
  }
  .photo::after {
    content:''; position:absolute; inset:0;
    background:
      linear-gradient(180deg, rgba(13,23,38,${overlay.gradTop}) 0%, rgba(13,23,38,0.55) 50%, rgba(13,23,38,${overlay.gradBot}) 100%),
      radial-gradient(ellipse 900px 700px at 30% 50%, rgba(20,230,197,0.10) 0%, rgba(13,23,38,0) 70%);
  }
  .brand-top {
    position:absolute; top:48px; left:60px;
    font-size:26px; font-weight:800; letter-spacing:0.04em;
    color:rgba(255,255,255,0.95); z-index:5;
  }
  .brand-top .dot { color:#14e6c5; font-weight:900; }
  .page-num {
    position:absolute; top:48px; right:60px;
    font-size:22px; font-weight:700; letter-spacing:0.18em;
    color:rgba(255,255,255,0.5); z-index:5;
  }
  .tag {
    display:inline-flex; align-items:center; gap:14px;
    font-size:28px; font-weight:800; letter-spacing:0.20em;
    color:#14e6c5; text-transform:uppercase;
    margin-bottom:38px;
  }
  .tag::before { content:'•'; color:#14e6c5; font-size:42px; line-height:0; }
  .content {
    position:absolute; left:60px; right:60px; bottom:90px;
    z-index:4;
  }
  .headline {
    font-size:104px; font-weight:900; color:#fff;
    line-height:1.02; letter-spacing:-0.035em;
    margin-bottom:32px;
  }
  .headline.smaller { font-size:84px; line-height:1.05; }
  .headline.smallest { font-size:68px; line-height:1.1; }
  .headline.hero { font-size:148px; line-height:0.98; letter-spacing:-0.045em; margin-bottom:38px; }
  .headline .accent { color:#14e6c5; }

  /* Slide 1 cover — gros chiffre marquant (style 37 900€) */
  .hero-number {
    font-size:230px; font-weight:900; color:#14e6c5;
    line-height:0.92; letter-spacing:-0.05em;
    margin-bottom:36px;
    font-variant-numeric: tabular-nums;
  }
  .sub {
    font-size:42px; font-weight:500;
    color:rgba(255,255,255,0.85);
    line-height:1.35; max-width:960px;
  }
  .stat-list {
    font-size:46px; font-weight:600; color:#fff;
    line-height:1.4; letter-spacing:-0.01em;
  }
  .stat-list .accent { color:#14e6c5; font-weight:800; }
  .stat-list div { margin-bottom:20px; display:flex; gap:22px; align-items:baseline; }
  .stat-list .bullet { color:#14e6c5; font-size:52px; line-height:0.8; }
  .math-line {
    font-size:96px; font-weight:900; color:#fff;
    line-height:1.0; letter-spacing:-0.03em;
    margin-bottom:24px; font-variant-numeric: tabular-nums;
  }
  .math-line .accent { color:#14e6c5; }
  /* CTA slide */
  .cta-headline {
    font-size:96px; font-weight:900; color:#fff;
    line-height:1.0; letter-spacing:-0.03em;
    margin-bottom:30px;
  }
  .cta-headline .accent { color:#14e6c5; }
  .cta-benefit {
    font-size:38px; font-weight:600; color:rgba(255,255,255,0.88);
    line-height:1.35; margin-bottom:10px;
  }
  .cta-link {
    margin-top:30px;
    font-size:34px; font-weight:700; letter-spacing:0.02em;
    color:#fff;
  }
  .cta-link .arrow { color:#14e6c5; font-weight:900; margin-right:10px; }
`;
}

function brand(i, total) {
  return `<div class="brand-top">RB<span class="dot">.</span>PERFORM</div>
          <div class="page-num">0${i} / 0${total}</div>`;
}
function slideHTML(i, total, inner) {
  const css = buildCss(CURRENT_PHOTO, CURRENT_OVERLAY);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head>
  <body>
    <div class="photo"></div>
    ${brand(i, total)}
    <div class="content">${inner}</div>
  </body></html>`;
}

// CTA cohorte commun (réutilisé pour les 4 slide-7)
function ctaSlide(i, total, intro) {
  return slideHTML(i, total, `
    <div class="tag">LA SORTIE</div>
    <div class="cta-headline">${intro}</div>
    <div class="cta-benefit">→ 30 places fondatrices · 199€/mois bloqué à vie</div>
    <div class="cta-benefit">→ 0% commission sur tes clients</div>
    <div class="cta-benefit">→ Pilote ton MRR, ton churn, ton pipeline</div>
    <div class="cta-link"><span class="arrow">↗</span>Lien en bio.</div>
  `);
}

// ───────────────────────────────────────────────
// CONTENUS — 4 carrousels (W-4, W-6, W-7, J-5)
// ───────────────────────────────────────────────
const CAROUSELS = {

  'W-4': {
    title: 'Vendre ton temps pas ton expertise',
    slides: (T) => [
      slideHTML(1, T, `
        <div class="tag">VÉRITÉ DURE</div>
        <div class="headline hero">Tu vends ton <span class="accent">temps</span>.<br>Pas ton expertise.</div>
      `),
      slideHTML(2, T, `
        <div class="tag">RÉALITÉ DU MARCHÉ</div>
        <div class="headline smaller">L'heure de coaching = <span class="accent">commodity</span>.</div>
        <div class="sub">Personne paie 1 000€ une "heure". Tout le monde paie 1 000€ une transformation.</div>
      `),
      slideHTML(3, T, `
        <div class="tag">EXEMPLE</div>
        <div class="hero-number">1 200€</div>
        <div class="headline smallest">Ton client paie ton suivi 3 mois.</div>
        <div class="sub">Pas pour les 30 heures avec lui. Pour les <span style="color:#14e6c5;font-weight:800">12 kilos perdus</span>.</div>
      `),
      slideHTML(4, T, `
        <div class="tag">TON ERREUR</div>
        <div class="headline smaller">Tu factures <span class="accent">30€/h</span>.</div>
        <div class="sub">Le client cherche un résultat. Tu vends une horloge.<br>Mismatch total.</div>
      `),
      slideHTML(5, T, `
        <div class="tag">LE SHIFT</div>
        <div class="headline">Stop vendre des heures.<br>Vends des <span class="accent">transformations</span>.</div>
      `),
      slideHTML(6, T, `
        <div class="tag">LE MATH</div>
        <div class="headline smallest">Programme 12 sem · <span class="accent">1 500€</span></div>
        <div class="sub" style="margin-top:18px"><strong>vs</strong> 50h × 30€ = 1 500€.</div>
        <div class="sub" style="margin-top:18px">Même prix. Tu travailles <span style="color:#14e6c5;font-weight:800">30% moins</span>.<br>Le client paie pour le résultat — pas pour ta présence.</div>
      `),
      ctaSlide(7, T, 'Le marché ne paie pas le talent.<br>Il paie le <span class="accent">résultat</span>.'),
    ],
  },

  'W-6': {
    title: '3 questions que ton client te pose jamais',
    slides: (T) => [
      slideHTML(1, T, `
        <div class="tag">VÉRITÉ CACHÉE</div>
        <div class="hero-number">3</div>
        <div class="headline smaller">questions que ton client te <span class="accent">pose jamais</span>.</div>
        <div class="sub">Mais qu'il pense en silence.</div>
      `),
      slideHTML(2, T, `
        <div class="tag">QUESTION 1</div>
        <div class="headline smaller">Combien tu gagnes <span class="accent">vraiment</span> par mois ?</div>
        <div class="sub">Net dans la poche. Il imagine 3K€. Il a peur d'avoir raison.</div>
      `),
      slideHTML(3, T, `
        <div class="tag">QUESTION 2</div>
        <div class="headline smaller">Pourquoi tu travailles <span class="accent">si tard</span> le soir ?</div>
        <div class="sub">Il t'admire. Mais il te plaint aussi.<br>Et il sait pas quoi faire de ces deux émotions.</div>
      `),
      slideHTML(4, T, `
        <div class="tag">QUESTION 3</div>
        <div class="headline smaller">T'es sûr de te faire <span class="accent">payer assez</span> ?</div>
        <div class="sub">Il voit la qualité de ton boulot. Il sait que tu paies pas le juste prix.<br>Mais il dit rien.</div>
      `),
      slideHTML(5, T, `
        <div class="tag">LE MIROIR</div>
        <div class="headline">Tes clients voient ce que tu <span class="accent">refuses de voir</span>.</div>
      `),
      slideHTML(6, T, `
        <div class="tag">LA VRAIE QUESTION</div>
        <div class="headline">Le silence n'est pas du respect.<br>C'est de la <span class="accent">pitié</span>.</div>
      `),
      ctaSlide(7, T, 'Pour que tes clients arrêtent de te plaindre.<br>Et commencent à <span class="accent">t\'envier</span>.'),
    ],
  },

  'W-7': {
    title: 'Math du plafond',
    slides: (T) => [
      slideHTML(1, T, `
        <div class="tag">MATH FIRST-PRINCIPLE</div>
        <div class="hero-number">10K€</div>
        <div class="headline smaller">Tu n'y arriveras <span class="accent">jamais</span>.</div>
        <div class="sub">Voici pourquoi tu plafonnes à 4K.</div>
      `),
      slideHTML(2, T, `
        <div class="tag">LIMITE 1 — TEMPS</div>
        <div class="headline smaller"><span class="accent">50h</span> par semaine.<br>Maximum absolu.</div>
        <div class="sub">Au-delà : burnout. Tu peux pas négocier avec la biologie.</div>
      `),
      slideHTML(3, T, `
        <div class="tag">LIMITE 2 — TARIF</div>
        <div class="headline smaller"><span class="accent">50€</span> par heure max.</div>
        <div class="sub">Le marché a fixé. Plus = clients refusent. Moins = tu meurs.<br>Tu peux pas négocier avec le marché.</div>
      `),
      slideHTML(4, T, `
        <div class="tag">MULTIPLICATION</div>
        <div class="math-line">50h <span class="accent">×</span> 4 sem <span class="accent">×</span> 50€</div>
        <div class="math-line" style="margin-top:12px"><span class="accent">= 10 000€</span></div>
      `),
      slideHTML(5, T, `
        <div class="tag">RÉALITÉ BRUTE</div>
        <div class="headline smaller">Brut. Avant charges. Avant impôts.</div>
        <div class="sub">Avant juillet où personne paie. Net réel : <span style="color:#14e6c5;font-weight:800">5-6K€/mois max</span>.<br>Le plafond mathématique du coach 1-on-1.</div>
      `),
      slideHTML(6, T, `
        <div class="tag">LA SEULE SOLUTION</div>
        <div class="headline"><span class="accent">Asset</span> > Heure.</div>
        <div class="sub">Tu dois découpler ton temps de ton revenu. Code, contenu, automation, levier. Ou tu plafonnes pour toujours.</div>
      `),
      ctaSlide(7, T, 'Le travail dur ne tue pas.<br>Le <span class="accent">plafond mathématique</span>, oui.'),
    ],
  },

  'J-5': {
    title: 'Pourquoi aucun SaaS coach ne te rend riche',
    slides: (T) => [
      slideHTML(1, T, `
        <div class="tag">VERDICT MARCHÉ 2026</div>
        <div class="headline hero">Aucun SaaS coach ne te rend <span class="accent">riche</span>.</div>
      `),
      slideHTML(2, T, `
        <div class="tag">TRAINERIZE</div>
        <div class="headline smaller">Builder de programmes.</div>
        <div class="sub">Pas un dashboard <span style="color:#14e6c5;font-weight:800">business</span>.</div>
      `),
      slideHTML(3, T, `
        <div class="tag">TRUECOACH</div>
        <div class="headline smaller"><span class="accent">10%</span> de commission sur tes ventes.</div>
        <div class="sub">Tu paies pour bosser.</div>
      `),
      slideHTML(4, T, `
        <div class="tag">GYMKEE</div>
        <div class="headline smaller">Délivre la meilleure expérience.</div>
        <div class="sub">Mais ne te dit pas si tu <span style="color:#14e6c5;font-weight:800">gagnes de l'argent</span>.</div>
      `),
      slideHTML(5, T, `
        <div class="tag">HEXFIT</div>
        <div class="headline">Outil de prog.<br><span class="accent">Encore</span>.</div>
      `),
      slideHTML(6, T, `
        <div class="tag">LE CONSTAT</div>
        <div class="headline smaller">Tous t'apprennent à <span class="accent">coacher</span>.</div>
        <div class="sub">Aucun ne t'apprend à <span style="color:#14e6c5;font-weight:800">diriger</span>.</div>
      `),
      ctaSlide(7, T, "C'est pour ça que j'ai construit <span class=\"accent\">autre chose</span>."),
    ],
  },
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (const [code, def] of Object.entries(CAROUSELS)) {
    const OUT_DIR = `/tmp/carrousel-${code}-photo`;
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    // Set photo + overlay for current carousel
    CURRENT_PHOTO = PHOTOS[code];
    CURRENT_OVERLAY = OVERLAY_INTENSITY[code];
    if (!fs.existsSync(CURRENT_PHOTO)) {
      console.error(`⚠ Photo manquante: ${CURRENT_PHOTO} (skip ${code})`);
      continue;
    }
    const slides = def.slides(7);
    console.log(`\n→ ${code} — "${def.title}" — photo: ${path.basename(CURRENT_PHOTO)}`);
    for (let i = 0; i < slides.length; i++) {
      const page = await ctx.newPage();
      const tmpHtml = path.join(OUT_DIR, `__slide-${i + 1}.html`);
      fs.writeFileSync(tmpHtml, slides[i]);
      await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const outFile = path.join(OUT_DIR, `carrousel-${code}-photo-0${i + 1}.png`);
      await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: W, height: H } });
      console.log(`  ✓ ${path.basename(outFile)}`);
      await page.close();
    }
  }

  await browser.close();
  console.log('\n✅ Tous les carrousels W-4 / W-6 / W-7 / J-5 générés dans /tmp/');
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
