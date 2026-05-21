/**
 * Système de stockage des factures + reçus.
 *
 * Architecture :
 *   1. validateInvoiceConfig(coach)  → retourne { valid, missing }
 *      Vérifie que le coach a toutes les infos légales pour émettre une facture.
 *   2. emitInvoice({...})            → numéro RPC + insert DB + upload PDF
 *      Émet une facture maître (1 par contrat).
 *   3. emitReceipt({...})            → numéro RPC + insert DB + upload PDF
 *      Émet un reçu (1 par paiement encaissé).
 *   4. getInvoiceSignedUrl(pdfUrl)   → signed URL temporaire pour lecture
 *      Le bucket est privé : on génère un lien valable 1h.
 *
 * Pourquoi côté client :
 *   - invoicePDF.js utilise jsPDF (canvas) — pas dispo côté Node sans
 *     dépendances lourdes (puppeteer). Génération client + upload = simple.
 *   - Le coach voit la facture immédiatement (download direct du blob).
 */

import { supabase } from "./supabase";

// Champs obligatoires sur le coach pour une facture légalement valide en France.
const REQUIRED_INVOICE_FIELDS = [
  { key: "brand_name", label: "Nom commercial" },
  { key: "business_name", label: "Raison sociale" },
  { key: "legal_form", label: "Forme juridique" },
  { key: "business_address", label: "Adresse" },
  { key: "siret", label: "SIRET" },
];

/**
 * Vérifie qu'un coach a la config minimale pour émettre une facture.
 * @returns {{valid: boolean, missing: Array<{key, label}>}}
 */
export function validateInvoiceConfig(coach) {
  if (!coach) return { valid: false, missing: REQUIRED_INVOICE_FIELDS };
  const missing = REQUIRED_INVOICE_FIELDS.filter(
    (f) => !coach[f.key] || String(coach[f.key]).trim() === ""
  );
  return { valid: missing.length === 0, missing };
}

/**
 * Récupère le prochain numéro de facture (atomique côté DB).
 * Format : INV-YYYY-NNNN.
 */
export async function nextInvoiceNumber(coachId) {
  const { data, error } = await supabase.rpc("next_invoice_number", {
    p_coach_id: coachId,
  });
  if (error) throw new Error(`next_invoice_number: ${error.message}`);
  return data; // ex: "INV-2026-0001"
}

/**
 * Récupère le prochain numéro de reçu (atomique).
 * Format : REC-YYYY-NNNN.
 */
export async function nextReceiptNumber(coachId) {
  const { data, error } = await supabase.rpc("next_receipt_number", {
    p_coach_id: coachId,
  });
  if (error) throw new Error(`next_receipt_number: ${error.message}`);
  return data;
}

/**
 * Upload un PDF dans le bucket privé coach-invoices.
 * Chemin imposé par les RLS : `{coach_id}/{filename}`.
 *
 * @param {string} coachId
 * @param {string} filename — sans le dossier, ex: "INV-2026-0001.pdf"
 * @param {Blob} pdfBlob
 * @returns {Promise<string>} path complet dans le bucket
 */
export async function uploadInvoicePdf(coachId, filename, pdfBlob) {
  const path = `${coachId}/${filename}`;
  const { error } = await supabase.storage
    .from("coach-invoices")
    .upload(path, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw new Error(`upload: ${error.message}`);
  return path;
}

/**
 * Génère une signed URL pour lire un PDF stocké (valide 1h).
 * Le bucket étant privé, c'est obligatoire pour exposer un lien.
 *
 * @param {string} path — chemin retourné par uploadInvoicePdf
 * @returns {Promise<string>} signed URL
 */
export async function getInvoiceSignedUrl(path, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("coach-invoices")
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.warn("[invoiceStorage] signed url error:", error.message);
    return null;
  }
  return data?.signedUrl || null;
}

