/**
 * Helpers pour les échéances de paiement (payment_schedules).
 *
 * Workflow type :
 *   1. Coach loggue un paiement sur un nouveau plan "6x"
 *   2. On crée 6 lignes dans payment_schedules :
 *        - 1 paid (= ce premier paiement)
 *        - 5 pending (échéances futures, mensuelles)
 *   3. Le mois suivant, le coach logue le 2ème paiement → on cherche une
 *      échéance pending proche en date, on la marque payée + on lie le payment_id.
 */

import { supabase } from "./supabase";

/**
 * Ajoute N mois à une date (en gardant le jour du mois ou en clampant
 * sur la fin de mois si besoin).
 */
export function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Date de base au 1er du mois pour éviter les rollovers (31 mars + 1 mois → 1 mai)
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  // On essaie de remettre le bon jour, sinon on clampe sur la fin de mois
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Crée un plan d'échéances pour un client.
 *
 * @param {object} args
 *   coachId, clientId, totalAmount, nInstallments, firstPaymentDate (YYYY-MM-DD),
 *   firstPaymentId (uuid du client_payment qui correspond à la 1ère échéance, optionnel),
 *   firstPaidAmount (montant réel reçu pour la 1ère, défaut = totalAmount/nInstallments)
 *
 * @returns {Promise<{ ok: boolean, schedules?: Array, error?: string }>}
 */
export async function generateSchedules({
  coachId,
  clientId,
  totalAmount,
  nInstallments,
  firstPaymentDate,
  firstPaymentId = null,
  firstPaidAmount = null,
}) {
  if (!coachId || !clientId) return { ok: false, error: "coachId & clientId requis" };
  const n = Math.max(1, Math.floor(Number(nInstallments) || 1));
  const total = Number(totalAmount) || 0;
  if (total <= 0) return { ok: false, error: "total invalide" };

  const perInstallment = Math.round((total / n) * 100) / 100;
  const firstAmount = Number(firstPaidAmount ?? perInstallment);

  const rows = [];
  for (let i = 0; i < n; i++) {
    const dueDate = i === 0 ? firstPaymentDate : addMonths(firstPaymentDate, i);
    if (i === 0) {
      rows.push({
        coach_id: coachId,
        client_id: clientId,
        due_date: dueDate,
        expected_amount: perInstallment,
        status: firstPaymentId ? "paid" : "pending",
        payment_id: firstPaymentId,
        paid_at: firstPaymentId ? new Date().toISOString() : null,
        paid_amount: firstPaymentId ? firstAmount : null,
        sequence_num: 1,
        total_sequence: n,
      });
    } else {
      rows.push({
        coach_id: coachId,
        client_id: clientId,
        due_date: dueDate,
        expected_amount: perInstallment,
        status: "pending",
        sequence_num: i + 1,
        total_sequence: n,
      });
    }
  }

  const { data, error } = await supabase
    .from("payment_schedules")
    .insert(rows)
    .select();

  if (error) return { ok: false, error: error.message };
  return { ok: true, schedules: data };
}

/**
 * Marque une échéance comme payée, en la liant à un client_payment.
 */
export async function markScheduleAsPaid(scheduleId, paymentId, paidAmount) {
  const { error } = await supabase
    .from("payment_schedules")
    .update({
      status: "paid",
      payment_id: paymentId,
      paid_at: new Date().toISOString(),
      paid_amount: paidAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId);
  return { ok: !error, error: error?.message };
}

/**
 * Marque une échéance comme annulée (geste commercial).
 */
export async function waiveSchedule(scheduleId, reason) {
  const { error } = await supabase
    .from("payment_schedules")
    .update({
      status: "waived",
      waived_reason: reason || null,
      waived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId);
  return { ok: !error, error: error?.message };
}

/**
 * Récupère toutes les échéances en attente / en retard pour un coach.
 * Statut calculé à la volée : pending si due_date >= today, late sinon.
 * (Pas de cron qui flip pending → late : on le fait côté app pour rester simple.)
 *
 * @returns Array de { ...schedule, computed_status, days_late, client: { full_name } }
 */
export async function getOutstandingSchedules(coachId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("payment_schedules")
    .select(`
      id, client_id, due_date, expected_amount, status, sequence_num, total_sequence,
      clients ( id, full_name )
    `)
    .eq("coach_id", coachId)
    .in("status", ["pending", "late"])
    .order("due_date", { ascending: true });
  if (error) return { ok: false, error: error.message, schedules: [] };

  const todayDate = new Date(today);
  const schedules = (data || []).map((s) => {
    const due = new Date(s.due_date);
    const daysDelta = Math.floor((todayDate - due) / 86400000);
    const computed_status = daysDelta > 0 ? "late" : "pending";
    return {
      ...s,
      computed_status,
      days_late: Math.max(0, daysDelta),
      client_name: s.clients?.full_name || "Client",
    };
  });

  return { ok: true, schedules };
}
