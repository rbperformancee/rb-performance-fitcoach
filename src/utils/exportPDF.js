/**
 * Export PDF de progression — RB Performance FitCoach
 * Utilise jsPDF (CDN) chargé dynamiquement
 */

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) return resolve(window.jspdf.jsPDF);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

const GREEN  = [34, 197, 94];
const DARK   = [13, 13, 13];
const DARK2  = [20, 20, 20];
const DARK3  = [30, 30, 30];
const WHITE  = [245, 245, 245];
const GRAY   = [107, 114, 128];
const GRAY2  = [55, 55, 55];
const RED    = [239, 68, 68];

/**
 * Dessine une sparkline SVG-like en canvas jsPDF
 */
function drawSparkline(doc, x, y, w, h, data, color) {
  if (!data || data.length < 2) return;
  const weights = data.map(d => d.weight);
  const min = Math.min(...weights) - 0.5;
  const max = Math.max(...weights) + 0.5;
  const range = max - min || 1;
  const toX = i => x + (i / (weights.length - 1)) * w;
  const toY = v => y + h - ((v - min) / range) * h;

  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  for (let i = 1; i < weights.length; i++) {
    doc.line(toX(i-1), toY(weights[i-1]), toX(i), toY(weights[i]));
  }
  // Dot final
  doc.setFillColor(...color);
  doc.circle(toX(weights.length-1), toY(weights[weights.length-1]), 0.8, "F");
}

/**
 * Export complet : une page par semaine × séance pour les exercices
 */
