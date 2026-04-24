/**
 * Cron : founder-checkin
 * Schedule : chaque jour 09:00 UTC (10:00/11:00 Paris)
 *
 * Pour chaque coach Founder, envoie un email de check-in à J+3, J+14, J+30
 * après sa création. Objectif : retention + recueil de feedback précoce.
 *
 *   J+3  : "Ton premier client est-il importé ?" + offer the 1:1
 *   J+14 : "2 semaines que tu es Founder — quelle feature manque ?"
 *   J+30 : "30 jours — tu as accès à la faveur parrainage 2 mois offerts"
 *
 * Idempotent : on écrit dans notification_logs type=founder_checkin_jX et on
 * skip si déjà envoyé.
 *
 * Auth : CRON_SECRET (Vercel cron header Authorization: Bearer).
 */

const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = "Rayan Bonte <rayan@rbperform.com>";
const REPLY_TO = "rayan@rbperform.com";

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  return res.status >= 400 ? null : res.json();
}

async function wasSent(coachId, type) {
  const today = new Date().toISOString().split("T")[0];
  const data = await sbFetch(
    `/rest/v1/notification_logs?coach_id=eq.${coachId}&type=eq.${type}&select=id&limit=1`
  );
  return Array.isArray(data) && data.length > 0;
}

async function logSent(coachId, type) {
  const today = new Date().toISOString().split("T")[0];
  await sbFetch("/rest/v1/notification_logs", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ coach_id: coachId, type, sent_date: today }),
  });
}

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) return { ok: false, reason: "no_resend_key" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function wrap(innerHtml) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#e5e5e5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
  <tr><td align="center" style="padding-bottom:24px">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.55);margin-bottom:6px">Founding Member</div>
    <div style="font-size:24px;font-weight:900;color:#f0f0f0;letter-spacing:-1px">RB<span style="color:#02d1ba">.</span>Perform</div>
  </td></tr>
  <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:38px 30px">${innerHtml}</td></tr>
  <tr><td style="padding:28px 0 0">
    <table cellpadding="0" cellspacing="0" style="width:100%"><tr>
      <td style="width:52px;vertical-align:top;padding-right:14px">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#02d1ba,#02d1baaa);color:#000;font-size:18px;font-weight:900;text-align:center;line-height:52px;letter-spacing:-.5px">RB</div>
      </td>
      <td style="vertical-align:top">
        <div style="font-size:13px;color:#fff;font-weight:700;margin-bottom:2px">Rayan</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4)">Fondateur — RB Perform</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center">
    <div style="font-size:10px;color:rgba(255,255,255,0.18);line-height:1.7">
      <a href="https://rbperform.app/status" style="color:rgba(2,209,186,0.45);text-decoration:none">Statut plateforme</a>
      &nbsp;·&nbsp;
      <a href="https://rbperform.app/legal.html#rgpd" style="color:rgba(2,209,186,0.45);text-decoration:none">Désinscription / RGPD</a>
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// ===== TEMPLATES =====

function j3({ firstName }) {
  const hi = firstName ? `Salut ${firstName},` : "Salut,";
  return wrap(`
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:12px">${hi}</div>
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.4px;line-height:1.3;margin-bottom:16px">
      3 jours que tu as rejoint.<br>
      <span style="color:#02d1ba">Une question toute bête.</span>
    </div>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 18px">
      Est-ce que tu as importé ton premier client ? Si oui, <strong style="color:rgba(255,255,255,0.85)">merci</strong>, c'est le geste qui compte. Si non, je veux juste savoir pourquoi — pas pour te vendre un truc, pour comprendre ce qui bloque.
    </p>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 18px">
      Réponds en une ligne à cet email — j'aurai la réponse dans l'heure en semaine.
    </p>
    <p style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;margin:0 0 14px">
      Et si tu veux qu'on prenne <strong>15 min au téléphone pour cadrer ton setup</strong>, dis-moi 3 créneaux où tu es dispo cette semaine.
    </p>
    <p style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.6;margin:12px 0 0">
      PS : l'app est installable en 1 clic sur iPhone (Safari → Partager → Sur l'écran d'accueil) et Android (Chrome → Menu → Installer). Ça change tout pour l'usage quotidien.
    </p>
  `);
}

function j14({ firstName }) {
  const hi = firstName ? `Salut ${firstName},` : "Salut,";
  return wrap(`
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:12px">${hi}</div>
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.4px;line-height:1.3;margin-bottom:16px">
      2 semaines — <span style="color:#02d1ba">qu'est-ce qui te manque</span> ?
    </div>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 18px">
      Tu fais partie des 30 qui ont un <strong>vote direct sur la roadmap</strong>. Je veux savoir : qu'est-ce qui te frustre dans RB Perform actuellement ? Qu'est-ce que tu aimerais voir arriver dans les 30 prochains jours ?
    </p>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 18px">
      3 features les plus demandées par les Founders ce mois = prioritaires pour le sprint suivant. Ta voix compte littéralement.
    </p>
    <p style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7">
      Réponds à cet email avec ton top 1 (ou top 3). Je lis tout personnellement.
    </p>
  `);
}

