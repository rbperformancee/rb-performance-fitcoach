/**
 * Calcul des donnees de transformation d'un client depuis le jour 1.
 * Compare semaine 1 vs semaine actuelle sur toutes les metriques.
 */
import { supabase } from "./supabase";

/**
 * Fetch tout l'historique d'un client + calcule les deltas cles.
 */
export async function fetchTransformation(clientId, subscriptionStart) {
  if (!clientId) return null;
  const startDate = subscriptionStart ? new Date(subscriptionStart) : null;

  const [weightsRes, sessionsRes, rpeRes, nutriRes, exLogsRes] = await Promise.all([
    supabase.from("weight_logs").select("date, weight, note").eq("client_id", clientId).order("date", { ascending: true }),
    supabase.from("session_logs").select("logged_at, session_name").eq("client_id", clientId).order("logged_at", { ascending: true }),
    supabase.from("session_rpe").select("date, rpe").eq("client_id", clientId).order("date", { ascending: true }),
    supabase.from("nutrition_logs").select("date, calories, proteines").eq("client_id", clientId).order("date", { ascending: true }),
    supabase.from("exercise_logs").select("logged_at, ex_key, weight, reps").eq("client_id", clientId).order("logged_at", { ascending: true }).limit(1000),
  ]);

  const weights = weightsRes.data || [];
  const sessions = sessionsRes.data || [];
  const rpes = rpeRes.data || [];
  const nutris = nutriRes.data || [];
  const exLogs = exLogsRes.data || [];

  // Date de reference : subscription_start ou premier log
  const firstLog = [weights[0]?.date, sessions[0]?.logged_at, rpes[0]?.date].filter(Boolean).sort()[0];
  const dayOne = startDate || (firstLog ? new Date(firstLog) : null);
  if (!dayOne) return { weights, sessions, rpes, nutris, exLogs, dayOne: null };

  const daysSinceStart = Math.floor((Date.now() - dayOne.getTime()) / 86400000);
  const weeksSinceStart = Math.max(1, Math.floor(daysSinceStart / 7));

  // Week 1 = 7 premiers jours depuis dayOne
  const w1End = new Date(dayOne.getTime() + 7 * 86400000);
  // Current week = 7 derniers jours
  const currentStart = new Date(Date.now() - 7 * 86400000);

  const weightFirst = weights[0]?.weight ?? null;
  const weightNow = weights[weights.length - 1]?.weight ?? null;
  const weightDelta = (weightFirst !== null && weightNow !== null) ? weightNow - weightFirst : null;

  const sessionsW1 = sessions.filter((s) => new Date(s.logged_at) <= w1End).length;
  const sessionsNow = sessions.filter((s) => new Date(s.logged_at) >= currentStart).length;

  const rpeW1 = averageOf(rpes.filter((r) => new Date(r.date) <= w1End).map((r) => r.rpe));
  const rpeNow = averageOf(rpes.filter((r) => new Date(r.date) >= currentStart).map((r) => r.rpe));

  const nutriW1Days = new Set(nutris.filter((n) => new Date(n.date) <= w1End).map((n) => n.date)).size;
  const nutriNowDays = new Set(nutris.filter((n) => new Date(n.date) >= currentStart).map((n) => n.date)).size;

  // Progression charges : moyenne poids souleve week 1 vs week courante
  const exW1 = exLogs.filter((e) => new Date(e.logged_at) <= w1End && e.weight > 0).map((e) => e.weight);
  const exNow = exLogs.filter((e) => new Date(e.logged_at) >= currentStart && e.weight > 0).map((e) => e.weight);
  const avgChargeW1 = averageOf(exW1);
  const avgChargeNow = averageOf(exNow);

  return {
    dayOne,
    daysSinceStart,
    weeksSinceStart,
    totalSessions: sessions.length,
    totalWeightLogs: weights.length,
    weights,
    sessions,
    rpes,
    // Comparaisons S1 vs maintenant
    before: {
      weight: weightFirst,
      sessionsWeek: sessionsW1,
      rpe: rpeW1,
      nutriDays: nutriW1Days,
      avgCharge: avgChargeW1,
    },
    after: {
      weight: weightNow,
      sessionsWeek: sessionsNow,
      rpe: rpeNow,
      nutriDays: nutriNowDays,
      avgCharge: avgChargeNow,
    },
    deltas: {
      weight: weightDelta,
      sessionsWeek: sessionsNow - sessionsW1,
      rpe: rpeW1 && rpeNow ? rpeNow - rpeW1 : null,
      nutriDays: nutriNowDays - nutriW1Days,
      charge: avgChargeW1 && avgChargeNow ? ((avgChargeNow - avgChargeW1) / avgChargeW1) * 100 : null,
    },
  };
}

function averageOf(arr) {
  if (!arr || !arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
