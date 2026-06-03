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

  draw("BOWL SAUMON QUINOA AVOCAT", { font, size: 18, lh: 28 });
  draw("Bowl complet riche en omega-3 - dejeuner ou diner", { font: ital, size: 11, color: rgb(0.45, 0.45, 0.45), lh: 24 });

  draw("Pour 2 personnes  |  Prep : 15 min  |  Cuisson : 15 min  |  Difficulte : facile", { lh: 28 });

  draw("INGREDIENTS", { font, size: 13, lh: 22 });
  const ings = [
    "250 g de filet de saumon",
    "120 g de quinoa (cru)",
    "1 avocat mur",
    "100 g de pousses d'epinards",
    "1 carotte rapee",
    "1 concombre",
    "100 g de tomates cerises",
    "2 cuilleres a soupe de graines de sesame",
    "1 cuillere a soupe d'huile de sesame",
    "2 cuilleres a soupe de sauce soja",
    "1 cuillere a cafe de gingembre rape",
    "1 citron vert",
    "Sel, poivre",
  ];
  ings.forEach((i) => draw("- " + i));
  y -= 8;

  draw("PREPARATION", { font, size: 13, lh: 22 });
  const steps = [
    "1. Cuire le quinoa 12-15 min dans 2x son volume d'eau salee.",
    "2. Couper le saumon en cubes et le poeler 3 min de chaque cote.",
    "3. Couper l'avocat, le concombre et les tomates cerises.",
    "4. Preparer la sauce : huile sesame + sauce soja + gingembre + jus citron vert.",
    "5. Dresser le bowl : quinoa, epinards, saumon, legumes, avocat.",
    "6. Arroser de sauce, parsemer les graines de sesame.",
  ];
  steps.forEach((s) => draw(s, { lh: 15 }));
  y -= 10;

  draw("INFOS NUTRITIONNELLES (par portion)", { font, size: 13, lh: 22 });
  draw("Calories : ~580 kcal");
  draw("Proteines : 35 g");
  draw("Glucides : 48 g");
  draw("Lipides : 28 g");
  draw("Fibres : 9 g");

  const bytes = await doc.save();
  fs.writeFileSync("/tmp/test-recette-bowl-saumon.pdf", bytes);
  console.log("OK - PDF cree : /tmp/test-recette-bowl-saumon.pdf (" + bytes.length + " bytes)");
})();