export async function exportProgressPDF({ programme, getHistory, entries: weightEntries }) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210, H = 297;
  const ML = 14, MR = 14, MT = 14;
  let pageNum = 0;

  function newPage() {
    if (pageNum > 0) doc.addPage();
    pageNum++;
    // Fond sombre
    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, W, H, "F");
    // Bande header
    doc.setFillColor(13, 13, 132);
    doc.rect(0, 0, W, 22, "F");
    // Ligne verte
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 21.5, W, 0.8, "F");
  }

  function pageHeader(title, sub) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(34, 197, 94);
    doc.text("RB PERFORMANCE", ML, 9);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Rapport de progression", ML + 28, 9);

    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(245, 245, 245);
      doc.text(title, ML, 17);
    }
    if (sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(sub, ML + (doc.getTextWidth(title) + 3), 17);
    }
    // Page number right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(107, 114, 1282);
    doc.text(`${pageNum}`, W - MR, 9, { align: "right" });
  }

  function footer() {
    doc.setFontSize(6);
    doc.setTextColor(107, 114, 1282);
    doc.setFont("helvetica", "normal");
    const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(`Généré le ${date} · rbperform.com`, ML, H - 8);
    doc.setFillColor(13, 13, 132);
    doc.rect(0, H - 14, W, 14, "F");
  }

  // ══════════════════════════════════════════
  //  PAGE 1 : COVER
  // ══════════════════════════════════════════
  newPage();

  // Background dégradé simulé avec rectangles
  doc.setFillColor(18, 28, 22);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(13, 13, 13);
  doc.rect(0, 80, W, H - 80, "F");

  // Glow vert subtil
  doc.setFillColor(34, 197, 94);
  doc.setGState(doc.GState({ opacity: 0.04 }));
  doc.circle(W/2, 60, 80, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  // Logo text
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(ML, MT, 18, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(13, 13, 13);
  doc.text("RB", ML + 9, MT + 6.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(245, 245, 245);
  doc.text("RB PERFORMANCE", ML + 22, MT + 6.5);

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), W - MR, MT + 6.5, { align: "right" });

  // Ligne verte déco
  doc.setFillColor(34, 197, 94);
  doc.rect(ML, 40, 24, 1.5, "F");

  // Titre principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(245, 245, 245);
  const progName = (programme.name || "PROGRAMME").toUpperCase();
  doc.text(progName, ML, 58);

  // Sous-titre
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(34, 197, 94);
  doc.text("Rapport de progression", ML, 67);

  if (programme.clientName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Client : ${programme.clientName}`, ML, 75);
  }

  // Stats globales
  const totalEx = programme.weeks.reduce((a, w) => a + w.sessions.reduce((b, s) => b + s.exercises.length, 0), 0);
  let loggedEx = 0;
  programme.weeks.forEach((w, wi) => w.sessions.forEach((s, si) => s.exercises.forEach((ex, ei) => {
    if (getHistory(wi, si, ei).length > 0) loggedEx++;
  })));

  const cards = [
    { label: "Semaines", val: programme.weeks.length },
    { label: "Séances", val: programme.weeks.reduce((a, w) => a + w.sessions.length, 0) },
    { label: "Exercices", val: `${loggedEx}/${totalEx}` },
  ];
  const cardW = (W - ML - MR - 8) / 3;
  cards.forEach((c, i) => {
    const cx = ML + i * (cardW + 4);
    doc.setFillColor(13, 13, 132);
    doc.roundedRect(cx, 88, cardW, 22, 3, 3, "F");
    doc.setDrawColor(107, 114, 1282);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, 88, cardW, 22, 3, 3, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94);
    doc.text(String(c.val), cx + cardW/2, 103, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text(c.label.toUpperCase(), cx + cardW/2, 107.5, { align: "center" });
  });

  // Ligne séparatrice
  doc.setFillColor(107, 114, 1282);
  doc.rect(ML, 118, W - ML - MR, 0.3, "F");

  // Résumé poids si dispo
  if (weightEntries && weightEntries.length >= 2) {
    const first = weightEntries[0].weight;
    const last  = weightEntries[weightEntries.length - 1].weight;
    const delta = (last - first).toFixed(1);
    const sign  = delta > 0 ? "+" : "";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(245, 245, 245);
    doc.text("Évolution du poids", ML, 127);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`${first} kg → ${last} kg  (${sign}${delta} kg sur ${weightEntries.length} pesées)`, ML, 134);

    // Mini sparkline poids
    drawSparkline(doc, ML, 138, W - ML - MR - 20, 18, weightEntries, GREEN);
  }

  footer();

  // ══════════════════════════════════════════
  //  PAGES PROGRESSION PAR EXERCICE
  // ══════════════════════════════════════════
  // Collecte tous les exercices qui ont de l'historique
  const exercisesWithHistory = [];
  programme.weeks.forEach((week, wi) => {
    week.sessions.forEach((session, si) => {
      session.exercises.forEach((ex, ei) => {
        const hist = getHistory(wi, si, ei);
        if (hist.length > 0) {
          exercisesWithHistory.push({ ex, hist, week: wi + 1, session: si + 1, sessionName: session.name });
        }
      });
    });
  });

  // Regrouper par page (4 exercices par page)
  const PER_PAGE = 4;
  for (let page = 0; page < Math.ceil(exercisesWithHistory.length / PER_PAGE); page++) {
    const slice = exercisesWithHistory.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    newPage();
    pageHeader("Progression des exercices", `· ${programme.name}`);

    let yPos = 30;
    slice.forEach((item, i) => {
      const { ex, hist } = item;
      const latest = hist[hist.length - 1];
      const prev   = hist.length >= 2 ? hist[hist.length - 2] : null;
      const delta  = prev ? latest.weight - prev.weight : null;
      const max    = Math.max(...hist.map(h => h.weight));
      const cardH  = 54;

      // Card background
      doc.setFillColor(13, 13, 132);
      doc.roundedRect(ML, yPos, W - ML - MR, cardH, 3, 3, "F");

      // Bande latérale verte si PR récent
      if (delta !== null && delta > 0) {
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(ML, yPos, 2, cardH, 1, 1, "F");
      }

      // Numéro
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(`S${item.week} · ${item.sessionName}`, ML + 5, yPos + 6);

      // Nom exercice
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(245, 245, 245);
      doc.text(ex.name, ML + 5, yPos + 13);

      // Chips infos
      let chipX = ML + 5;
      const chips = [];
      if (ex.rawReps) chips.push(ex.rawReps);
      if (ex.tempo)   chips.push(ex.tempo);
      if (ex.rest)    chips.push(`⏱ ${ex.rest}`);
      chips.forEach(chip => {
        doc.setFillColor(13, 13, 133);
        const cw = doc.getTextWidth(chip) + 4;
        doc.roundedRect(chipX, yPos + 15.5, cw, 5.5, 1, 1, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(107, 114, 128);
        doc.text(chip, chipX + 2, yPos + 19.5);
        chipX += cw + 2;
      });

      // Poids actuel
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(34, 197, 94);
      doc.text(`${latest.weight} kg`, ML + 5, yPos + 32);

      // Delta
      if (delta !== null) {
        const dSign = delta > 0 ? "+" : "";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        if (delta > 0) doc.setTextColor(34, 197, 94);
      else if (delta < 0) doc.setTextColor(239, 68, 68);
      else doc.setTextColor(107, 114, 128);
        doc.text(`${dSign}${delta.toFixed(1)} kg`, ML + 5 + doc.getTextWidth(`${latest.weight} kg`) + 3, yPos + 32);
      }

      // Max
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`Max : ${max} kg · ${hist.length} séance${hist.length > 1 ? "s" : ""}`, ML + 5, yPos + 38);

      // Sparkline
      drawSparkline(doc, ML + 5, yPos + 41, W - ML - MR - 28, 9, hist, GREEN);

      // Date dernière mesure
      const dateStr = new Date(latest.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(107, 114, 1282);
      doc.text(dateStr, W - MR - 3, yPos + cardH - 4, { align: "right" });

      yPos += cardH + 6;
    });

    footer();
  }

  // ══════════════════════════════════════════
  //  PAGE POIDS
  // ══════════════════════════════════════════
  if (weightEntries && weightEntries.length >= 2) {
    newPage();
    pageHeader("Évolution du poids", `· ${programme.name}`);

    let y = 30;

    // Stats
    const weights = weightEntries.map(e => e.weight);
    const minW = Math.min(...weights), maxW = Math.max(...weights);
    const first = weightEntries[0], last = weightEntries[weightEntries.length - 1];
    const totalDelta = last.weight - first.weight;

    const statCards = [
      { l: "Poids actuel", v: `${last.weight} kg` },
      { l: "Variation", v: `${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(1)} kg` },
      { l: "Min", v: `${minW} kg` },
      { l: "Max", v: `${maxW} kg` },
    ];
    const scW = (W - ML - MR - 6) / 4;
    statCards.forEach((sc, i) => {
      const cx = ML + i * (scW + 2);
      doc.setFillColor(13, 13, 132);
      doc.roundedRect(cx, y, scW, 20, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      if (i === 1 && totalDelta < 0) doc.setTextColor(34, 197, 94);
      else if (i === 1 && totalDelta > 0) doc.setTextColor(239, 68, 68);
      else doc.setTextColor(245, 245, 245);
      doc.text(sc.v, cx + scW/2, y + 12, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(107, 114, 128);
      doc.text(sc.l.toUpperCase(), cx + scW/2, y + 17.5, { align: "center" });
    });
    y += 28;

    // Grande courbe
    drawSparkline(doc, ML, y, W - ML - MR, 55, weightEntries, GREEN);
    y += 63;

    // Table historique
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94);
    doc.text("HISTORIQUE DES PESÉES", ML, y);
    y += 6;

    [...weightEntries].reverse().slice(0, 20).forEach((entry, i) => {
      const prev = weightEntries[weightEntries.length - 2 - i];
      const d = prev ? entry.weight - prev.weight : null;

      if (i % 2 === 0) {
        doc.setFillColor(18, 18, 18);
        doc.rect(ML, y - 3.5, W - ML - MR, 7, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(new Date(entry.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" }), ML + 2, y + 2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(245, 245, 245);
      doc.text(`${entry.weight} kg`, ML + 52, y + 2);
      if (d !== null) {
        if (d > 0) doc.setTextColor(239, 68, 68);
          else if (d < 0) doc.setTextColor(34, 197, 94);
          else doc.setTextColor(107, 114, 128);
        doc.setFontSize(7);
        doc.text(`${d > 0 ? "+" : ""}${d.toFixed(1)} kg`, ML + 80, y + 2);
      }
      if (entry.note) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 1282);
        doc.text(entry.note, ML + 105, y + 2);
      }
      y += 7;
      if (y > H - 30) { footer(); newPage(); pageHeader("Poids (suite)", ""); y = 30; }
    });

    footer();
  }

  // Save
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${(programme.name || "programme").toLowerCase().replace(/\s+/g, "-")}_progression_${date}.pdf`;
  doc.save(filename);
}
