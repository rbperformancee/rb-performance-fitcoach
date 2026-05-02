import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";
const BORDER = "rgba(255,255,255,0.08)";

const PRESETS = [
  { id: "30", label: "30 jours", days: 30 },
  { id: "60", label: "60 jours", days: 60 },
  { id: "90", label: "3 mois (Méthode)", days: 90 },
  { id: "180", label: "6 mois", days: 180 },
  { id: "custom", label: "Custom", days: null },
];

const METHODS = [
  { id: "virement", label: "Virement" },
  { id: "stripe_perso", label: "Stripe perso" },
  { id: "paypal", label: "PayPal" },
  { id: "cash", label: "Espèces" },
  { id: "autre", label: "Autre" },
];

/**
 * LogPaymentModal — modal pour logger un paiement reçu d'un client.
 * Utilisée à 2 moments :
 *   1. Quand un coach assigne un programme et que la période en cours
 *      est dépassée OU pas définie pour ce client (toast skippable)
 *   2. Manuellement depuis la fiche client (bouton "Logger un paiement")
 *
 * Props :
 *   - open: bool
 *   - onClose: () => void
 *   - clientId, clientName, coachId
 *   - onSaved: (payment) => void
 *   - defaultAmount: number (300 pour Méthode, sinon 0)
 *   - defaultPeriodStart: date string (par défaut aujourd'hui)
 */
