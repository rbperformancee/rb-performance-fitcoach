/**
 * Generateur de reçu (acquit de paiement) PDF — standard comptable français.
 *
 * Le reçu est un document PLUS LÉGER que la facture, qui prouve l'encaissement
 * d'une somme. Il ne remplace pas la facture maître (elle reste la pièce
 * principale opposable), il l'accompagne.
 *
 * Design : aligné sur invoicePDF.js (fond blanc, accent teal subtil).
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

function fmtEur(n) {
  return n.toFixed(2).replace(".", ",") + " EUR";
}

const METHOD_LABELS = {
  virement: "Virement bancaire",
  stripe_perso: "Carte bancaire (Stripe)",
  paypal: "PayPal",
  cash: "Espèces",
  autre: "Autre",
};

/**
 * Construit le doc PDF en interne (réutilisable pour download OU upload).
 */
async function buildReceiptPdfDoc(client, coach, receiptNumber, opts = {}) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 20;

  const ink = [20, 20, 20];
  const gray = [110, 110, 110];
  const lightGray = [160, 160, 160];
  const divider = [220, 220, 220];
  const teal = [2, 209, 186];
  const tealDark = [9, 168, 154];

  // Filet teal en haut
  doc.setFillColor(...teal);
  doc.rect(0, 0, W, 3, "F");

  // ===== HEADER COACH (gauche) =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...ink);
  const brandName = coach?.brand_name || coach?.coaching_name || coach?.full_name || "Coach";
  doc.text(brandName, M, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const legalFormLabel = (() => {
    const lf = coach?.legal_form;
    if (!lf) return "";
    if (lf === "auto-entrepreneur") return "Auto-entrepreneur (EI)";
    if (lf === "EI") return "Entreprise individuelle (EI)";
    return lf;
  })();
  const coachLines = [
    coach?.business_name || coach?.full_name || "",
    legalFormLabel,
    coach?.business_address || "",
    coach?.siret ? "SIRET : " + coach.siret : "",
    coach?.email || "",
  ].filter(Boolean);
  const lineH = 4.2;
  coachLines.forEach((line, i) => doc.text(line, M, 30 + i * lineH));
  const coachBottomY = 30 + coachLines.length * lineH;

  // ===== BADGE REÇU (droite) — gris pour différencier de FACTURE en teal =====
  doc.setFillColor(...gray);
  doc.roundedRect(W - M - 36, 15, 36, 11, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("REÇU", W - M - 27, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text("N° " + receiptNumber, W - M - 50, 33);

  const paidAt = opts.paid_at ? new Date(opts.paid_at) : new Date();
  doc.text(
    "Date : " + paidAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    W - M - 50, 38
  );

  // Séparateur
  const sepY = Math.max(60, coachBottomY + 4);
  doc.setDrawColor(...divider);
  doc.setLineWidth(0.3);
  doc.line(M, sepY, W - M, sepY);

  // ===== CLIENT =====
  let clientY = sepY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...tealDark);
  doc.text("REÇU DE", M, clientY);
  clientY += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ink);
  doc.text(client.full_name || client.email || "Client", M, clientY);
  clientY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  if (client.email) { doc.text(client.email, M, clientY); clientY += 5; }

  // ===== CORPS DU REÇU =====
  const bodyY = Math.max(105, clientY + 14);
  const amount = Number(opts.amount || 0);
  const methodLabel = METHOD_LABELS[opts.payment_method] || opts.payment_method || "—";

  // Phrase d'attestation
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text(
    `Reçu la somme de ${fmtEur(amount)} le ${paidAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })},`,
    M, bodyY
  );
  doc.text(`payée par ${methodLabel.toLowerCase()},`, M, bodyY + 7);
  doc.text(`de ${client.full_name || "le client mentionné ci-dessus"},`, M, bodyY + 14);

  // Référence facture parente
  if (opts.parent_invoice?.invoice_number) {
    doc.setTextColor(...gray);
    doc.setFontSize(10);
    let refText = `en règlement de la facture ${opts.parent_invoice.invoice_number}`;
    if (opts.parent_invoice.installments_count > 1) {
      refText += ` (échéance ${opts.parent_invoice.installments_count > 1 ? "" : ""}).`;
    } else {
      refText += ".";
    }
    doc.text(refText, M, bodyY + 21);
  }

  // ===== MONTANT MIS EN VALEUR =====
  const sumY = bodyY + 40;
  doc.setFillColor(...teal);
  doc.roundedRect(M, sumY, W - 2 * M, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("MONTANT REÇU", M + 8, sumY + 9);
  doc.setFontSize(18);
  doc.text(fmtEur(amount), W - M - 8, sumY + 14, { align: "right" });

  // ===== Signature / mentions =====
  const mentionsY = sumY + 36;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("Pour servir et valoir ce que de droit.", M, mentionsY);

  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text(
    "Ce reçu atteste de l'encaissement de la somme indiquée. Il ne se substitue pas à la facture qui demeure la pièce comptable principale.",
    M, mentionsY + 6, { maxWidth: W - 2 * M }
  );

  // Filet teal en bas
  doc.setFillColor(...teal);
  doc.rect(0, H - 8, W, 1, "F");

  doc.setFontSize(7.5);
  doc.setTextColor(...lightGray);
  doc.text(brandName, W / 2, H - 4, { align: "center" });

  const safeName = (client.full_name || "client").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = "Recu_" + safeName + "_" + paidAt.toISOString().split("T")[0] + ".pdf";
  return { doc, filename };
}

/**
 * Génère un reçu et déclenche le téléchargement direct.
 */
export async function generateReceiptPDF(client, coach, receiptNumber, opts = {}) {
  const { doc, filename } = await buildReceiptPdfDoc(client, coach, receiptNumber, opts);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Génère un reçu et retourne le Blob (pour upload dans Supabase Storage).
 */
export async function generateReceiptPDFBlob(client, coach, receiptNumber, opts = {}) {
  const { doc } = await buildReceiptPdfDoc(client, coach, receiptNumber, opts);
  return doc.output("blob");
}
