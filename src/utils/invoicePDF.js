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

// Format montant francais : 360,00 EUR
function fmtEur(n) {
  return n.toFixed(2).replace('.', ',') + ' EUR';
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
 * @param {Object} [opts] — { installments_count, installment_amount, due_date }
 */
export async function generateInvoicePDF(client, coach, invoiceNumber, opts = {}) {
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
  const rawLabel = client._plan_name || client.description || client.subscription_plan || PLAN_LABELS_LEGACY[plan];
  const planLabel = (rawLabel && rawLabel !== "—" && rawLabel.trim()) ? rawLabel : "Programme coaching";
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
  const legalFormLabel = (() => {
    const lf = coach?.legal_form;
    if (!lf) return "";
    if (lf === "auto-entrepreneur") return "Auto-entrepreneur (EI)";
    if (lf === "EI") return "Entreprise individuelle (EI)";
    return lf; // EURL, SASU, SAS, SARL, autre
  })();
  const rcsLine = (coach?.rcs_city && coach?.rcs_number)
    ? `RCS ${coach.rcs_city} ${coach.rcs_number}`
    : "";
  const capitalLine = coach?.capital_social
    ? `Capital social : ${Number(coach.capital_social).toLocaleString("fr-FR")} EUR`
    : "";
  const coachLines = [
    coach?.business_name || coach?.full_name || "",
    legalFormLabel,
    coach?.business_address || "",
    coach?.siret ? "SIRET : " + coach.siret : "",
    rcsLine,
    capitalLine,
    coach?.vat_number ? "TVA intracom. : " + coach.vat_number : "",
    coach?.email || "",
  ].filter(Boolean);
  const lineH = 4.2;
  coachLines.forEach((line, i) => doc.text(line, M, 37 + i * lineH));
  const coachBottomY = 37 + coachLines.length * lineH;

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

  // Separateur — positionne sous le bloc coach
  const sepY = Math.max(60, coachBottomY + 4);
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(M, sepY, W - M, sepY);

  // ===== CLIENT INFO =====
  let clientY = sepY + 10;
  doc.setFontSize(9);
  doc.setTextColor(teal[0], teal[1], teal[2]);
  doc.text("FACTURE A", M, clientY);
  clientY += 8;

  doc.setFontSize(12);
  doc.setTextColor(...white);
  doc.text(client.full_name || client.email || "Client", M, clientY);
  clientY += 6;

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  if (client.email)   { doc.text(client.email,   M, clientY); clientY += 5; }
  if (client.address) { doc.text(client.address, M, clientY); clientY += 5; }

  // Periode (date de prestation)
  if (client.subscription_start_date && client.subscription_end_date) {
    const fmt = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    doc.text("Periode : " + fmt(client.subscription_start_date) + " - " + fmt(client.subscription_end_date), M, clientY);
    clientY += 5;
  }

  // ===== TABLE =====
  const tableY = Math.max(105, clientY + 8);

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
  doc.text(fmtEur(priceMonth), W - M - 55, rowY);

  doc.setTextColor(...white);
  doc.text(fmtEur(total), W - M - 25, rowY);

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
  doc.text(fmtEur(total), W - M - 10, totalY + 10, { align: "right" });
  doc.text("0,00 EUR", W - M - 10, totalY + 17, { align: "right" });

  // Total TTC
  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.roundedRect(W - M - 70, totalY + 24, 70, 12, 2, 2, "F");
  doc.setFontSize(10);
  doc.setTextColor(...bg);
  doc.text("TOTAL TTC", W - M - 65, totalY + 32);
  doc.text(fmtEur(total), W - M - 10, totalY + 32, { align: "right" });

  // ===== ECHEANCIER (paiement en X fois) =====
  let mentionsStartY = totalY + 55;
  const installmentsCount = Number(opts?.installments_count) || 1;
  const installmentAmount = Number(opts?.installment_amount) || 0;
  if (installmentsCount > 1 && installmentAmount > 0) {
    const schedY = totalY + 45;
    doc.setFontSize(8);
    doc.setTextColor(teal[0], teal[1], teal[2]);
    doc.text("ECHEANCIER DE PAIEMENT", M, schedY);
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    const baseDate = new Date();
    for (let i = 0; i < installmentsCount; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      const label = `${i + 1}/${installmentsCount}  ·  ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
      doc.text(label, M, schedY + 6 + i * 4.5);
      doc.text(fmtEur(installmentAmount), W - M - 5, schedY + 6 + i * 4.5, { align: "right" });
    }
    mentionsStartY = schedY + 10 + installmentsCount * 4.5;
  }

  // ===== MENTIONS LEGALES =====
  const legalY = mentionsStartY;
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const tvaText = coach?.tva_status === "applicable" ? "TVA applicable" : "TVA non applicable - art. 293 B du CGI";
  let ly = legalY;
  doc.text(tvaText, M, ly); ly += 4;

  // Date d'echeance (a reception par defaut, ou date specifique)
  const dueDateText = opts?.due_date
    ? "Echeance : " + new Date(opts.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : (installmentsCount > 1
       ? "Echeances : voir echeancier ci-dessus"
       : "Echeance : a reception de la facture");
  doc.text(dueDateText, M, ly); ly += 4;

  doc.text("Penalites de retard : 3 fois le taux d'interet legal en vigueur", M, ly); ly += 4;
  doc.text("Indemnite forfaitaire de recouvrement : 40 EUR (art. L.441-10 C. com.)", M, ly); ly += 4;
  doc.text("Pas d'escompte en cas de paiement anticipe", M, ly);

  // ===== FOOTER =====
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(coach?.brand_name || coach?.coaching_name || "RB Perform", W / 2, H - 15, { align: "center" });
  doc.text("Facture generee automatiquement", W / 2, H - 10, { align: "center" });

  // Telecharger via blob + anchor (force download sur desktop ;
  // sur iOS Safari le PDF s'ouvre quand meme en preview — limitation OS).
  const safeName = (client.full_name || "client").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = "Facture_" + safeName + "_" + now.toISOString().split("T")[0] + ".pdf";
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
