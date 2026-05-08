/**
 * Cron : alertes quotidiennes au coach quand un client décroche.
 * Schedule : tous les jours 10 UTC = 11h ou 12h Paris (1h après le cron-relance
 * qui notifie le CLIENT pour le ramener — ici on notifie le COACH pour qu'il
 * intervienne s'il veut accélérer la relance).
 *
 * Triggers détectés :
 *  - Client inactif 3-6 jours : alerte soft (1 push + 1 row activity_log)
 *  - Client inactif 7+ jours : alerte hard (push avec wording urgent)
 *
 * Throttle : on n'insère un row activity_log que si aucun row identique
 * (coach_id, client_id, activity_type) n'a été créé dans les 7 derniers jours.
 * Évite le spam quotidien si le client reste inactif 3 semaines.
 *
 * Pas d'email coach ici : ça ferait redondance avec le digest hebdo. Le push
 * est plus actionnable (notification immédiate).
 */

const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON_AUTH_FAIL] CRON_SECRET missing — refused");
    return false;
  }
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res.json();
}

async function sendCoachPush(coachId, title, body, url = "/login") {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ coach_id: coachId, title, body, url }),
    });
    return true;
  } catch { return false; }
}

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!SUPABASE_KEY) return res.status(500).json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

  try {
    // Tous les coachs actifs
    const coaches = await sbFetch("/rest/v1/coaches?select=id,full_name&is_active=eq.true");
    if (!Array.isArray(coaches) || coaches.length === 0) {
      return res.status(200).json({ ok: true, alerted: 0, reason: "no coaches" });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let alertCount = 0;

    for (const coach of coaches) {
      // Clients du coach (avec abo actif uniquement — pas la peine d'alerter sur des comptes morts)
      const clients = await sbFetch(`/rest/v1/clients?coach_id=eq.${coach.id}&subscription_status=eq.active&select=id,full_name,email`);
      if (!Array.isArray(clients) || clients.length === 0) continue;

      const clientIds = clients.map((c) => c.id);

      // Latest exercise_log par client (pour détecter inactivité)
      const logs = await sbFetch(
        `/rest/v1/exercise_logs?client_id=in.(${clientIds.map((i) => `"${i}"`).join(",")})&select=client_id,logged_at&order=logged_at.desc`
      );
      const lastLogByClient = {};
      if (Array.isArray(logs)) {
        for (const log of logs) {
          if (!lastLogByClient[log.client_id]) lastLogByClient[log.client_id] = log.logged_at;
        }
      }

      // Activity log existant pour throttle (alertes déjà envoyées dans la semaine)
      const recentAlerts = await sbFetch(
        `/rest/v1/coach_activity_log?coach_id=eq.${coach.id}&activity_type=in.(client_inactive_soft,client_inactive_hard)&created_at=gte.${sevenDaysAgo}&select=client_id,activity_type`
      );
      const alertedSet = new Set();
      if (Array.isArray(recentAlerts)) {
        for (const a of recentAlerts) alertedSet.add(`${a.client_id}::${a.activity_type}`);
      }

      for (const client of clients) {
        const lastLog = lastLogByClient[client.id];
        if (!lastLog) continue; // Jamais loggé → pas d'inactivité à mesurer
        const days = Math.floor((Date.now() - new Date(lastLog).getTime()) / 86400000);
        const name = client.full_name || client.email || "Client";

        let activityType = null;
        let pushTitle = null;
        let pushBody = null;
        if (days >= 7) {
          activityType = "client_inactive_hard";
          pushTitle = "Alerte décrochage";
          pushBody = `${name} n'a pas loggé depuis ${days}j. Prends 2 min pour le relancer.`;
        } else if (days >= 3) {
          activityType = "client_inactive_soft";
          pushTitle = "Client en pause";
          pushBody = `${name} : ${days}j sans séance. Petit coup de fil ?`;
        } else {
          continue;
        }

        // Throttle 7j
        if (alertedSet.has(`${client.id}::${activityType}`)) continue;

        // Insert activity log
        await sbFetch(`/rest/v1/coach_activity_log`, {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            coach_id: coach.id,
            client_id: client.id,
            activity_type: activityType,
            details: pushBody,
          }),
        });

        // Push notif coach (best-effort)
        // Deep-link client pas encore implémenté côté CoachDashboard, on
        // route vers /login (= dashboard coach) en attendant.
        await sendCoachPush(coach.id, pushTitle, pushBody, "/login");
        alertCount++;
      }
    }

    return res.status(200).json({ ok: true, alerted: alertCount });
  } catch (e) {
    console.error(`[CRON_COACH_ALERTS_FAILED] reason="${e.message || e}"`);
    await captureException(e, { tags: { endpoint: "cron-coach-alerts", stage: "uncaught" } });
    return res.status(500).json({ error: String(e) });
  }
}
