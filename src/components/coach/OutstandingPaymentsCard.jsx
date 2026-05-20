/**
 * Comptes à recevoir — affiche les échéances payment_schedules en
 * attente / en retard pour le coach connecté.
 *
 * Reste invisible tant qu'il n'y a aucune échéance planifiée (= les coachs
 * qui utilisent uniquement le mode "paiement unique" ne voient rien).
 *
 * Actions par ligne :
 *   - "Marquer payée"  → insère un client_payment + flip schedule.status=paid
 *   - "Annuler"        → schedule.status=waived (geste commercial)
 */

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import {
  getOutstandingSchedules,
  markScheduleAsPaid,
  waiveSchedule,
  addMonths,
} from "../../lib/paymentSchedules";
import AppIcon from "../AppIcon";
import EditScheduleModal from "./EditScheduleModal";

const G = "#02d1ba";
const RED = "#ef4444";
const ORANGE = "#f97316";

export default function OutstandingPaymentsCard({ coachId }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // id de l'échéance en cours d'action
  const [editing, setEditing] = useState(null); // schedule en cours d'édition

  const refresh = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    const res = await getOutstandingSchedules(coachId);
    if (res.ok) setSchedules(res.schedules);
    setLoading(false);
  }, [coachId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Pas de section visible tant qu'il n'y a rien à afficher (évite le bruit)
  if (loading) return null;
  if (schedules.length === 0) return null;

  // Total dû + nb d'échéances en retard
  const totalDue = schedules.reduce((s, x) => s + Number(x.expected_amount || 0), 0);
  const nLate = schedules.filter((s) => s.computed_status === "late").length;

  // Regrouper par client pour un affichage compact
  const byClient = {};
  for (const s of schedules) {
    if (!byClient[s.client_id]) {
      byClient[s.client_id] = { client_name: s.client_name, items: [], total: 0, nLate: 0 };
    }
    byClient[s.client_id].items.push(s);
    byClient[s.client_id].total += Number(s.expected_amount || 0);
    if (s.computed_status === "late") byClient[s.client_id].nLate++;
  }

  async function markPaid(schedule) {
    setBusy(schedule.id);
    haptic.light();
    try {
      // Crée d'abord un client_payment "complet" qui couvre l'échéance.
      // Période par défaut : due_date → due_date + 1 mois (cohérent avec le rythme mensuel).
      const periodEnd = addMonths(schedule.due_date, 1);
      const { data: paymentRow, error: payErr } = await supabase
        .from("client_payments")
        .insert({
          client_id: schedule.client_id,
          coach_id: coachId,
          amount_eur: Number(schedule.expected_amount),
          payment_method: "virement",
          received_date: new Date().toISOString().slice(0, 10),
          period_start: schedule.due_date,
          period_end: periodEnd,
          notes: `Échéance ${schedule.sequence_num}/${schedule.total_sequence}`,
        })
        .select()
        .single();
      if (payErr) throw payErr;

      // Puis flip l'échéance et lie au paiement
      const res = await markScheduleAsPaid(
        schedule.id,
        paymentRow.id,
        Number(schedule.expected_amount)
      );
      if (!res.ok) throw new Error(res.error);

      haptic.success?.();
      toast.success(`Échéance de ${Number(schedule.expected_amount).toFixed(2)} € marquée payée ✓`);
      await refresh();
    } catch (e) {
      toast.error(e.message || "Erreur");
    }
    setBusy(null);
  }

  async function waive(schedule) {
    const reason = window.prompt(
      `Annuler cette échéance de ${Number(schedule.expected_amount).toFixed(2)} € ?\n\nRaison (optionnel — geste commercial, erreur, etc.) :`,
      ""
    );
    if (reason === null) return; // cancelled
    setBusy(schedule.id);
    haptic.light();
    const res = await waiveSchedule(schedule.id, reason);
    if (res.ok) {
      toast.success("Échéance annulée");
      await refresh();
    } else {
      toast.error(res.error || "Erreur");
    }
    setBusy(null);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 18, padding: "18px 22px", marginBottom: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: `${ORANGE}cc`, marginBottom: 4 }}>
            Comptes à recevoir
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
            {totalDue.toLocaleString("fr-FR")} €
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
            {schedules.length} échéance{schedules.length > 1 ? "s" : ""} planifiée{schedules.length > 1 ? "s" : ""}
            {nLate > 0 && (
              <span style={{ color: RED, fontWeight: 700, marginLeft: 8 }}>
                · {nLate} en retard
              </span>
            )}
          </div>
        </div>
        {nLate > 0 && (
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: `${RED}14`, border: `1px solid ${RED}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AppIcon name="alert" size={20} color={RED} />
          </div>
        )}
      </div>

      <EditScheduleModal
        open={!!editing}
        schedule={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />

      {/* Liste par client */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(byClient).map(([clientId, group]) => (
          <div key={clientId} style={{
            background: "rgba(255,255,255,0.025)",
            border: `1px solid ${group.nLate > 0 ? `${RED}33` : "rgba(255,255,255,0.06)"}`,
            borderRadius: 12, padding: "12px 14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  {group.client_name}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2, letterSpacing: 0.3 }}>
                  {group.items.length} échéance{group.items.length > 1 ? "s" : ""}
                  {" · "}{group.total.toLocaleString("fr-FR")} €
                  {group.nLate > 0 && (
                    <span style={{ color: RED, fontWeight: 700 }}>
                      {" · "}{group.nLate} en retard
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Détail des échéances */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {group.items.map((s) => {
                const isLate = s.computed_status === "late";
                const due = new Date(s.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
                return (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px",
                    background: isLate ? `${RED}08` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isLate ? `${RED}22` : "rgba(255,255,255,0.04)"}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>
                        {Number(s.expected_amount).toFixed(2)} €
                        <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400, marginLeft: 6 }}>
                          · {due} · {s.sequence_num}/{s.total_sequence}
                        </span>
                      </div>
                      {isLate && (
                        <div style={{ fontSize: 10, color: RED, fontWeight: 700, marginTop: 1 }}>
                          En retard de {s.days_late} jour{s.days_late > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => markPaid(s)}
                      disabled={busy === s.id}
                      style={{
                        padding: "6px 10px",
                        background: `linear-gradient(135deg, ${G}, #0891b2)`,
                        border: "none", borderRadius: 7,
                        color: "#000", fontSize: 10, fontWeight: 800,
                        letterSpacing: 0.4, textTransform: "uppercase",
                        cursor: busy === s.id ? "wait" : "pointer", opacity: busy === s.id ? 0.5 : 1,
                        fontFamily: "inherit", flexShrink: 0,
                      }}
                    >
                      {busy === s.id ? "…" : "Payée"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      disabled={busy === s.id}
                      style={{
                        padding: "6px 8px",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
                        color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700,
                        cursor: busy === s.id ? "wait" : "pointer", opacity: busy === s.id ? 0.5 : 1,
                        fontFamily: "inherit", flexShrink: 0,
                      }}
                      title="Modifier la date ou le montant"
                      aria-label="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => waive(s)}
                      disabled={busy === s.id}
                      style={{
                        padding: "6px 8px",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
                        color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700,
                        cursor: busy === s.id ? "wait" : "pointer", opacity: busy === s.id ? 0.5 : 1,
                        fontFamily: "inherit", flexShrink: 0,
                      }}
                      title="Annuler cette échéance"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
