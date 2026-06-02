/**
 * POST /api/send-push-apns
 *
 * Envoie une notification APNs à tous les devices iOS natifs (apns_token
 * non-NULL) du client ou du coach ciblé. Complète le path web push géré
 * par la Edge Function `send-push` — les deux endpoints sont indépendants
 * et peuvent être appelés en parallèle par le même cron.
 *
 * Body : { client_id?, coach_id?, title, body, url? }
 * Auth : Bearer avec CRON_SECRET (appels internes cron) OU
 *        Bearer avec SUPABASE_SERVICE_ROLE_KEY (appels backend).
 *
 * Comportement si APNs n'est pas configuré (pas encore de compte Apple
 * Developer) : renvoie 503 avec `reason: "APNS_NOT_CONFIGURED"`. Le cron
 * traite ce 503 comme un no-op et ne loggue pas d'erreur — la wave 5
 * peut être déployée en prod AVANT d'avoir les credentials Apple sans
 * impact sur le web push.
 *
 * Cleanup : si APNs renvoie 410 (Unregistered) ou 400 BadDeviceToken pour
 * un token, on DELETE la row push_subscriptions correspondante (token mort).
 *
 * Roadmap : APP_STORE_ROADMAP.md (Wave 5).
 */

const { getServiceClient } = require("./_supabase");
const { isApnsConfigured, sendApnsNotification } = require("./_apns");
const { captureException } = require("./_sentry");

function isAuthorized(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && token === process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  return false;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // No-op silencieux tant qu'on n'a pas les credentials Apple. Le 503
  // signale au cron que c'est un état "configuration manquante" et pas
  // une vraie erreur.
  if (!isApnsConfigured()) {
    return res.status(503).json({ ok: false, reason: "APNS_NOT_CONFIGURED", sent: 0 });
  }

  let body = req.body;
  try {
    if (typeof body === "string") body = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: "Malformed JSON" });
  }
  if (!body) return res.status(400).json({ error: "Missing body" });

  const { client_id, coach_id, title, body: msgBody, url } = body;
  if (!client_id && !coach_id) {
    return res.status(400).json({ error: "client_id or coach_id required" });
  }
  if (!title || !msgBody) {
    return res.status(400).json({ error: "title and body required" });
  }

  try {
    const sb = getServiceClient();
    const filterCol = coach_id ? "coach_id" : "client_id";
    const filterVal = coach_id || client_id;

    // On ne sélectionne QUE les rows avec un apns_token — les rows web push
    // restent gérées par la Edge Function send-push.
    const { data: subs, error } = await sb
      .from("push_subscriptions")
      .select("id, apns_token")
      .eq(filterCol, filterVal)
      .not("apns_token", "is", null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!subs || subs.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, total: 0, dead: 0 });
    }

    let sent = 0, dead = 0;
    const errors = [];

    await Promise.all(subs.map(async (row) => {
      const result = await sendApnsNotification(row.apns_token, {
        title, body: msgBody, url: url || "/",
      });
      if (result.ok) {
        sent++;
        return;
      }
      if (result.dead) {
        dead++;
        // Token mort → on supprime la row pour ne plus retenter
        await sb.from("push_subscriptions").delete().eq("id", row.id).then(() => {}, () => {});
        return;
      }
      errors.push({ status: result.status, error: result.error });
    }));

    return res.status(200).json({ ok: true, sent, total: subs.length, dead, errors });
  } catch (e) {
    console.error(`[SEND_PUSH_APNS_FAILED] reason="${e.message}"`);
    await captureException(e, { tags: { endpoint: "send-push-apns" } });
    return res.status(500).json({ error: e.message });
  }
};
