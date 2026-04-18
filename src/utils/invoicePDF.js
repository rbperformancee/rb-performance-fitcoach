/**
 * Generateur de facture PDF — RB Perform
 * Utilise jsPDF (CDN) charge dynamiquement (meme pattern que exportPDF.js)
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

const PLAN_LABELS = { "3m": "Programme 3 Mois", "6m": "Programme 6 Mois", "12m": "Programme 12 Mois" };
const PLAN_PRICES = { "3m": 120, "6m": 110, "12m": 100 };
const PLAN_MONTHS = { "3m": 3, "6m": 6, "12m": 12 };

/**
 * Genere et telecharge une facture PDF pour un client
 * @param {Object} client — row clients (full_name, email, subscription_*)
 * @param {Object} coach — row coaches (full_name, brand_name, email)
 * @param {string} invoiceNumber — ex: "INV-2026-001"
 */
export async function generateInvoicePDF(client, coach, invoiceNumber) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 20; // marge

  // Couleurs
  const bg = [5, 5, 5];
  const cardBg = [15, 15, 15];
  const white = [255, 255, 255];
  const gray = [130, 130, 130];
  const teal = [2, 209, 186];
  const gold = [245, 200, 66];

  // Background
  doc.setFillColor(...bg);
  doc.rect(0, 0, W, H, "F");

  // ===== HEADER =====
  // Marque du coach
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.text(coach?.brand_name || "RB Perform", M, 30);

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(coach?.business_name || coach?.full_name || "", M, 37);
  doc.text(coach?.email || "", M, 42);
  if (coach?.business_address) doc.text(coach.business_address, M, 47);
  if (coach?.siret) doc.text("SIRET : " + coach.siret, M, coach?.business_address ? 52 : 47);

  // Badge FACTURE
  doc.setFillColor(...teal[0], teal[1], teal[2]);
  doc.roundedRect(W - M - 40, 22, 40, 12, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...bg);
  doc.text("FACTURE", W - M - 35, 30);

  // Numero + date
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const now = new Date();
  doc.text("N° " + (invoiceNumber || "INV-" + now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")), W - M - 50, 42);
  doc.text("Date : " + now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }), W - M - 50, 47);

  // Ligne separateur
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(M, 55, W - M, 55);

  // ===== CLIENT INFO =====
  doc.setFontSize(9);
  doc.setTextColor(...teal);
  doc.text("FACTURE A", M, 65);

  doc.setFontSize(12);
  doc.setTextColor(...white);
  doc.text(client.full_name || client.email || "Client", M, 73);

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(client.email || "", M, 79);

  // Periode
  if (client.subscription_start_date && client.subscription_end_date) {
    const start = new Date(client.subscription_start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const end = new Date(client.subscription_end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    doc.text("Periode : " + start + " → " + end, M, 85);
  }

  // ===== TABLE =====
  const tableY = 100;
  const colX = [M, M + 80, W - M - 40, W - M];

  // Header table
  doc.setFillColor(20, 20, 20);
  doc.roundedRect(M, tableY, W - 2 * M, 10, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("DESCRIPTION", colX[0] + 4, tableY + 7);
  doc.text("DUREE", colX[1] + 4, tableY + 7);
  doc.text("PRIX/MOIS", colX[2] - 10, tableY + 7);
  doc.text("TOTAL", colX[3] - 20, tableY + 7);

  // Ligne produit
  const plan = client.subscription_plan || "3m";
  const planLabel = PLAN_LABELS[plan] || "Programme coaching";
  const priceMonth = PLAN_PRICES[plan] || 120;
  const months = PLAN_MONTHS[plan] || client.subscription_duration_months || 3;
  const total = priceMonth * months;

  const rowY = tableY + 18;
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.text(planLabel, colX[0] + 4, rowY);

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(months + " mois", colX[1] + 4, rowY);
  doc.text(priceMonth + ",00 EUR", colX[2] - 10, rowY);

  doc.setTextColor(...white);
  doc.text(total + ",00 EUR", colX[3] - 25, rowY);

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
  doc.text(total + ",00 EUR", W - M - 10, totalY + 10, { align: "right" });
  doc.text("0,00 EUR", W - M - 10, totalY + 17, { align: "right" });

  // Total TTC
  doc.setFillColor(...teal);
  doc.roundedRect(W - M - 70, totalY + 24, 70, 12, 2, 2, "F");
  doc.setFontSize(10);
  doc.setTextColor(...bg);
  doc.text("TOTAL TTC", W - M - 65, totalY + 32);
  doc.text(total + ",00 EUR", W - M - 10, totalY + 32, { align: "right" });

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
  doc.text(coach?.brand_name || "RB Perform", W / 2, H - 15, { align: "center" });
  doc.text("Facture generee automatiquement", W / 2, H - 10, { align: "center" });

  // Telecharger
  const fileName = "Facture_" + (client.full_name || "client").replace(/\s+/g, "_") + "_" + now.toISOString().split("T")[0] + ".pdf";
  doc.save(fileName);
}
