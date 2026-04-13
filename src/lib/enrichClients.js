/**
 * Enrichissement batch des clients avec les metriques necessaires
 * aux calculs d'intelligence predictive (churn, profil, renouvellement).
 *
 * Une seule volee de queries Supabase pour eviter les N+1.
 */
import { supabase } from "./supabase";

/**
 * Prend une liste de clients de base et leur ajoute les proprietes :
 *   _sessionsLast7d, _avgRpe7d, _avgRpe30d, _nutriLogs7d, _nutriLogs30d,
 *   _nutritionDaysLogged7d, _avgSleep7d, _totalSessions,
 *   _daysSinceLastWeight, _lastRpe, _logTimestamps (7j)
 */
export async function enrichClientsForIntelligence(clients) {
  if (!clients || clients.length === 0) return clients;
  const ids = clients.map((c) => c.id);
  const now = Date.now();
  const d7ago = new Date(now - 7 * 86400000).toISOString();
  const d30ago = new Date(now - 30 * 86400000).toISOString();
  const d7dateOnly = d7ago.split("T")[0];
  const d30dateOnly = d30ago.split("T")[0];

  // 1 volee de 5 queries parallel
  const [sessionsRes, rpeRes, nutriRes, dailyRes, weightsRes] = await Promise.all([
    supabase.from("session_logs").select("client_id, logged_at").in("client_id", ids).gte("logged_at", d30ago),
    supabase.from("session_rpe").select("client_id, date, rpe").in("client_id", ids).gte("date", d30dateOnly),
    supabase.from("nutrition_logs").select("client_id, date, logged_at").in("client_id", ids).gte("date", d30dateOnly),
    supabase.from("daily_tracking").select("client_id, date, sommeil_h").in("client_id", ids).gte("date", d7dateOnly),
    supabase.from("weight_logs").select("client_id, date").in("client_id", ids).order("date", { ascending: false }),
  ]);

  // Aggregations par client
  const sessions = groupBy(sessionsRes.data || [], "client_id");
  const rpes = groupBy(rpeRes.data || [], "client_id");
  const nutris = groupBy(nutriRes.data || [], "client_id");
  const dailies = groupBy(dailyRes.data || [], "client_id");
  const weights = groupBy(weightsRes.data || [], "client_id");

  return clients.map((c) => {
    const s = sessions[c.id] || [];
    const r = rpes[c.id] || [];
    const n = nutris[c.id] || [];
    const d = dailies[c.id] || [];
    const w = weights[c.id] || [];

    // Seances 7j
    const s7 = s.filter((x) => x.logged_at >= d7ago);
    // RPE averages
    const r7 = r.filter((x) => x.date >= d7dateOnly);
    const r30 = r;
    const avgRpe7d = r7.length ? average(r7.map((x) => x.rpe)) : null;
    const avgRpe30d = r30.length ? average(r30.map((x) => x.rpe)) : null;
    const lastRpe = r30[0]?.rpe ?? null;

    // Nutrition
    const n7 = n.filter((x) => x.date >= d7dateOnly);
    const uniqueDays7 = new Set(n7.map((x) => x.date)).size;

    // Sommeil
    const sleep7 = d.map((x) => x.sommeil_h || 0).filter((v) => v > 0);
    const avgSleep7d = sleep7.length ? average(sleep7) : 0;

    // Poids
    const lastWeight = w[0];
    const daysSinceLastWeight = lastWeight
      ? Math.round((now - new Date(lastWeight.date).getTime()) / 86400000)
      : 999;

    return {
      ...c,
      _sessionsLast7d: s7.length,
      _avgRpe7d: avgRpe7d,
      _avgRpe30d: avgRpe30d,
      _nutriLogs7d: n7.length,
      _nutriLogs30d: n.length,
      _nutritionDaysLogged7d: uniqueDays7,
      _avgSleep7d: avgSleep7d,
      _totalSessions: s.length, // 30j (proxy)
      _daysSinceLastWeight: daysSinceLastWeight,
      _lastRpe: lastRpe,
      _logTimestamps: s.map((x) => x.logged_at),
    };
  });
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] || []).push(item);
    return acc;
  }, {});
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
