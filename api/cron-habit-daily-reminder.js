/**
 * Cron habit daily reminder — Vercel Cron Job
 *
 * Schedule : 18h UTC (≈ 20h Paris). Cf. vercel.json.
 *
 * Pour chaque client avec push abonnement actif + au moins 1 habit active :
 *   - Compte les habit_logs du jour
 *   - Si compliance < 100% → push "Tu as X/Y habitudes cochées aujourd'hui"
 *   - Skip si client a 0 habit
 *
 * Pourquoi : engagement les jours OFF (sans séance). Aligné Ekklo Pro.
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
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

async function sendPush(clientId, title, body, deepLink) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        title,
        body,
        url: deepLink || "/login",
      }),
    });
    return true;
  } catch (e) {
    console.warn("[habit-reminder] push failed for", clientId, e?.message);
    return false;
  }
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase env missing" });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Tous les clients avec push abo actif
    const subs = await sbFetch(`/rest/v1/push_subscriptions?select=client_id`);
    if (!Array.isArray(subs)) return res.status(500).json({ error: "Failed subscriptions" });
    const clientIds = Array.from(new Set(subs.map((s) => s.client_id).filter(Boolean)));
    if (clientIds.length === 0) return res.status(200).json({ ok: true, eligible: 0, sent: 0 });

    const idsCsv = clientIds.map((id) => `"${id}"`).join(",");

    // 2. Habits actives par client
    const habits = await sbFetch(
      `/rest/v1/habits?active=eq.true&client_id=in.(${idsCsv})&select=id,client_id`
    );
    if (!Array.isArray(habits)) return res.status(500).json({ error: "Failed habits" });
    const habitsByClient = new Map();
    for (const h of habits) {
      if (!habitsByClient.has(h.client_id)) habitsByClient.set(h.client_id, []);
      habitsByClient.get(h.client_id).push(h.id);
    }

    if (habitsByClient.size === 0) {
      return res.status(200).json({ ok: true, eligible: 0, sent: 0, reason: "no clients with active habits" });
    }

    // 3. Logs du jour pour ces habits
    const allHabitIds = habits.map((h) => h.id);
    const habitIdsCsv = allHabitIds.map((id) => `"${id}"`).join(",");
    const logs = await sbFetch(
      `/rest/v1/habit_logs?date=eq.${today}&habit_id=in.(${habitIdsCsv})&select=habit_id,client_id`
    );
    const doneByClient = new Map();
    if (Array.isArray(logs)) {
      for (const l of logs) {
        doneByClient.set(l.client_id, (doneByClient.get(l.client_id) || 0) + 1);
      }
    }

    // 4. Charge les noms
    const clientIdsWithHabits = Array.from(habitsByClient.keys());
    const idsCsv2 = clientIdsWithHabits.map((id) => `"${id}"`).join(",");
    const clientsRows = await sbFetch(
      `/rest/v1/clients?select=id,full_name&id=in.(${idsCsv2})`
    );
    const nameById = new Map();
    if (Array.isArray(clientsRows)) {
      clientsRows.forEach((c) => nameById.set(c.id, c.full_name));
    }

    // 5. Push aux clients qui n'ont pas tout coché
    let sent = 0;
    let allDone = 0;
    let eligible = clientIdsWithHabits.length;
    for (const clientId of clientIdsWithHabits) {
      const total = habitsByClient.get(clientId).length;
      const done = doneByClient.get(clientId) || 0;
      if (done >= total) { allDone++; continue; }
      const firstName = (nameById.get(clientId) || "").split(" ")[0] || "";
      const ok = await sendPush(
        clientId,
        firstName ? `${firstName}, tes habitudes ?` : "Tes habitudes du jour",
        `Tu as ${done}/${total} cochées. 30 secondes pour finir avant dodo.`,
      );
      if (ok) sent++;
    }

    return res.status(200).json({
      ok: true, today, eligible, sent, allDone,
    });
  } catch (e) {
    console.error("[cron-habit-daily-reminder]", e);
    await captureException(e, { tags: { endpoint: "cron-habit-daily-reminder" } });
    return res.status(500).json({ error: e.message });
  }
};
