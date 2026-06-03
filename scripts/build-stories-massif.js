// 4 stories éducatives "Athlète massif explosif ?" + CTA Force et Masse 8 sem.
// Format 1080×1920 (IG story 9:16).
// Charte RB Perform : dark navy #0d1726, accent teal #14e6c5, Inter typo.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PHOTO = '/tmp/rayan-torse-nu.jpg';
const OUT_DIR = '/tmp/stories-massif';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1080, H = 1920;
const TOTAL = 4;

const COMMON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; font-family:'Inter', -apple-system, sans-serif; background:#0d1726; color:#fff; position:relative; }

  /* Photo fond — Rayan torse nu (lui à gauche du cadre, droite = carrelage = zone texte) */
  .photo {
    position:absolute; inset:0;
    background-image:url('file://${PHOTO}');
    background-size:cover; background-position:50% 50%;
    filter: contrast(1.05) brightness(0.55) saturate(1.0);
  }
  .photo::after {
    content:''; position:absolute; inset:0;
    background:
      linear-gradient(180deg, rgba(13,23,38,0.55) 0%, rgba(13,23,38,0.30) 35%, rgba(13,23,38,0.75) 100%),
      radial-gradient(ellipse 900px 600px at 80% 70%, rgba(20,230,197,0.10) 0%, rgba(13,23,38,0) 65%);
  }

  /* Brand top-left */
  .brand-top {
    position:absolute; top:80px; left:60px;
    font-size:30px; font-weight:800; letter-spacing:0.04em;
    color:rgba(255,255,255,0.95);
    z-index:5;
  }
  .brand-top .dot { color:#14e6c5; font-weight:900; }

  /* Pagination top-right */
  .page-num {
    position:absolute; top:80px; right:60px;
    font-size:26px; font-weight:700; letter-spacing:0.18em;
    color:rgba(255,255,255,0.55);
    z-index:5;
  }

  /* Tag teal (eyebrow) */
  .tag {
    display:inline-flex; align-items:center; gap:14px;
    font-size:30px; font-weight:800; letter-spacing:0.20em;
    color:#14e6c5;
    text-transform:uppercase;
    margin-bottom:36px;
  }
  .tag::before {
    content:'•'; color:#14e6c5; font-size:46px; line-height:0;
  }

  /* Content wrap — ancré bas pour rester au-dessus des contrôles IG */
  .content {
    position:absolute; left:60px; right:60px; bottom:240px;
    z-index:4;
  }

  .headline {
    font-size:108px; font-weight:900; color:#fff;
    line-height:1.0; letter-spacing:-0.035em;
    margin-bottom:36px;
  }
  .headline.smaller { font-size:78px; line-height:1.1; }
  .headline .accent { color:#14e6c5; }

  .body-text {
    font-size:46px; font-weight:600; color:#fff;
    line-height:1.35; letter-spacing:-0.01em;
    margin-bottom:18px;
  }
  .body-text .accent { color:#14e6c5; font-weight:800; }
  .body-text.lighter { font-weight:500; color:rgba(255,255,255,0.88); }

  /* CTA slide elements */
  .cta-eyebrow {
    font-size:32px; font-weight:700; letter-spacing:0.18em;
    color:#14e6c5; text-transform:uppercase;
    margin-bottom:26px;
  }
  .cta-headline {
    font-size:140px; font-weight:900; color:#fff;
    line-height:0.95; letter-spacing:-0.035em;
    margin-bottom:24px;
  }
  .cta-headline .accent { color:#14e6c5; }
  .cta-sub {
    font-size:48px; font-weight:700; color:rgba(255,255,255,0.92);
    margin-bottom:36px; letter-spacing:-0.01em;
  }
  .value-stack {
    margin-top:24px; margin-bottom:30px;
  }
  .value-stack div {
    font-size:38px; font-weight:600; color:rgba(255,255,255,0.92);
    line-height:1.4; margin-bottom:8px;
  }
  .value-stack .arrow { color:#14e6c5; font-weight:900; margin-right:14px; }
  .cta-start {
    font-size:44px; font-weight:800; color:#14e6c5;
    letter-spacing:-0.01em;
    margin-top:8px;
  }
`;

function slideHTML(i, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${COMMON_CSS}</style></head>
  <body>
    <div class="photo"></div>
    <div class="content">${inner}</div>
  </body></html>`;
}

const slides = [
  // ───────────── STORY 1 — HOOK ─────────────
  slideHTML(1, `
    <div class="tag">PRISE DE MASSE</div>
    <div class="headline">Un athlète <span class="accent">musclé</span>.</div>
    <div class="body-text lighter">Tu crois qu'il est massif grâce à l'explosivité&nbsp;?</div>
    <div class="body-text" style="margin-top:30px;"><span class="accent">Non.</span></div>
  `),

  // ───────────── STORY 2 — LA RAISON ─────────────
  slideHTML(2, `
    <div class="tag">LA VRAIE RAISON</div>
    <div class="headline smaller">Il a gagné sa masse avec de la muscu classique.</div>
    <div class="body-text">Pousser lourd. <span class="accent">6 à 12 reps</span>. Fatigue maximale.</div>
    <div class="body-text lighter" style="margin-top:24px;">L'explosivité, c'est pour la vitesse. Pas pour la masse.</div>
  `),

  // ───────────── STORY 3 — TOI ─────────────
  slideHTML(3, `
    <div class="tag">TOI</div>
    <div class="headline smaller">Tu n'as pas besoin de l'arsenal complet d'un athlète.</div>
    <div class="body-text">Tu as besoin d'<span class="accent">une seule chose</span> :</div>
    <div class="body-text lighter" style="margin-top:14px;">une vraie phase de muscu, bien faite.</div>
    <div class="body-text" style="margin-top:30px;"><span class="accent">8 semaines</span> suffisent.</div>
  `),

  // ───────────── STORY 4 — CTA Hormozi (offre irrésistible) ─────────────
  slideHTML(4, `
    <div class="cta-eyebrow">DEVIENS MASSIF EN 8 SEMAINES.</div>
    <div class="cta-headline">Force &<br><span class="accent">Masse</span>.</div>
    <div class="value-stack">
      <div><span class="arrow">→</span> Le programme complet</div>
      <div><span class="arrow">→</span> Progression semaine par semaine</div>
      <div><span class="arrow">→</span> Tous les exercices détaillés</div>
      <div><span class="arrow">→</span> Accessible à vie</div>
    </div>
    <div class="cta-start">Tu commences ce soir.</div>
  `),
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (let i = 0; i < slides.length; i++) {
    const page = await ctx.newPage();
    const tmpHtml = path.join(OUT_DIR, `__story-${i + 1}.html`);
    fs.writeFileSync(tmpHtml, slides[i]);
    await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const outFile = path.join(OUT_DIR, `story-massif-0${i + 1}.png`);
    await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`✓ ${outFile}`);
    await page.close();
  }

  await browser.close();
  console.log(`\n✅ ${TOTAL} stories générées dans ${OUT_DIR}`);
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