function j30({ firstName }) {
  const hi = firstName ? `Salut ${firstName},` : "Salut,";
  return wrap(`
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:12px">${hi}</div>
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.4px;line-height:1.3;margin-bottom:16px">
      30 jours. <span style="color:#02d1ba">Tu débloques 2 choses.</span>
    </div>
    <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 18px">
      Un mois que tu fais tourner RB Perform. Si tu es encore là, c'est que ça colle. Deux choses que je veux te proposer :
    </p>

    <div style="background:rgba(2,209,186,0.04);border:1px solid rgba(2,209,186,0.15);border-radius:12px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">1 — Témoignage</div>
      <p style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;margin:0">
        Enregistre-moi une vidéo de 60s — ton retour brut, tes chiffres avant/après si tu en as. En échange : <strong style="color:#02d1ba">ton logo sur la landing</strong> + mention dans le prochain Reel Instagram (1 300 abonnés engagés).
      </p>
    </div>

    <div style="background:rgba(245,200,66,0.04);border:1px solid rgba(245,200,66,0.18);border-radius:12px;padding:16px 18px;margin-bottom:18px">
      <div style="font-size:11px;color:#f5c842;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">2 — Parrainage Founder</div>
      <p style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;margin:0">
        Tu connais un coach qui galère avec son Excel ? Chaque Founder que tu m'envoies et qui signe = <strong style="color:#f5c842">2 mois d'abonnement offerts pour toi</strong>. Zéro limite sur le cumul. Dis-moi simplement son prénom + son Insta par retour de mail.
      </p>
    </div>

    <p style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7">
      Les deux m'intéressent ? Réponds « les deux » et on enchaîne. Pas pressé, pas d'obligation.
    </p>
  `);
}

const VARIANTS = [
  { code: "founder_checkin_j3",  minDays: 3,  maxDays: 4,  template: j3,  subject: (fn) => `${fn ? fn + ", " : ""}3 jours — une question` },
  { code: "founder_checkin_j14", minDays: 14, maxDays: 15, template: j14, subject: (fn) => `${fn ? fn + ", " : ""}2 semaines — ton vote roadmap` },
  { code: "founder_checkin_j30", minDays: 30, maxDays: 31, template: j30, subject: (fn) => `${fn ? fn + ", " : ""}30 jours — 2 trucs pour toi` },
];

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase env missing" });
  if (!RESEND_KEY) return res.status(500).json({ error: "RESEND_API_KEY missing" });

  const sent = [];
  const failed = [];

  try {
    // Pull every active Founder coach
    const coaches = await sbFetch(
      "/rest/v1/coaches?select=id,email,full_name,plan,is_active,created_at&plan=eq.founding&is_active=eq.true"
    );
    if (!Array.isArray(coaches)) return res.status(200).json({ ok: true, sent: 0, note: "no coaches" });

    for (const coach of coaches) {
      const createdAt = new Date(coach.created_at).getTime();
      const ageDays = Math.floor((Date.now() - createdAt) / 86400000);
      const firstName = (coach.full_name || coach.email.split("@")[0]).split(/[ .]/)[0];
      const firstNameCap = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : "";

      for (const v of VARIANTS) {
        if (ageDays < v.minDays || ageDays > v.maxDays) continue;
        if (await wasSent(coach.id, v.code)) continue;

        try {
          await sendEmail(coach.email, v.subject(firstNameCap), v.template({ firstName: firstNameCap }));
          await logSent(coach.id, v.code);
          sent.push({ coach: coach.id, code: v.code });
        } catch (e) {
          console.error(`[CRON_FOUNDER_CHECKIN_MAIL_FAILED] coach=${coach.id} code=${v.code} reason="${e.message}"`);
          await captureException(e, {
            tags: { endpoint: "cron-founder-checkin", stage: "mail", variant: v.code },
            extra: { coach: coach.id, email: coach.email },
          });
          failed.push({ coach: coach.id, code: v.code, reason: e.message });
        }
      }
    }

    return res.status(200).json({ ok: true, sent: sent.length, failed: failed.length, details: { sent, failed } });
  } catch (e) {
    console.error(`[CRON_FOUNDER_CHECKIN_FAILED] reason="${e.message}"`);
    await captureException(e, { tags: { endpoint: "cron-founder-checkin", stage: "uncaught" } });
    return res.status(500).json({ error: e.message });
  }
}
