/**
 * Genere un PDF de transformation partageable sur reseaux sociaux.
 * Format A4 portrait, design premium dark, data viz impactante.
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

/**
 * @param {Object} client — row clients
 * @param {Object} coach  — row coaches  (full_name, brand_name)
 * @param {Object} data   — fetchTransformation() output
 */
export async function generateTransformationPDF(client, coach, data) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  // ===== BACKGROUND noir premium =====
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, W, H, "F");

  // Accent gradient top (simule via rect semi-transparent)
  doc.setFillColor(2, 209, 186);
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.rect(0, 0, W, 70, "F");
  doc.setGState(new doc.GState({ opacity: 1 }));

  // ===== HEADER =====
  const brand = coach.brand_name || coach.full_name || "RB Perform";
  doc.setTextColor(2, 209, 186);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TRANSFORMATION", W / 2, 22, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.text((client.full_name || "Client").toUpperCase(), W / 2, 38, { align: "center" });

  // Periode
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const startStr = data.dayOne ? data.dayOne.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const todayStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`${startStr} → ${todayStr}`, W / 2, 50, { align: "center" });
  doc.text(`${data.weeksSinceStart} semaines de travail`, W / 2, 58, { align: "center" });

  // ===== BIG NUMBER : POIDS DELTA =====
  if (data.deltas.weight !== null && Math.abs(data.deltas.weight) > 0.1) {
    const y = 85;
    // Card
    doc.setFillColor(15, 15, 15);
    doc.roundedRect(20, y, 170, 54, 4, 4, "F");

    const isLoss = data.deltas.weight < 0;
    const deltaColor = isLoss ? [2, 209, 186] : [249, 115, 22];
    doc.setTextColor(...deltaColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(72);
    const sign = data.deltas.weight > 0 ? "+" : "";
    doc.text(`${sign}${data.deltas.weight.toFixed(1)}`, W / 2 - 18, y + 34, { align: "center" });
    doc.setFontSize(22);
    doc.text(" kg", W / 2 + 30, y + 34);

    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(isLoss ? "DE PERTE DE POIDS" : "DE PRISE DE POIDS", W / 2, y + 46, { align: "center" });
  }

  // ===== STATS GRID 2x2 =====
  const statsY = 155;
  const stats = [
    { label: "Seances", before: data.before.sessionsWeek ?? 0, after: data.after.sessionsWeek ?? 0, unit: "/sem" },
    { label: "Jours nutri.", before: data.before.nutriDays ?? 0, after: data.after.nutriDays ?? 0, unit: "/7" },
    { label: "RPE moyen", before: data.before.rpe?.toFixed(1) ?? "—", after: data.after.rpe?.toFixed(1) ?? "—", unit: "" },
    { label: "Charge moyenne", before: data.before.avgCharge?.toFixed(0) ?? "—", after: data.after.avgCharge?.toFixed(0) ?? "—", unit: "kg" },
  ];

  doc.setTextColor(2, 209, 186);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SEMAINE 1 → AUJOURD'HUI", 20, statsY);

  const cellW = 80;
  const cellH = 30;
  const gap = 10;
  stats.forEach((s, i) => {
    const x = 20 + (i % 2) * (cellW + gap);
    const y = statsY + 8 + Math.floor(i / 2) * (cellH + 8);

    doc.setFillColor(15, 15, 15);
    doc.roundedRect(x, y, cellW, cellH, 3, 3, "F");

    doc.setTextColor(130, 130, 130);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(s.label.toUpperCase(), x + 6, y + 8);

    // Before en gris
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(14);
    doc.text(String(s.before) + s.unit, x + 6, y + 22);

    // Fleche
    doc.setTextColor(2, 209, 186);
    doc.setFontSize(12);
    doc.text(">", x + cellW / 2 - 2, y + 22);

    // After en teal
    doc.setTextColor(2, 209, 186);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(String(s.after) + s.unit, x + cellW / 2 + 6, y + 22);
  });

  // ===== COURBE POIDS SVG simple =====
  if (data.weights && data.weights.length >= 2) {
    const gy = 235;
    const gW = 170;
    const gH = 30;
    const gx = 20;

    doc.setTextColor(2, 209, 186);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("EVOLUTION DU POIDS", gx, gy);

    const values = data.weights.map((w) => w.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const toX = (i) => gx + (i / (values.length - 1)) * gW;
    const toY = (v) => gy + 6 + gH - ((v - min) / range) * gH;

    // Axe gris
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.2);
    doc.line(gx, gy + 6 + gH, gx + gW, gy + 6 + gH);

    // Courbe teal
    doc.setDrawColor(2, 209, 186);
    doc.setLineWidth(0.6);
    for (let i = 1; i < values.length; i++) {
      doc.line(toX(i - 1), toY(values[i - 1]), toX(i), toY(values[i]));
    }

    // Points start + end
    doc.setFillColor(2, 209, 186);
    doc.circle(toX(0), toY(values[0]), 1.2, "F");
    doc.circle(toX(values.length - 1), toY(values[values.length - 1]), 1.5, "F");

    // Labels
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`${values[0]} kg`, toX(0), toY(values[0]) - 2);
    doc.text(`${values[values.length - 1]} kg`, toX(values.length - 1) - 6, toY(values[values.length - 1]) - 2);
  }

  // ===== FOOTER BRAND =====
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Coaching par ${brand}`, W / 2, 282, { align: "center" });
  doc.setTextColor(2, 209, 186);
  doc.text("Propulse par RB Perform", W / 2, 288, { align: "center" });

  // Download
  const filename = `Transformation_${(client.full_name || "client").replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;
  doc.save(filename);
  return filename;
}
