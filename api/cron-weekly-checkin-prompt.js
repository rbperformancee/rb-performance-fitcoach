/**
 * Cron weekly checkin prompt — Vercel Cron Job
 *
 * Schedule : dimanche 19h UTC (≈ 20h-21h Paris selon DST). Cf. vercel.json.
 *
 * Pour chaque client avec push_subscription active :
 *   - Si pas encore de bilan_hebdo soumis pour la semaine en cours → push
 *     "Ton bilan de la semaine — 30s" → deep link /checkin
 *   - Sinon → skip (le client a déjà rempli)
 *
 * Pourquoi : Ekklo appelle ça "recurring questionnaires" — données
 * structurées vs juste un chat. Pour le coach c'est de la donnée actionnable,
 * pas du subjectif noyé dans la conversation.
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
        url: deepLink || "/login?view=checkin",
      }),
    });
    return true;
  } catch (e) {
    console.warn("[checkin] push failed for", clientId, e?.message);
    return false;
  }
}

// ISO Monday : retourne YYYY-MM-DD du lundi de la semaine courante (UTC).
// Si on est dimanche soir, c'est le lundi suivant qu'on cherche ? Non — on
// envoie le prompt POUR la semaine qui se termine, donc on veut le lundi
// précédent. Convention : "week_start" = lundi du début de la semaine
// que le client va raconter.
function currentWeekStart() {
  const d = new Date();
  // getDay() : 0=dim, 1=lun, … 6=sam
  const day = d.getUTCDay();
  // Si dimanche (0), on remonte de 6 jours pour atteindre le lundi précédent.
  // Sinon on remonte de (day-1) jours.
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase env missing" });
  }

  try {
    const weekStart = currentWeekStart();

    // 1. Tous les clients avec push abo actif
    const subs = await sbFetch(`/rest/v1/push_subscriptions?select=client_id`);
    if (!Array.isArray(subs)) {
      return res.status(500).json({ error: "Failed to load subscriptions" });
    }
    const clientIds = Array.from(new Set(subs.map((s) => s.client_id).filter(Boolean)));
    if (clientIds.length === 0) {
      return res.status(200).json({ ok: true, eligible: 0, sent: 0, weekStart });
    }

    const idsCsv = clientIds.map((id) => `"${id}"`).join(",");

    // 2. Clients qui ont DÉJÀ soumis pour cette semaine
    const submitted = await sbFetch(
      `/rest/v1/weekly_checkins?week_start=eq.${weekStart}&client_id=in.(${idsCsv})&select=client_id`
    );
    const submittedSet = new Set(Array.isArray(submitted) ? submitted.map((s) => s.client_id) : []);

    // 3. Charge les noms pour personnalisation
    const clients = await sbFetch(
      `/rest/v1/clients?select=id,full_name&id=in.(${idsCsv})`
    );
    if (!Array.isArray(clients)) {
      return res.status(500).json({ error: "Failed to load clients" });
    }

    let sent = 0;
    let skipped = 0;
    for (const c of clients) {
      if (submittedSet.has(c.id)) { skipped++; continue; }
      const firstName = (c.full_name || "").split(" ")[0] || "";
      const ok = await sendPush(
        c.id,
        firstName ? `${firstName}, ton bilan ?` : "Ton bilan de la semaine",
        "30 secondes : poids, mensurations, ressenti. Ton coach voit ta progression.",
        "/login?view=checkin"
      );
      if (ok) sent++;
    }

    return res.status(200).json({
      ok: true,
      weekStart,
      eligible: clients.length,
      submitted: skipped,
      sent,
    });
  } catch (e) {
    console.error("[cron-weekly-checkin-prompt]", e);
    await captureException(e, { tags: { endpoint: "cron-weekly-checkin-prompt" } });
    return res.status(500).json({ error: e.message });
  }
};
