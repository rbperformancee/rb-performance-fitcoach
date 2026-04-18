/**
 * Generateur de facture PDF — RB Perform
 * Utilise jsPDF (CDN) charge dynamiquement
 *
 * Supporte les plans dynamiques (coach_plans table) et les anciens plans legacy.
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

// Legacy fallback — utilise seulement si aucun plan dynamique
const PLAN_LABELS_LEGACY = { "3m": "Programme 3 Mois", "6m": "Programme 6 Mois", "12m": "Programme 12 Mois" };
const PLAN_PRICES_LEGACY = { "3m": 120, "6m": 110, "12m": 100 };
const PLAN_MONTHS_LEGACY = { "3m": 3, "6m": 6, "12m": 12 };

/**
 * Genere et telecharge une facture PDF pour un client
 * @param {Object} client — row clients (full_name, email, subscription_*, _plan_price, _plan_name, _plan_duration)
 * @param {Object} coach — row coaches (full_name, brand_name, email, siret, business_name, business_address, tva_status)
 * @param {string} [invoiceNumber] — ex: "INV-2026-001" (auto-genere si absent)
 */
export async function generateInvoicePDF(client, coach, invoiceNumber) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 20;

  // Couleurs
  const bg = [5, 5, 5];
  const white = [255, 255, 255];
  const gray = [130, 130, 130];
  const teal = [2, 209, 186];

  // Resolve plan info — priorite aux plans dynamiques
  const plan = client.subscription_plan || "3m";
  const planLabel = client._plan_name || PLAN_LABELS_LEGACY[plan] || "Programme coaching";
  const priceMonth = client._plan_price || PLAN_PRICES_LEGACY[plan] || 0;
  const months = client._plan_duration || client.subscription_duration_months || PLAN_MONTHS_LEGACY[plan] || 1;
  const total = Math.round(priceMonth * months * 100) / 100;

  // Background
  doc.setFillColor(...bg);
  doc.rect(0, 0, W, H, "F");

  // ===== HEADER =====
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.text(coach?.brand_name || coach?.coaching_name || "RB Perform", M, 30);

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const coachLines = [
    coach?.business_name || coach?.full_name || "",
    coach?.email || "",
    coach?.business_address || "",
    coach?.siret ? "SIRET : " + coach.siret : "",
  ].filter(Boolean);
  coachLines.forEach((line, i) => doc.text(line, M, 37 + i * 5));

  // Badge FACTURE
  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.roundedRect(W - M - 40, 22, 40, 12, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...bg);
  doc.text("FACTURE", W - M - 35, 30);

  // Numero + date
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const now = new Date();
  const autoNum = "INV-" + now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
  doc.text("N\u00b0 " + (invoiceNumber || autoNum), W - M - 50, 42);
  doc.text("Date : " + now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }), W - M - 50, 47);

  // Separateur
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(M, 60, W - M, 60);

  // ===== CLIENT INFO =====
  doc.setFontSize(9);
  doc.setTextColor(teal[0], teal[1], teal[2]);
  doc.text("FACTURE A", M, 70);

  doc.setFontSize(12);
  doc.setTextColor(...white);
  doc.text(client.full_name || client.email || "Client", M, 78);

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  if (client.email) doc.text(client.email, M, 84);

  // Periode
  if (client.subscription_start_date && client.subscription_end_date) {
    const fmt = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    doc.text("Periode : " + fmt(client.subscription_start_date) + " \u2192 " + fmt(client.subscription_end_date), M, 90);
  }

  // ===== TABLE =====
  const tableY = 105;

  // Header table
  doc.setFillColor(20, 20, 20);
  doc.roundedRect(M, tableY, W - 2 * M, 10, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("DESCRIPTION", M + 4, tableY + 7);
  doc.text("DUREE", M + 84, tableY + 7);
  doc.text("PRIX/MOIS", W - M - 55, tableY + 7);
  doc.text("TOTAL", W - M - 20, tableY + 7);

  // Ligne produit
  const rowY = tableY + 18;
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.text(planLabel, M + 4, rowY);

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(months + " mois", M + 84, rowY);
  doc.text(priceMonth.toFixed(2) + " EUR", W - M - 55, rowY);

  doc.setTextColor(...white);
  doc.text(total.toFixed(2) + " EUR", W - M - 25, rowY);

  // Separateur
  doc.setDrawColor(30, 30, 30);
  doc.line(M, rowY + 6, W - M, rowY + 6);

  // ===== TOTAL =====
  const totalY = rowY + 20;

  doc.setFillColor(15, 15, 15);
  doc.roundedRect(W - M - 70, totalY, 70, 30, 3, 3, "F");

  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("Sous-total HT", W - M - 65, totalY + 10);
  doc.text("TVA (non applicable)", W - M - 65, totalY + 17);

  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.text(total.toFixed(2) + " EUR", W - M - 10, totalY + 10, { align: "right" });
  doc.text("0,00 EUR", W - M - 10, totalY + 17, { align: "right" });

  // Total TTC
  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.roundedRect(W - M - 70, totalY + 24, 70, 12, 2, 2, "F");
  doc.setFontSize(10);
  doc.setTextColor(...bg);
  doc.text("TOTAL TTC", W - M - 65, totalY + 32);
  doc.text(total.toFixed(2) + " EUR", W - M - 10, totalY + 32, { align: "right" });

  // ===== MENTIONS LEGALES =====
  const legalY = totalY + 55;
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const tvaText = coach?.tva_status === "applicable" ? "TVA applicable" : "TVA non applicable - art. 293 B du CGI";
  doc.text(tvaText, M, legalY);
  doc.text("Paiement par carte bancaire securise", M, legalY + 5);
  if (coach?.siret) doc.text("SIRET : " + coach.siret, M, legalY + 10);
  if (coach?.business_address) doc.text(coach.business_address, M, legalY + 15);

  // ===== FOOTER =====
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(coach?.brand_name || coach?.coaching_name || "RB Perform", W / 2, H - 15, { align: "center" });
  doc.text("Facture generee automatiquement", W / 2, H - 10, { align: "center" });

  // Telecharger
  const safeName = (client.full_name || "client").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = "Facture_" + safeName + "_" + now.toISOString().split("T")[0] + ".pdf";
  doc.save(fileName);
}
