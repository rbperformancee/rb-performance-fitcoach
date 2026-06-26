/**
 * Cron weekly checkin prompt — Vercel Cron Job
 *
 * Schedule : dimanche 19h UTC (≈ 20h-21h Paris selon DST). Cf. vercel.json.
 *
 * Pour chaque client qui n'a pas encore soumis de bilan pour la semaine
 * en cours :
 *   1. S'il a au moins une push_subscription active → push (canal principal)
 *   2. SINON s'il a un email → fallback email via Zoho SMTP
 *   3. Sinon log et skip
 *
 * Pourquoi le fallback : ~70 % des clients n'activent jamais les push
 * (refus iOS, jamais lancé l'app, etc.). Sans email, ils ne reçoivent
 * AUCUN rappel — d'où 0 bilan certaines semaines. L'email est leur seul
 * point de contact garanti.
 */

const { captureException } = require("./_sentry");
const nodemailer = require("nodemailer");

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
  const url = deepLink || "/login?view=checkin";
  const payload = JSON.stringify({ client_id: clientId, title, body, url });
  let webOk = false, apnsOk = false;

  // 1. Web Push (Supabase Edge Function) — Chrome/Safari/Android web push
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
      body: payload,
    });
    if (r.ok) {
      // L'edge répond 200 même si 0 sub valide → check le compteur `sent`.
      try { const j = await r.json(); webOk = (j?.sent || 0) > 0; } catch {}
    }
  } catch (e) { console.warn("[checkin] webpush failed for", clientId, e?.message); }

  // 2. APNs (iOS natif via Capacitor) — endpoint Vercel api/send-push-apns
  try {
    const base = process.env.APP_BASE_URL || "https://rbperform.app";
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const r = await fetch(`${base}/api/send-push-apns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cronSecret}` },
        body: payload,
      });
      // 503 = APNs pas configuré → attendu, on skip silencieux.
      // 200 = success → parse sent
      if (r.status === 200) {
        try { const j = await r.json(); apnsOk = (j?.sent || 0) > 0; } catch {}
      } else if (r.status !== 503) {
        const t = await r.text().catch(() => "");
        console.warn("[checkin] apns status", r.status, "for", clientId, t.slice(0, 120));
      }
    }
  } catch (e) { console.warn("[checkin] apns failed for", clientId, e?.message); }

  return webOk || apnsOk;
}

// SMTP Zoho — partagé avec les autres mails app (invite, welcome, recap).
let _smtp = null;
function smtp() {
  if (_smtp) return _smtp;
  const user = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
  const pass = (process.env.ZOHO_SMTP_PASS || "").replace(/\s+/g, "");
  if (!pass) return null;
  _smtp = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return _smtp;
}

