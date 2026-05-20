/**
 * EditScheduleModal — éditer une échéance pending/late.
 *
 * Cas d'usage :
 *   - Reporter une échéance (étalement, geste commercial : déplace due_date)
 *   - Modifier le montant (renégociation, paiement partiel anticipé)
 *   - Ajouter une note (contexte interne)
 *
 * Ne touche pas une échéance déjà 'paid' ou 'waived' (on garde l'historique).
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";
const BORDER = "rgba(255,255,255,0.08)";

export default function EditScheduleModal({ open, schedule, onClose, onSaved }) {
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && schedule) {
      setDueDate(schedule.due_date || "");
      setAmount(String(schedule.expected_amount || ""));
      setNotes(schedule.notes || "");
    }
  }, [open, schedule]);

  if (!open || !schedule) return null;

  const valid = dueDate && parseFloat(amount) > 0;
  const changed =
    dueDate !== schedule.due_date ||
    parseFloat(amount) !== Number(schedule.expected_amount) ||
    (notes || "") !== (schedule.notes || "");

  async function save() {
    if (!valid || !changed) return;
    setSaving(true);
    haptic.light();
    try {
      const { error } = await supabase
        .from("payment_schedules")
        .update({
          due_date: dueDate,
          expected_amount: parseFloat(amount),
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedule.id);
      if (error) throw error;
      haptic.success?.();
      toast.success("Échéance mise à jour ✓");
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Erreur");
    }
    setSaving(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        background: "#0e0e0e", border: "1px solid " + BORDER, borderRadius: 18,
        maxWidth: 420, width: "100%", padding: 24,
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: G, textTransform: "uppercase", marginBottom: 5 }}>
              Modifier l'échéance
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
              Échéance {schedule.sequence_num}/{schedule.total_sequence}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid " + BORDER, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}
          >×</button>
        </div>

        <Field label="Date d'échéance">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={input} />
        </Field>

        <div style={{ marginTop: 14 }}>
          <Field label="Montant attendu (€)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={input}
              inputMode="decimal"
            />
          </Field>
        </div>

        <div style={{ marginTop: 14 }}>
          <Field label="Notes (optionnel)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : reportée à la demande du client"
              style={input}
              maxLength={200}
            />
          </Field>
        </div>

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
            disabled={!valid || !changed || saving}
            style={{
              flex: 2, padding: "12px 18px",
              background: (valid && changed) ? `linear-gradient(135deg, ${G}, #0891b2)` : "rgba(255,255,255,0.04)",
              border: "none", borderRadius: 10,
              color: (valid && changed) ? "#000" : "rgba(255,255,255,0.3)",
              fontSize: 12, fontWeight: 800,
              cursor: (valid && changed && !saving) ? "pointer" : "not-allowed",
              fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase",
              boxShadow: (valid && changed) ? "0 6px 20px rgba(2,209,186,0.25)" : "none",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Enregistrement…" : "Mettre à jour"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
      {label}
    </div>
    {children}
  </label>
);

const input = {
  width: "100%", height: 40, padding: "0 12px",
  background: "rgba(255,255,255,0.03)", border: "1px solid " + BORDER,
  borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};