export default function LogPaymentModal({
  open,
  onClose,
  clientId,
  clientName,
  coachId,
  onSaved,
  defaultAmount = 300,
  defaultPeriodStart,
}) {
  const today = new Date().toISOString().slice(0, 10);
  const startDefault = defaultPeriodStart || today;

  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState("virement");
  const [receivedDate, setReceivedDate] = useState(today);
  const [periodStart, setPeriodStart] = useState(startDefault);
  const [periodPreset, setPeriodPreset] = useState("30");
  const [customEnd, setCustomEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset state quand le modal s'ouvre pour un nouveau client
  useEffect(() => {
    if (open) {
      setAmount(String(defaultAmount));
      setMethod("virement");
      setReceivedDate(today);
      setPeriodStart(startDefault);
      setPeriodPreset("30");
      setCustomEnd("");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultAmount]);

  if (!open) return null;

  const computedPeriodEnd = (() => {
    if (periodPreset === "custom") return customEnd;
    const preset = PRESETS.find((p) => p.id === periodPreset);
    if (!preset || !preset.days) return periodStart;
    const start = new Date(periodStart);
    start.setDate(start.getDate() + preset.days);
    return start.toISOString().slice(0, 10);
  })();

  const valid =
    parseFloat(amount) > 0 &&
    receivedDate &&
    periodStart &&
    computedPeriodEnd &&
    new Date(computedPeriodEnd) >= new Date(periodStart);

  async function save(skipDuplicateCheck = false) {
    if (!valid) return;
    setSaving(true);
    haptic.light();
    try {
      // ===== COUCHE 2 — détection de chevauchement de période =====
      // Si un paiement non-void existe pour ce client avec une période qui
      // chevauche celle qu'on enregistre, on demande confirmation au coach
      // (peut être intentionnel : paiement partiel, correction, etc.)
      if (!skipDuplicateCheck) {
        const { data: overlap } = await supabase
          .from("client_payments")
          .select("id, amount_eur, received_date, period_start, period_end")
          .eq("client_id", clientId)
          .eq("void", false)
          .lte("period_start", computedPeriodEnd)
          .gte("period_end", periodStart)
          .order("period_start", { ascending: false })
          .limit(1);
        if (Array.isArray(overlap) && overlap.length > 0) {
          const existing = overlap[0];
          const fmt = (d) => new Date(d).toLocaleDateString("fr-FR");
          const ok = window.confirm(
            `Un paiement existe déjà pour cette période :\n\n` +
            `  • ${parseFloat(existing.amount_eur).toFixed(2)} € reçu le ${fmt(existing.received_date)}\n` +
            `  • Période ${fmt(existing.period_start)} → ${fmt(existing.period_end)}\n\n` +
            `Enregistrer quand même ? (paiement complémentaire, correction…)`
          );
          if (!ok) { setSaving(false); return; }
        }
      }

      const { data, error } = await supabase
        .from("client_payments")
        .insert({
          client_id: clientId,
          coach_id: coachId,
          amount_eur: parseFloat(amount),
          payment_method: method,
          received_date: receivedDate,
          period_start: periodStart,
          period_end: computedPeriodEnd,
          notes: notes.trim() || null,
        })
        .select()
        .single();
      if (error) {
        // Couche 1 (DB) : si erreur unique sur invoice_id → déjà payé
        if (String(error.message || "").includes("payments_invoice_unique")) {
          toast.error("Cette facture a déjà un paiement enregistré");
        } else {
          throw error;
        }
        setSaving(false);
        return;
      }
      haptic.success?.();
      toast.success(`Paiement de ${parseFloat(amount).toFixed(2)} € enregistré ✓`);
      onSaved?.(data);
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Erreur enregistrement");
    }
    setSaving(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          background: "#0e0e0e", border: "1px solid " + BORDER, borderRadius: 18,
          maxWidth: 480, width: "100%", padding: 24,
          fontFamily: "-apple-system,'Inter',sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 5 }}>
              Logger un paiement
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
              {clientName ? `Paiement de ${clientName}` : "Nouveau paiement"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid " + BORDER, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}
          >×</button>
        </div>

        {/* Montant + Méthode */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <Field label="Montant (€)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={input}
              inputMode="decimal"
              autoFocus
            />
          </Field>
          <Field label="Méthode">
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={input}>
              {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
        </div>

        {/* Date reçue */}
        <Field label="Date reçue">
          <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} style={input} />
        </Field>

        {/* Période couverte */}
        <div style={{ marginTop: 16 }}>
          <div style={subtitle}>Période couverte par ce paiement</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodPreset(p.id)}
                style={{
                  padding: "7px 12px",
                  background: periodPreset === p.id ? `${G}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${periodPreset === p.id ? `${G}55` : BORDER}`,
                  borderRadius: 100,
                  color: periodPreset === p.id ? G : "rgba(255,255,255,0.6)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: 0.3,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Début">
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={input} />
            </Field>
            <Field label={periodPreset === "custom" ? "Fin (custom)" : "Fin (auto)"}>
              <input
                type="date"
                value={periodPreset === "custom" ? customEnd : computedPeriodEnd}
                onChange={(e) => { if (periodPreset === "custom") setCustomEnd(e.target.value); }}
                disabled={periodPreset !== "custom"}
                style={{ ...input, opacity: periodPreset === "custom" ? 1 : 0.6 }}
              />
            </Field>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: 16 }}>
          <Field label="Notes (optionnel)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : virement reçu vendredi, mention OK"
              style={input}
              maxLength={200}
            />
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: "12px 18px", background: "transparent",
              border: "1px solid " + BORDER, borderRadius: 10, color: "rgba(255,255,255,0.6)",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: 0.5, textTransform: "uppercase",
            }}
          >Annuler</button>
          <button
            type="button"
            onClick={save}
            disabled={!valid || saving}
            style={{
              flex: 2, padding: "12px 18px",
              background: valid ? `linear-gradient(135deg, ${G}, #0891b2)` : "rgba(255,255,255,0.04)",
              border: "none", borderRadius: 10, color: valid ? "#000" : "rgba(255,255,255,0.3)",
              fontSize: 12, fontWeight: 800, cursor: valid && !saving ? "pointer" : "not-allowed",
              fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase",
              boxShadow: valid ? "0 6px 20px rgba(2,209,186,0.25)" : "none",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer le paiement"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <div style={subtitle}>{label}</div>
    {children}
  </label>
);

const subtitle = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
  color: "rgba(255,255,255,0.4)", marginBottom: 6,
};

const input = {
  width: "100%", height: 40, padding: "0 12px",
  background: "rgba(255,255,255,0.03)", border: "1px solid " + BORDER,
  borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

/**
 * Helper exporté : vérifie si un client a besoin d'un nouveau paiement.
 * Retourne :
 *   { needs: true,  reason: 'undefined' }  → aucun paiement loggé
 *   { needs: true,  reason: 'expired', periodEnd } → période dépassée
 *   { needs: false }                       → période en cours, OK
 */
export async function checkPaymentNeeded(clientId) {
  try {
    const { data, error } = await supabase
      .from("client_payments")
      .select("period_end")
      .eq("client_id", clientId)
      .eq("void", false)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { needs: true, reason: "undefined" };
    const today = new Date().toISOString().slice(0, 10);
    if (data.period_end < today) return { needs: true, reason: "expired", periodEnd: data.period_end };
    return { needs: false, periodEnd: data.period_end };
  } catch (e) {
    console.warn("[checkPaymentNeeded]", e);
    return { needs: false }; // Fail-safe : pas de prompt si on peut pas check
  }
}