/**
 * Émet une facture maître pour un contrat (1 par signature de plan).
 *
 * Steps :
 *   1. Récupère un numéro atomique via RPC
 *   2. Insert row dans `invoices`
 *   3. Génère le PDF via generateInvoicePDF (déjà existant), récupère le blob
 *   4. Upload le PDF dans coach-invoices/{coach_id}/{number}.pdf
 *   5. Update invoices.pdf_url avec le path
 *
 * @returns {Promise<{ok, invoice?, error?}>}
 */
export async function emitInvoice({
  coachId,
  client,         // row clients enrichi avec _plan_price etc.
  coach,          // row coaches complet
  amount,         // total HT/TTC (TVA non applicable en franchise)
  duration_months,
  price_per_month,
  installments_count = 1,
  installment_amount = null,
  description = null,
  payment_id = null,
  payment_schedule_id = null,
  notes = null,
}) {
  try {
    // 1. Numéro atomique
    const invoice_number = await nextInvoiceNumber(coachId);

    // 2. Insert facture (sans pdf_url pour l'instant)
    const { data: invoiceRow, error: insertErr } = await supabase
      .from("invoices")
      .insert({
        coach_id: coachId,
        client_id: client.id,
        client_name: client.full_name || null,
        client_email: client.email || null,
        invoice_number,
        description,
        amount,
        duration_months,
        price_per_month,
        tva_applicable: coach?.tva_status === "applicable",
        tva_rate: 0,
        tva_amount: 0,
        total_ttc: amount,
        status: "issued",
        installments_count,
        installment_amount,
        payment_schedule_id,
        notes,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // 3. Génère le PDF via le template existant
    //    On import dynamiquement pour éviter le coût de jsPDF si pas utilisé
    const { generateInvoicePDFBlob } = await import("../utils/invoicePDF");
    const pdfBlob = await generateInvoicePDFBlob(client, coach, invoice_number, {
      installments_count,
      installment_amount,
    });

    // 4. Upload
    const path = await uploadInvoicePdf(coachId, `${invoice_number}.pdf`, pdfBlob);

    // 5. Update invoice avec le path
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({ pdf_url: path })
      .eq("id", invoiceRow.id);
    if (updateErr) {
      console.warn("[emitInvoice] update pdf_url failed:", updateErr.message);
    }

    return { ok: true, invoice: { ...invoiceRow, pdf_url: path } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Émet un reçu pour un paiement encaissé.
 *
 * Steps :
 *   1. Récupère un numéro REC atomique
 *   2. Insert row dans `receipts`
 *   3. Génère le PDF reçu (template léger)
 *   4. Upload + update receipt.pdf_url
 *
 * @returns {Promise<{ok, receipt?, error?}>}
 */
export async function emitReceipt({
  coachId,
  client,
  coach,
  amount_eur,
  payment_method = "virement",
  payment_id = null,
  invoice_id = null,
  schedule_id = null,
  paid_at = null,
  notes = null,
}) {
  try {
    const receipt_number = await nextReceiptNumber(coachId);

    // On a besoin du numéro de facture parente pour le contexte du reçu.
    let parentInvoice = null;
    if (invoice_id) {
      const { data } = await supabase
        .from("invoices")
        .select("invoice_number, amount, installments_count")
        .eq("id", invoice_id)
        .maybeSingle();
      parentInvoice = data;
    }

    const { data: receiptRow, error: insertErr } = await supabase
      .from("receipts")
      .insert({
        coach_id: coachId,
        client_id: client.id,
        invoice_id,
        payment_id,
        schedule_id,
        receipt_number,
        amount_eur,
        paid_at: paid_at || new Date().toISOString(),
        payment_method,
        notes,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Génération PDF reçu
    const { generateReceiptPDFBlob } = await import("../utils/receiptPDF");
    const pdfBlob = await generateReceiptPDFBlob(
      client, coach, receipt_number,
      {
        amount: amount_eur,
        payment_method,
        paid_at: receiptRow.paid_at,
        parent_invoice: parentInvoice,
      }
    );

    const path = await uploadInvoicePdf(coachId, `${receipt_number}.pdf`, pdfBlob);

    await supabase.from("receipts").update({ pdf_url: path }).eq("id", receiptRow.id);

    return { ok: true, receipt: { ...receiptRow, pdf_url: path } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
