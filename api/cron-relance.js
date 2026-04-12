/**
 * Cron relance server-side — Vercel Cron Job
 * Schedule: tous les jours a 9h (UTC) → 10h ou 11h Paris
 *
 * Logique identique a useClientRelance mais cote serveur :
 * - Inactif 3-6j → push douce
 * - Inactif 7j+  → push forte
 * - Abonnement expire dans 14j → push + email
 * - Abonnement expire → push + email
 *
 * Rate limit : table notification_logs en DB (remplace localStorage)
 */

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Protection cron : Vercel ajoute un header Authorization: Bearer CRON_SECRET
// configurable dans vercel.json. Si CRON_SECRET est set, on exige le match.
function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // pas configure : on laisse passer (dev)
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

const TEMPLATES = {
  inactivity_soft: (name, days) => ({
    title: "RB PERFORM",
    body: `${name}, ca fait ${days} jours. Ton programme t'attend, reviens en force.`,
  }),
  inactivity_hard: (name, days) => ({
    title: "RB PERFORM",
    body: `${name}, ${days} jours sans seance. Le moment de reprendre c'est maintenant.`,
  }),
  sub_expiring: (name, days) => ({
    title: "RB PERFORM",
    body: `${name}, ton abonnement expire dans ${days} jours. Renouvelle pour continuer ta progression.`,
  }),
  sub_expired: (name) => ({
    title: "RB PERFORM",
    body: `${name}, ton abonnement a expire. Reviens pour ne pas perdre ta progression.`,
  }),
};

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

async function sendPush(clientId, title, body) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ client_id: clientId, title, body }),
    });
    return true;
  } catch {
    return false;
  }
}

async function sendEmail(email, fullName, type, extra = {}) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-welcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ email, full_name: fullName, type, ...extra }),
    });
  } catch {}
}

async function wasSentToday(clientId, type) {
  const today = new Date().toISOString().split("T")[0];
  const data = await sbFetch(
    `/rest/v1/notification_logs?client_id=eq.${clientId}&type=eq.${type}&sent_date=eq.${today}&select=id&limit=1`
  );
  return Array.isArray(data) && data.length > 0;
}

async function logNotification(clientId, type) {
  const today = new Date().toISOString().split("T")[0];
  await sbFetch("/rest/v1/notification_logs", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ client_id: clientId, type, sent_date: today }),
  });
}

export default async function handler(req, res) {
  // Vercel cron envoie un GET avec Authorization header
  // On accepte aussi les appels manuels
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

  const results = [];

  try {
    // 1. Charger tous les clients avec leurs programmes
    const clients = await sbFetch(
      "/rest/v1/clients?select=id,full_name,email,subscription_end_date,coach_id,programmes(id,is_active)"
    );
    if (!Array.isArray(clients)) {
      return res.status(500).json({ error: "Failed to load clients", detail: clients });
    }

    for (const c of clients) {
      const name = c.full_name?.split(" ")[0] || "Champion";
      const hasProg = c.programmes?.some((p) => p.is_active);

      // Calculer jours d'inactivite
      let inactiveDays = 999;
      const logsRes = await sbFetch(
        `/rest/v1/exercise_logs?client_id=eq.${c.id}&select=logged_at&order=logged_at.desc&limit=1`
      );
      if (Array.isArray(logsRes) && logsRes.length > 0) {
        inactiveDays = Math.floor(
          (Date.now() - new Date(logsRes[0].logged_at).getTime()) / 86400000
        );
      }

      // Inactivite 7j+
      if (hasProg && inactiveDays >= 7 && !(await wasSentToday(c.id, "inactivity_hard"))) {
        const t = TEMPLATES.inactivity_hard(name, inactiveDays);
        const ok = await sendPush(c.id, t.title, t.body);
        if (ok) {
          await logNotification(c.id, "inactivity_hard");
          results.push({ client: c.id, type: "inactivity_hard" });
        }
      }
      // Inactivite 3-6j
      else if (hasProg && inactiveDays >= 3 && inactiveDays < 7 && !(await wasSentToday(c.id, "inactivity_soft"))) {
        const t = TEMPLATES.inactivity_soft(name, inactiveDays);
        const ok = await sendPush(c.id, t.title, t.body);
        if (ok) {
          await logNotification(c.id, "inactivity_soft");
          results.push({ client: c.id, type: "inactivity_soft" });
        }
      }

      // Abonnement
      if (c.subscription_end_date) {
        const daysLeft = Math.ceil(
          (new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000
        );

        if (daysLeft > 0 && daysLeft <= 14 && !(await wasSentToday(c.id, "sub_expiring"))) {
          const t = TEMPLATES.sub_expiring(name, daysLeft);
          const ok = await sendPush(c.id, t.title, t.body);
          if (ok) {
            await logNotification(c.id, "sub_expiring");
            results.push({ client: c.id, type: "sub_expiring" });
          }
          if (c.email) {
            await sendEmail(c.email, c.full_name, "renewal_reminder", { days_left: daysLeft });
          }
        }

        if (daysLeft <= 0 && !(await wasSentToday(c.id, "sub_expired"))) {
          const t = TEMPLATES.sub_expired(name);
          const ok = await sendPush(c.id, t.title, t.body);
          if (ok) {
            await logNotification(c.id, "sub_expired");
            results.push({ client: c.id, type: "sub_expired" });
          }
          if (c.email) {
            await sendEmail(c.email, c.full_name, "subscription_expired");
          }
        }
      }
    }

    return res.status(200).json({ ok: true, sent: results.length, details: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
