import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import { generateInvoicePDF } from "../../utils/invoicePDF";

const G = "#02d1ba";

/**
 * InvoiceModal — creation de facture premium.
 * Le coach choisit le client, le montant, la description, la TVA.
 * Genere un PDF telecharge + sauvegarde en DB.
 */
export default function InvoiceModal({ coachData, clients = [], onClose }) {
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [description, setDescription] = useState("Programme coaching");
  const [amount, setAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [installments, setInstallments] = useState(1);
  const [tvaApplicable, setTvaApplicable] = useState(false);
  const [tvaRate, setTvaRate] = useState(20);
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-generate invoice number
  useEffect(() => {
    if (!coachData?.id) return;
    supabase.rpc("next_invoice_number", { cid: coachData.id })
      .then(({ data }) => { if (data) setInvoiceNumber(data); })
      .catch(() => {
        const d = new Date();
        setInvoiceNumber("FAC-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"));
      });
  }, [coachData?.id]);

  // Auto-fill when client selected
  const handleClientChange = (id) => {
    setClientId(id);
    if (id) {
      const c = clients.find(cl => cl.id === id);
      if (c) {
        setClientName(c.full_name || "");
        setClientEmail(c.email || "");
        if (c._plan_price) setAmount(String(c._plan_price * (c._plan_duration || 1)));
        if (c._plan_name) setDescription(c._plan_name);
        setDurationMonths(c._plan_duration && c._plan_duration > 0 ? c._plan_duration : "");
      }
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const tvaAmount = tvaApplicable ? Math.round(amountNum * (tvaRate / 100) * 100) / 100 : 0;
  const totalTTC = Math.round((amountNum + tvaAmount) * 100) / 100;

  const handleGenerate = async () => {
    if (!clientName.trim() || amountNum <= 0) {
      toast.error("Remplis le nom du client et le montant.");
      return;
    }
    setSaving(true);

    // Save to DB
    const dur = typeof durationMonths === "number" && durationMonths > 0 ? durationMonths : null;
    const invoiceData = {
      coach_id: coachData.id,
      client_id: clientId || null,
      invoice_number: invoiceNumber,
      client_name: clientName.trim(),
      client_email: clientEmail.trim() || null,
      description: description.trim(),
      amount: amountNum,
      duration_months: dur,
      price_per_month: dur ? Math.round(amountNum / dur * 100) / 100 : amountNum,
      tva_applicable: tvaApplicable,
      tva_rate: tvaApplicable ? tvaRate : 0,
      tva_amount: tvaAmount,
      total_ttc: totalTTC,
      installments_count: installments,
      installment_amount: installments > 1 ? Math.round((totalTTC / installments) * 100) / 100 : null,
      notes: notes.trim() || null,
      status: "draft",
    };

    const { error } = await supabase.from("invoices").insert(invoiceData).select();
    if (error && !error.message?.includes("0 rows") && error.code !== "PGRST116") {
      toast.error("Erreur sauvegarde : " + error.message);
      setSaving(false);
      return;
    }

    // Generate PDF
    const durForPdf = dur || 1;
    const fakeClient = {
      full_name: clientName,
      email: clientEmail,
      address: clientAddress,
      _plan_name: description,
      _plan_price: dur ? amountNum / dur : amountNum,
      _plan_duration: dur,
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: new Date(Date.now() + durForPdf * 30 * 86400000).toISOString(),
    };

    try {
      await generateInvoicePDF(fakeClient, { ...coachData, tva_status: tvaApplicable ? "applicable" : "non_applicable" }, invoiceNumber);
      toast.success("Facture " + invoiceNumber + " generee");
      onClose();
    } catch (e) {
      console.error("Invoice PDF generation failed", e);
      toast.error("Erreur generation PDF : " + (e?.message || "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>

        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18 }}>×</button>

        {/* Header */}
        <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Nouvelle facture</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 4 }}>
          {invoiceNumber}<span style={{ color: G }}>.</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 24 }}>
          {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </div>

        {/* Client */}
        <Label text="Client" />
        <select value={clientId} onChange={e => handleClientChange(e.target.value)} style={selectStyle}>
          <option value="">Choisir un client ou saisir manuellement</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
        </select>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <Label text="Nom sur la facture" />
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Prenom Nom" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <Label text="Email" />
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="email@client.com" style={inputStyle} />
          </div>
        </div>

        <Label text="Adresse du client" />
        <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="12 rue de la Paix, 75002 Paris" style={inputStyle} />

        {/* Description */}
        <Label text="Description" />
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Programme coaching 3 mois" style={inputStyle} />

        {/* Montant + Duree */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Label text="Montant HT (EUR)" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="360" inputMode="numeric" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <Label text="Duree (mois) — optionnel" />
            <input
              type="number"
              value={durationMonths}
              onChange={e => {
                const v = e.target.value;
                if (v === "") { setDurationMonths(""); return; }
                const n = parseInt(v, 10);
                setDurationMonths(Number.isFinite(n) && n > 0 ? n : "");
              }}
              min="1"
              placeholder="Laisser vide si one-shot"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Paiement en X fois */}
        <Label text="Paiement en combien de fois" />
        <select
          value={installments}
          onChange={e => setInstallments(parseInt(e.target.value, 10) || 1)}
          style={selectStyle}
        >
          <option value={1}>Paiement comptant (1x)</option>
          <option value={2}>2 fois</option>
          <option value={3}>3 fois</option>
          <option value={4}>4 fois</option>
          <option value={6}>6 fois</option>
          <option value={10}>10 fois</option>
          <option value={12}>12 fois</option>
        </select>

        {/* TVA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
          <button onClick={() => setTvaApplicable(!tvaApplicable)} style={{
            width: 40, height: 22, borderRadius: 100,
            background: tvaApplicable ? G : "rgba(255,255,255,0.1)",
            border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}>
            <div style={{ position: "absolute", top: 2, left: tvaApplicable ? 20 : 2, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>TVA applicable</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{tvaApplicable ? `${tvaRate}% — ${tvaAmount.toFixed(2)} EUR` : "Non applicable (art. 293 B du CGI)"}</div>
          </div>
          {tvaApplicable && (
            <input type="number" value={tvaRate} onChange={e => setTvaRate(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: 60, textAlign: "center" }} />
          )}
        </div>

        {/* Notes */}
        <Label text="Notes (optionnel)" />
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Paiement par virement..." style={inputStyle} />

        {/* Recap */}
        <div style={{ marginTop: 20, padding: "16px 18px", background: "rgba(2,209,186,0.04)", border: `1px solid rgba(2,209,186,0.15)`, borderRadius: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            <span>Sous-total HT</span>
            <span>{amountNum.toFixed(2)} EUR</span>
          </div>
          {tvaApplicable && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
              <span>TVA ({tvaRate}%)</span>
              <span>{tvaAmount.toFixed(2)} EUR</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: G, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span>Total TTC</span>
            <span>{totalTTC.toFixed(2)} EUR</span>
          </div>
          {typeof durationMonths === "number" && durationMonths > 1 && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4, textAlign: "right" }}>
              soit {(amountNum / durationMonths).toFixed(2)} EUR/mois x {durationMonths} mois
            </div>
          )}
          {installments > 1 && (
            <div style={{ fontSize: 11, color: G, marginTop: 6, textAlign: "right", fontWeight: 600 }}>
              Paiement en {installments}x de {(totalTTC / installments).toFixed(2)} EUR
            </div>
          )}
        </div>

        {/* CTA */}
        <button onClick={handleGenerate} disabled={saving || !clientName.trim() || amountNum <= 0} style={{
          width: "100%", marginTop: 20, padding: 16,
          background: (!clientName.trim() || amountNum <= 0 || saving) ? "rgba(255,255,255,0.04)" : G,
          color: (!clientName.trim() || amountNum <= 0 || saving) ? "rgba(255,255,255,0.25)" : "#000",
          border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800,
          cursor: (!clientName.trim() || amountNum <= 0 || saving) ? "not-allowed" : "pointer",
          fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.5px",
          boxShadow: (!clientName.trim() || amountNum <= 0 || saving) ? "none" : `0 8px 24px rgba(2,209,186,0.3)`,
        }}>
          {saving ? "Generation..." : "Generer la facture PDF"}
        </button>
      </div>
    </div>
  );
}

function Label({ text }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginTop: 14, marginBottom: 6 }}>{text}</div>;
}

const inputStyle = {
  width: "100%", padding: "12px 14px",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: 36,
};
