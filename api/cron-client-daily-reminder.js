/**
 * Cron client daily reminder — Vercel Cron Job
 *
 * Routé via 2 entrées dans vercel.json (path query `kind=evening` ou `morning`) :
 *   - evening (21h Paris ≈ 19h UTC) : si client n'a pas logge nutrition + pas
 *     aujourd'hui → push "Pense a logger ton repas et tes pas".
 *   - morning (8h Paris ≈ 6h UTC) : si client n'a pas logge sommeil hier →
 *     push "Combien d'heures de sommeil cette nuit ?".
 *
 * On ne notifie pas si le client a deja logge la donnee — evite le spam.
 * Tous les clients avec une push_subscription active sont eligibles.
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
        url: deepLink || "/",
      }),
    });
    return true;
  } catch (e) {
    console.warn("[reminder] push failed for", clientId, e?.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Missing Supabase env" });
  }

  // kind=evening (default) ou kind=morning, lu depuis query string ou path
  const url = req.url || "";
  const kind = /morning/.test(url) ? "morning" : "evening";

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let sent = 0;
  let skipped = 0;

  try {
    // Recup tous les clients avec une push_subscription active.
    // On filtre sur push_subscriptions cote app pour eviter de pousser a
    // ceux qui n'ont pas autorise les notifs.
    const subs = await sbFetch(`/rest/v1/push_subscriptions?select=client_id`);
    if (!Array.isArray(subs)) {
      return res.status(500).json({ error: "Failed to load subscriptions" });
    }
    const clientIds = Array.from(new Set(subs.map((s) => s.client_id).filter(Boolean)));
    if (clientIds.length === 0) {
      return res.status(200).json({ ok: true, kind, sent: 0, eligible: 0 });
    }

    // Charger les noms et coach_id pour personnaliser
    const idsCsv = clientIds.map((id) => `"${id}"`).join(",");
    const clients = await sbFetch(
      `/rest/v1/clients?select=id,full_name,coach_id&id=in.(${idsCsv})`
    );
    if (!Array.isArray(clients)) {
      return res.status(500).json({ error: "Failed to load clients" });
    }

    for (const client of clients) {
      const firstName = (client.full_name || "").split(" ")[0] || "";

      if (kind === "evening") {
        // Verifier : a-t-il logge AU MOINS un repas aujourd'hui ?
        const meals = await sbFetch(
          `/rest/v1/nutrition_logs?client_id=eq.${client.id}&date=eq.${today}&select=id&limit=1`
        );
        const tracking = await sbFetch(
          `/rest/v1/daily_tracking?client_id=eq.${client.id}&date=eq.${today}&select=pas,eau_ml&limit=1`
        );
        const hasMeal = Array.isArray(meals) && meals.length > 0;
        const hasSteps = Array.isArray(tracking) && tracking[0]?.pas > 0;
        const hasWater = Array.isArray(tracking) && tracking[0]?.eau_ml > 0;

        if (hasMeal && hasSteps && hasWater) { skipped++; continue; }

        const missing = [];
        if (!hasMeal) missing.push("ton repas");
        if (!hasSteps) missing.push("tes pas");
        if (!hasWater) missing.push("ton eau");
        const list = missing.length === 1
          ? missing[0]
          : missing.slice(0, -1).join(", ") + " et " + missing[missing.length - 1];

        const ok = await sendPush(
          client.id,
          firstName ? `${firstName}, encore 30 secondes` : "Encore 30 secondes",
          `Pense a logger ${list} pour aujourd'hui.`,
          "/?page=fuel"
        );
        if (ok) sent++;
      } else {
        // morning : sommeil de la nuit derniere = entree du JOUR EN COURS
        // (la donnee est saisie au reveil pour la nuit qui vient de finir)
        const tracking = await sbFetch(
          `/rest/v1/daily_tracking?client_id=eq.${client.id}&date=eq.${today}&select=sommeil_h&limit=1`
        );
        const hasSleep = Array.isArray(tracking) && tracking[0]?.sommeil_h > 0;
        if (hasSleep) { skipped++; continue; }

        const ok = await sendPush(
          client.id,
          firstName ? `Bonjour ${firstName}` : "Bonjour",
          "Combien d'heures de sommeil cette nuit ? Logge-le en 5 sec.",
          "/?page=move"
        );
        if (ok) sent++;
      }
    }

    return res.status(200).json({ ok: true, kind, sent, skipped, eligible: clients.length });
  } catch (e) {
    console.error(`[CRON_DAILY_REMINDER_FAILED] kind=${kind} reason="${e.message}"`);
    await captureException(e, { tags: { endpoint: "cron-client-daily-reminder", kind } });
    return res.status(500).json({ error: e.message });
  }
};
