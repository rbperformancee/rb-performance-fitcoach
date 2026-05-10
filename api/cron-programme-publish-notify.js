/**
 * Cron : notifier les clients quand leur programme planifié devient dispo.
 *
 * Pickup : programmes is_active=true AND published_at <= NOW() AND notif_sent_at IS NULL
 *
 * Pour chaque programme :
 *   - Push notification au client (deep link → /training)
 *   - Email (best-effort, signé Zoho DKIM)
 *   - Marque notif_sent_at = NOW() pour pas re-notifier
 *
 * Fréquence : toutes les heures (cf vercel.json).
 *
 * Note : "Publier maintenant" depuis le builder appelle directement
 * /api/notify-client-programme-published pour un push instantané.
 * Cette cron rattrappe les programmes planifiés dont la date est passée.
 */

const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || "https://rbperform.app";

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON_AUTH_FAIL] CRON_SECRET missing");
    return false;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

async function sendPush(clientId, title, body, url) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ client_id: clientId, title, body, url }),
    });
    return r.ok;
  } catch (e) {
    console.warn("[programme-notify] push failed", clientId, e?.message);
    return false;
  }
}

async function sendEmail(toEmail, clientName, programmeName) {
  const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
  const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
  if (!SMTP_PASS) return false;

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const firstName = (clientName || "").split(" ")[0] || "";
  const greeting = firstName ? `Salut ${firstName},` : "Salut,";
  const safeName = String(programmeName || "Nouveau programme").replace(/[<>]/g, "");

  const html = `<html><body style="background:#0a0a0a;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;">
    <div style="max-width:480px;margin:0 auto;">
      <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.7);margin-bottom:6px;">RB Perform</div>
      <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:16px;letter-spacing:-0.5px;">Ton programme est dispo</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;margin-bottom:24px;">
        ${greeting}<br><br>
        Ton coach vient de publier <strong style="color:#02d1ba;">${safeName}</strong>.<br>
        Tu peux le découvrir et commencer maintenant.
      </div>
      <a href="${APP_URL}/training" style="display:inline-block;background:#02d1ba;color:#000;text-decoration:none;font-weight:800;font-size:13px;padding:14px 28px;border-radius:10px;letter-spacing:0.3px;">Voir mon programme</a>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:24px;">— RB Perform</div>
    </div>
  </body></html>`;

  try {
    await transporter.sendMail({
      from: `RB Perform <${SMTP_USER}>`,
      to: toEmail,
      replyTo: SMTP_USER,
      subject: "Ton programme est dispo",
      html,
    });
    return true;
  } catch (e) {
    console.warn("[programme-notify] email failed", toEmail, e?.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Missing Supabase env" });

  try {
    const now = new Date().toISOString();
    // Pickup : programmes is_active=true, published <= now, pas encore notifiés
    const url = `/rest/v1/programmes?select=id,client_id,programme_name&is_active=eq.true&published_at=not.is.null&published_at=lte.${encodeURIComponent(now)}&notif_sent_at=is.null&limit=200`;
    const r = await sbFetch(url);
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`pickup failed ${r.status}: ${txt}`);
    }
    const pending = await r.json();

    if (!Array.isArray(pending) || pending.length === 0) {
      return res.status(200).json({ ok: true, processed: 0 });
    }

    // Charge les emails+full_name des clients en un seul shot
    const clientIds = [...new Set(pending.map((p) => p.client_id).filter(Boolean))];
    const idsCsv = clientIds.map((id) => `"${id}"`).join(",");
    const clientsRes = await sbFetch(`/rest/v1/clients?select=id,email,full_name&id=in.(${idsCsv})`);
    const clients = clientsRes.ok ? await clientsRes.json() : [];
    const clientById = new Map(clients.map((c) => [c.id, c]));

    let pushOk = 0, emailOk = 0, errors = 0;
    for (const prog of pending) {
      const c = clientById.get(prog.client_id);
      if (!c) { errors++; continue; }
      const name = prog.programme_name || "Nouveau programme";

      const [pOk, eOk] = await Promise.all([
        sendPush(c.id, "Ton programme est dispo", `${name} — ouvre l'app pour commencer.`, "/training"),
        c.email ? sendEmail(c.email, c.full_name, name) : Promise.resolve(false),
      ]);
      if (pOk) pushOk++;
      if (eOk) emailOk++;

      // Marque notifié (même si push ET email ont échoué — on évite la boucle infinie)
      const upd = await sbFetch(`/rest/v1/programmes?id=eq.${prog.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ notif_sent_at: new Date().toISOString() }),
      });
      if (!upd.ok) errors++;
    }

    console.log(`[CRON_PROGRAMME_NOTIFY] processed=${pending.length} push=${pushOk} email=${emailOk} errors=${errors}`);
    return res.status(200).json({ ok: true, processed: pending.length, push: pushOk, email: emailOk, errors });
  } catch (err) {
    console.error("[CRON_PROGRAMME_NOTIFY_FAILED]", err.message);
    await captureException(err, { tags: { endpoint: "cron-programme-publish-notify" } });
    return res.status(500).json({ error: err.message });
  }
};
