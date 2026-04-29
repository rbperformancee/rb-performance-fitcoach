/**
 * Cron weekly recap — Vercel Cron Job
 * Schedule: chaque lundi a 8h UTC → 9h ou 10h Paris
 *
 * Envoie un push bilan de la semaine a chaque client
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

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!SUPABASE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
  }
  if (!SUPABASE_URL) {
    return res.status(500).json({ error: "Missing SUPABASE_URL" });
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  let sent = 0;

  try {
    const clients = await sbFetch("/rest/v1/clients?select=id,full_name");
    if (!Array.isArray(clients)) {
      return res.status(500).json({ error: "Failed to load clients" });
    }

    for (const client of clients) {
      // Nombre de seances cette semaine
      const logs = await sbFetch(
        `/rest/v1/session_logs?client_id=eq.${client.id}&logged_at=gte.${weekAgo}&select=id`
      );
      const sessions = Array.isArray(logs) ? logs.length : 0;

      // Recup push subscriptions
      const subs = await sbFetch(
        `/rest/v1/push_subscriptions?client_id=eq.${client.id}`
      );
      if (!Array.isArray(subs) || subs.length === 0) continue;

      const firstName = client.full_name?.split(" ")[0] || "";
      const msg = sessions === 0
        ? { title: "Bilan semaine", body: "Cette semaine etait calme. On repart fort lundi !" }
        : { title: "Bilan semaine", body: `${sessions} seance${sessions > 1 ? "s" : ""} cette semaine. Continue comme ca ${firstName} !` };

      // Envoyer via send-push Edge Function
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            client_id: client.id,
            title: msg.title,
            body: msg.body,
          }),
        });
        sent++;
      } catch {}
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    console.error(`[CRON_WEEKLY_RECAP_FAILED] reason="${e.message}"`);
    await captureException(e, { tags: { endpoint: "cron-weekly-recap", stage: "uncaught" } });
    return res.status(500).json({ error: e.message });
  }
}
