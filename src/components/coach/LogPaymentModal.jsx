import React, { useState, useEffect } from "react";
import { useT, t as tStatic, getDateLocale } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { generateSchedules, addMonths } from "../../lib/paymentSchedules";

import { todayLocal } from "../../lib/date";
const G = "#02d1ba";
const BORDER = "rgba(255,255,255,0.08)";

const PRESETS = [
  { id: "30", label: "30 jours", days: 30 },
  { id: "60", label: "60 jours", days: 60 },
  { id: "90", label: "3 mois (Méthode)", days: 90 },
  { id: "180", label: "6 mois", days: 180 },
  { id: "custom", label: "Custom", days: null },
];

// Factory evaluée au render pour suivre la locale courante.
const getMethods = () => [
  { id: "virement", label: tStatic("lpm.method_transfer", "Virement") },
  { id: "stripe_perso", label: tStatic("lpm.method_stripe_perso", "Stripe perso") },
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
  const t = useT();
  const today = todayLocal();
  const startDefault = defaultPeriodStart || today;

  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState("virement");
  const [receivedDate, setReceivedDate] = useState(today);
  const [periodStart, setPeriodStart] = useState(startDefault);
  const [periodPreset, setPeriodPreset] = useState("30");
  const [customEnd, setCustomEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ===== Mode "plan en plusieurs fois" =====
  // OFF par défaut : comportement identique au modal historique.
  // ON : on planifie N échéances mensuelles ; la 1ère = ce paiement, les N-1
  //      autres deviennent des lignes payment_schedules pending.
  const [installmentMode, setInstallmentMode] = useState(false);
  const [totalPlanAmount, setTotalPlanAmount] = useState("");
  const [nInstallments, setNInstallments] = useState(3);

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
      setInstallmentMode(false);
      setTotalPlanAmount("");
      setNInstallments(3);
    }
  }, [open, defaultAmount, today, startDefault]);

  if (!open) return null;

  const computedPeriodEnd = (() => {
    if (periodPreset === "custom") return customEnd;
    const preset = PRESETS.find((p) => p.id === periodPreset);
    if (!preset || !preset.days) return periodStart;
    const start = new Date(periodStart);
    start.setDate(start.getDate() + preset.days);
    return start.toISOString().slice(0, 10);
  })();

  // Montant par échéance + dernière date (prévisualisation)
  const installmentAmount = installmentMode && nInstallments > 0
    ? Math.round((parseFloat(totalPlanAmount) / nInstallments) * 100) / 100
    : 0;
  const lastDueDate = installmentMode && nInstallments > 1
    ? addMonths(receivedDate, nInstallments - 1)
    : null;

  const valid =
    parseFloat(amount) > 0 &&
    receivedDate &&
    periodStart &&
    computedPeriodEnd &&
    new Date(computedPeriodEnd) >= new Date(periodStart) &&
    (!installmentMode || (parseFloat(totalPlanAmount) > 0 && nInstallments >= 2));

  // Guard `=== true` : protège contre le cas où `onClick={save}` passe le
  // SyntheticEvent React comme premier arg. Sans ce guard, l'event (truthy)
  // serait traité comme skipDuplicateCheck = true et bypasserait la couche 2
  // de détection de chevauchement de paiement à chaque clic — risque de
  // double-comptage silencieux. Voir aussi la même classe de bug dans
  // LoginScreen.jsx (sendOTP).
  async function save(skipDuplicateCheckArg = false) {
    const skipDuplicateCheck = skipDuplicateCheckArg === true;
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
          const fmt = (d) => new Date(d).toLocaleDateString(getDateLocale());
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
          toast.error(t("lpm.err_invoice_paid", "Cette facture a déjà un paiement enregistré"));
        } else {
          throw error;
        }
        setSaving(false);
        return;
      }
      haptic.success?.();

      // ===== Mode "plan en plusieurs fois" : crée les échéances futures =====
      // Best-effort : si la création des schedules échoue, on garde le paiement
      // (déjà inséré) et on prévient le coach. Pas de rollback complexe.
      if (installmentMode && parseFloat(totalPlanAmount) > 0 && nInstallments >= 2) {
        const res = await generateSchedules({
          coachId,
          clientId,
          totalAmount: parseFloat(totalPlanAmount),
          nInstallments,
          firstPaymentDate: receivedDate,
          firstPaymentId: data.id,
          firstPaidAmount: parseFloat(amount),
        });
        if (!res.ok) {
          toast.error(
            `Paiement enregistré, mais impossible de planifier les échéances : ${res.error || "erreur inconnue"}. Réessaye depuis Comptes à recevoir.`
          );
        } else {
          toast.success(
            `Paiement enregistré ✓ — ${nInstallments - 1} échéance${nInstallments - 1 > 1 ? "s" : ""} planifiée${nInstallments - 1 > 1 ? "s" : ""}`
          );
        }
      } else {
        toast.success(`Paiement de ${parseFloat(amount).toFixed(2)} € enregistré ✓`);
      }
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
            aria-label={t("lpm.fermer", "Fermer")}
            style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid " + BORDER, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16 }}
          >×</button>
        </div>

        {/* Teaser roadmap : Stripe Connect arrive, finir le log manuel */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 16,
          background: `${G}10`, border: `1px solid ${G}33`, borderRadius: 10,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `${G}1f`, border: `1px solid ${G}44`, display: "flex", alignItems: "center", justifyContent: "center", color: G }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 11, lineHeight: 1.45, color: "rgba(255,255,255,0.55)" }}>
            <strong style={{ color: G, fontWeight: 800, letterSpacing: 0.5 }}>{t("lpm.soon", "Bientôt")}</strong>
            {" · "}intégration Stripe Connect (Q3 2026) — paiements clients automatiques, fini le log manuel.
          </div>
        </div>

        {/* Type d'engagement : 1x vs plan multi-échéances */}
        <div style={{ marginBottom: 16 }}>
          <div style={subtitle}>{t("lpm.engagement_type", "Type d'engagement")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { id: false, label: t("lpm.single_payment", "Paiement unique"), hint: t("lpm.single_payment_hint", "1 paiement, période simple") },
              { id: true, label: t("lpm.plan_payments", "Plan en plusieurs fois"), hint: t("lpm.plan_payments_hint", "N échéances planifiées") },
            ].map((opt) => {
              const active = installmentMode === opt.id;
              return (
                <button
                  key={String(opt.id)}
                  type="button"
                  onClick={() => setInstallmentMode(opt.id)}
                  style={{
                    padding: "10px 12px", textAlign: "left",
                    background: active ? `${G}15` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? `${G}66` : BORDER}`,
                    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: active ? G : "#fff", letterSpacing: 0.3 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan multi-échéances : config */}
        {installmentMode && (
          <div style={{
            marginBottom: 16, padding: 14,
            background: `${G}08`, border: `1px solid ${G}22`, borderRadius: 12,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label={t("lpm.total_plan_amount", "Montant total du plan (€)")}>
                <input
                  type="number" step="0.01" min="0"
                  value={totalPlanAmount}
                  onChange={(e) => setTotalPlanAmount(e.target.value)}
                  placeholder="Ex : 600"
                  style={input}
                  inputMode="decimal"
                />
              </Field>
              <Field label={t("lpm.nb_installments", "Nb d'échéances")}>
                <select
                  value={nInstallments}
                  onChange={(e) => setNInstallments(parseInt(e.target.value, 10))}
                  style={input}
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>{n} fois</option>
                  ))}
                </select>
              </Field>
            </div>
            {installmentAmount > 0 && (
              <div style={{
                marginTop: 10, padding: "8px 12px",
                background: "rgba(255,255,255,0.03)", borderRadius: 8,
                fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.55,
              }}>
                <strong style={{ color: G }}>{installmentAmount.toFixed(2)} €/échéance</strong>
                {" · "}1ère aujourd'hui, dernière le{" "}
                <strong style={{ color: "#fff" }}>
                  {lastDueDate ? new Date(lastDueDate).toLocaleDateString(getDateLocale()) : "—"}
                </strong>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  Le montant ci-dessous est ce que tu reçois MAINTENANT.
                  {parseFloat(amount) !== installmentAmount && installmentAmount > 0 &&
                    " Tu peux le laisser différent (acompte, premier mois offert…)."}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Montant + Méthode */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <Field label={installmentMode ? "Montant reçu maintenant (€)" : "Montant (€)"}>
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
              {getMethods().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
        </div>

        {/* Date reçue */}
        <Field label={t("lpm.date_received", "Date reçue")}>
          <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} style={input} />
        </Field>

        {/* Période couverte */}
        <div style={{ marginTop: 16 }}>
          <div style={subtitle}>{t("lpm.period_covered", "Période couverte par ce paiement")}</div>
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
          <Field label={t("lpm.notes_optional", "Notes (optionnel)")}>
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
          >{t("lpm.annuler", "Annuler")}</button>
          <button
            type="button"
            onClick={() => save()}
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
    const today = todayLocal();
    if (data.period_end < today) return { needs: true, reason: "expired", periodEnd: data.period_end };
    return { needs: false, periodEnd: data.period_end };
  } catch (e) {
    console.warn("[checkPaymentNeeded]", e);
    return { needs: false }; // Fail-safe : pas de prompt si on peut pas check
  }
}
