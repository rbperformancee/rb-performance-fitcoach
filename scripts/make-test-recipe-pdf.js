const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fs = require("fs");

(async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const ital = await doc.embedFont(StandardFonts.HelveticaOblique);

  let y = 800;
  const draw = (text, opts = {}) => {
    page.drawText(text, {
      x: opts.x || 50,
      y,
      size: opts.size || 11,
      font: opts.font || body,
      color: opts.color || rgb(0.1, 0.1, 0.1),
    });
    y -= opts.lh || 16;
  };

  draw("POULET ROTI AU CITRON & RIZ COMPLET", { font, size: 18, lh: 28 });
  draw("Recette haute-proteine - post-workout", { font: ital, size: 11, color: rgb(0.45, 0.45, 0.45), lh: 24 });

  draw("Pour 2 personnes  |  Prep : 10 min  |  Cuisson : 25 min  |  Difficulte : facile", { lh: 28 });

  draw("INGREDIENTS", { font, size: 13, lh: 22 });
  const ings = [
    "300 g de blanc de poulet",
    "150 g de riz complet (cru)",
    "1 citron jaune",
    "2 cuilleres a soupe d'huile d'olive",
    "2 gousses d'ail",
    "1 cuillere a cafe de paprika fume",
    "1 cuillere a cafe de thym sec",
    "Sel, poivre",
    "200 g de brocolis",
    "30 g de parmesan rape",
  ];
  ings.forEach((i) => draw("- " + i));
  y -= 8;

  draw("PREPARATION", { font, size: 13, lh: 22 });
  const steps = [
    "1. Prechauffer le four a 200 degC.",
    "2. Melanger l'huile, le jus de citron, l'ail ecrase, le paprika et le thym.",
    "3. Badigeonner les blancs de poulet avec la marinade, saler et poivrer.",
    "4. Cuire au four 22-25 min jusqu'a 73 degC a coeur.",
    "5. Cuire le riz complet 18-20 min dans 2x son volume d'eau salee.",
    "6. Faire vapeur les brocolis 6-8 min.",
    "7. Dresser : riz, poulet tranche, brocolis, parmesan rape par-dessus.",
  ];
  steps.forEach((s) => draw(s, { lh: 15 }));
  y -= 10;

  draw("INFOS NUTRITIONNELLES (par portion)", { font, size: 13, lh: 22 });
  draw("Calories : ~620 kcal");
  draw("Proteines : 52 g");
  draw("Glucides : 65 g");
  draw("Lipides : 18 g");
  draw("Fibres : 7 g");

  const bytes = await doc.save();
  fs.writeFileSync("/tmp/test-recette-poulet-citron.pdf", bytes);
  console.log("OK - PDF cree : /tmp/test-recette-poulet-citron.pdf (" + bytes.length + " bytes)");
})();