function buildCheckinEmailHtml({ firstName, joinUrl, tpl }) {
  const greeting = firstName ? `Salut ${firstName},` : "Salut,";
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td style="text-align:center;margin-bottom:24px;padding-bottom:24px">
        <svg viewBox="170 50 180 410" width="18" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill="#02d1ba"/>
        </svg>
      </td></tr>
      <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px;">
        <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px">${greeting}</div>
        <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:16px;line-height:1.3">
          ${tpl.mailH1(firstName)}
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:32px">
          ${tpl.mailIntro}
        </div>
        <div style="text-align:center;margin-bottom:20px">
          <a href="${joinUrl}" style="display:inline-block;background:#02d1ba;color:#000;font-size:13px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:.08em;text-transform:uppercase;">
            ${tpl.mailCta} →
          </a>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.25);text-align:center;letter-spacing:.04em">
          Si tu n'as rien de spécial à signaler : c'est OK, prends 30 secondes pour me dire que tout roule.
        </div>
      </td></tr>
      <tr><td style="padding:24px 0 0;text-align:center;">
        <div style="font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:.04em">Rayan · RB Perform</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendCheckinEmail(client, joinUrl, tpl) {
  const t = smtp();
  if (!t) return false;
  const firstName = (client.full_name || "").split(" ")[0] || "";
  try {
    await t.sendMail({
      from: `Rayan · RB Perform <${process.env.ZOHO_SMTP_USER || "rayan@rbperform.app"}>`,
      to: client.email,
      replyTo: process.env.ZOHO_SMTP_USER || "rayan@rbperform.app",
      subject: tpl.mailSubject(firstName),
      html: buildCheckinEmailHtml({ firstName, joinUrl, tpl }),
    });
    return true;
  } catch (e) {
    console.warn("[checkin] email failed for", client.id, e?.message);
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

// Tonalité du message selon le jour de la semaine.
// Le bilan reflète la semaine écoulée → on cale les 3 prompts fin/début
// de semaine, pas en plein milieu (envoyer le "dernier rappel" un jeudi
// n'avait pas de sens : la semaine n'est pas encore finie).
// - samedi   : 1er prompt (la semaine se termine, invitation calme)
// - dimanche : relance (le soir, avant la bascule)
// - lundi    : dernier rappel (la nouvelle semaine commence, il faut
//              clôturer la précédente)
// - autres   : tonalité standard (utile pour run manuel)
function templatesForToday() {
  const day = new Date().getUTCDay(); // 0=dim, 1=lun, 6=sam
  if (day === 0) {
    return {
      pushTitle: (n) => (n ? `${n}, on attend ton bilan` : "On attend ton bilan"),
      pushBody: "La semaine se termine. 30 secondes — c'est tout.",
      mailSubject: (n) => (n ? `${n}, on attend ton bilan — 30s` : "On attend ton bilan — 30s"),
      mailH1: (n) => `On attend ton bilan${n ? ` ${n}` : ""}.`,
      mailIntro: "30 secondes. Poids, ressenti, c'est tout. Si tout va bien, dis-le moi — je préfère ça que pas de nouvelles.",
      mailCta: "Faire mon bilan",
    };
  }
  if (day === 1) {
    return {
      pushTitle: (n) => (n ? `${n}, dernier rappel bilan` : "Dernier rappel bilan"),
      pushBody: "Sans ton bilan, j'avance à l'aveugle pour la semaine qui commence. 30s.",
      mailSubject: (n) => (n ? `${n}, dernier rappel — ton bilan` : "Dernier rappel — ton bilan"),
      mailH1: (n) => `Dernier rappel${n ? ` ${n}` : ""} : ton bilan.`,
      mailIntro: "Sans tes infos je ne peux pas adapter ton plan pour la semaine qui commence. 30 secondes — promis. Si tu n'as rien à signaler, dis-le moi quand même.",
      mailCta: "Faire mon bilan",
    };
  }
  // samedi & fallback (premier prompt)
  return {
    pushTitle: (n) => (n ? `${n}, ton bilan ?` : "Ton bilan de la semaine"),
    pushBody: "30 secondes : poids, ressenti, photos. Ton coach voit ta progression.",
    mailSubject: (n) => (n ? `${n}, ton bilan de la semaine — 30s` : "Ton bilan de la semaine — 30s"),
    mailH1: () => `Ton bilan de la semaine, 30 secondes.`,
    mailIntro: "Poids, ressenti, photos si tu veux. Ça me permet de voir où tu en es et d'ajuster ton plan pour la semaine prochaine — au lieu de te laisser sur les rails.",
    mailCta: "Remplir mon bilan",
  };
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase env missing" });
  }

  try {
    const weekStart = currentWeekStart();
    const appBase = process.env.APP_BASE_URL || "https://rbperform.app";
    const joinUrl = `${appBase}/login?view=checkin`;
    const tpl = templatesForToday();

    // 1. TOUS les clients actifs (pas filtrés sur push — fallback email)
    const clients = await sbFetch(`/rest/v1/clients?select=id,full_name,email&limit=500`);
    if (!Array.isArray(clients)) {
      return res.status(500).json({ error: "Failed to load clients" });
    }
    if (clients.length === 0) {
      return res.status(200).json({ ok: true, eligible: 0, sent: 0, weekStart });
    }
    const idsCsv = clients.map((c) => `"${c.id}"`).join(",");

    // 2. Push subscriptions actives → Set d'IDs clients ayant au moins une push
    const subs = await sbFetch(`/rest/v1/push_subscriptions?select=client_id`);
    const pushSet = new Set(Array.isArray(subs) ? subs.map((s) => s.client_id).filter(Boolean) : []);

    // 3. Clients qui ont DÉJÀ soumis pour cette semaine
    const submitted = await sbFetch(
      `/rest/v1/weekly_checkins?week_start=eq.${weekStart}&client_id=in.(${idsCsv})&select=client_id`
    );
    const submittedSet = new Set(Array.isArray(submitted) ? submitted.map((s) => s.client_id) : []);

    let pushSent = 0;
    let emailSent = 0;
    let alreadySubmitted = 0;
    let noChannel = 0;

    for (const c of clients) {
      if (submittedSet.has(c.id)) { alreadySubmitted++; continue; }

      const firstName = (c.full_name || "").split(" ")[0] || "";

      // Canal 1 : push si abonné
      if (pushSet.has(c.id)) {
        const ok = await sendPush(c.id, tpl.pushTitle(firstName), tpl.pushBody, "/login?view=checkin");
        if (ok) pushSent++;
        continue;
      }

      // Canal 2 : fallback email
      if (c.email) {
        const ok = await sendCheckinEmail(c, joinUrl, tpl);
        if (ok) emailSent++;
        continue;
      }

      noChannel++;
    }

    return res.status(200).json({
      ok: true,
      weekStart,
      eligible: clients.length,
      alreadySubmitted,
      pushSent,
      emailSent,
      noChannel,
    });
  } catch (e) {
    console.error("[cron-weekly-checkin-prompt]", e);
    await captureException(e, { tags: { endpoint: "cron-weekly-checkin-prompt" } });
    return res.status(500).json({ error: e.message });
  }
};
