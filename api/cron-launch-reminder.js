/**
 * Cron launch reminder — Vercel Cron Job
 *
 * Schedule : tous les jours à 07h UTC (= 09h Paris en été DST).
 * Cf. vercel.json.
 *
 * Logique :
 * - 25 mai 2026 (J-1) → envoie email "L'app ouvre demain à 09h"
 * - 26 mai 2026 (J-Day) → envoie email "C'est ouvert, click pour entrer"
 * - Autres jours : skip (return early)
 *
 * Cible : tous les coachs Founding (subscription_plan='founding') qui ont
 * complété leur onboarding (onboarding_completed_at NOT NULL).
 *
 * Idempotence : on track les emails envoyés via raw_app_meta_data :
 *   launch_reminder_j1_at, launch_reminder_jday_at
 * Skip si déjà envoyé.
 */

const { captureException } = require("./_sentry");
const nodemailer = require("nodemailer");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const G = "#02d1ba";

// Date launch officiel (UTC). Doit matcher WaitingForLaunchScreen.jsx APP_UNLOCK_AT.
const LAUNCH_AT = new Date("2026-05-26T07:00:00Z");

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

async function sbAuthFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    body: options.body || undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Auth ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.headers.get("content-type")?.includes("application/json") ? res.json() : null;
}

async function getFoundingCoaches() {
  // Coachs Founding avec onboarding complété
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/coaches?subscription_plan=eq.founding&onboarding_completed_at=not.is.null&select=id,email,full_name,subscription_plan,locked_price`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }
  );
  if (!res.ok) return [];
  return await res.json();
}

async function getUserMeta(email) {
  const result = await sbAuthFetch(`/admin/users?email=${encodeURIComponent(email)}`);
  const users = (result && result.users) || [];
  return users[0] || null;
}

async function updateUserMeta(userId, key, value) {
  const user = await sbAuthFetch(`/admin/users/${userId}`);
  const currentMeta = user.app_metadata || {};
  await sbAuthFetch(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({
      app_metadata: { ...currentMeta, [key]: value },
    }),
  });
}

function buildEmailHtml({ firstName, phase, hoursToLaunch }) {
  const greeting = firstName ? `${firstName},` : "Salut,";

  let eyebrow, title, body, ctaLabel;
  if (phase === "jday") {
    eyebrow = "● C'est ouvert";
    title = "Ton accès est ouvert.";
    body = "Le Founding Coach Program est officiellement live. Click ci-dessous pour entrer dans ton dashboard et commencer à coacher.";
    ctaLabel = "Entrer dans mon dashboard →";
  } else {
    // J-1
    eyebrow = "● Demain on lance";
    title = "Plus que 24h.";
    body = "Demain 26 mai à 09h00 (Paris), ton dashboard Founding s'ouvre officiellement. Tu n'as rien à faire — connecte-toi à partir de 09h.";
    ctaLabel = "Voir le countdown →";
  }

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Inter',Arial,sans-serif;color:#fff;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#050505;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;">

  <tr><td align="center" style="padding-bottom:32px;">
    <div style="font-size:22px;font-weight:900;letter-spacing:0.12em;color:#fff;">RB<span style="color:${G};">PERFORM</span></div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:14px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:${G};">${eyebrow}</div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:18px;">
    <h1 style="margin:0;font-size:32px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;color:#fff;">${greeting}<br/>${title}</h1>
  </td></tr>

  <tr><td align="left" style="padding-bottom:28px;">
    <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.75);">${body}</p>
  </td></tr>

  <tr><td align="center" style="padding:8px 0 32px;">
    <a href="https://rbperform.app/app.html"
       style="display:inline-block;padding:16px 36px;background:${G};color:#000;border-radius:100px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">
      ${ctaLabel}
    </a>
  </td></tr>

  ${phase === "j1" ? `
  <tr><td align="left" style="padding-bottom:24px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:10px;">Pour info</div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.55);">
      Tu reçois ce mail parce que tu es <strong style="color:#fff;">Founding Coach</strong> et tu as terminé ton onboarding. Demain matin un 2e email te confirmera l'ouverture.
    </p>
  </td></tr>` : ""}

  <tr><td align="center" style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.4);"><em>RB Perform — La performance sans compromis.</em></p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">
      Une question ? Réponds à cet email — c'est Rayan qui te lit perso.
    </p>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

async function sendEmail({ to, subject, html }) {
  if (!SMTP_PASS) {
    console.warn(`[CRON_LAUNCH] SMTP password missing — skipping ${to}`);
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: `RB Perform <${SMTP_USER}>`,
    to,
    subject,
    html,
    headers: { "List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>` },
  });
  return true;
}

module.exports = async (req, res) => {
  const isVercelCron = req.headers["user-agent"] && req.headers["user-agent"].includes("vercel-cron");
  if (!isAuthorizedCron(req) && !isVercelCron) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!SUPABASE_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" });
  }

  const now = Date.now();
  const launchTime = LAUNCH_AT.getTime();
  const hoursToLaunch = (launchTime - now) / (1000 * 60 * 60);

  // Détecte phase : J-1 (entre 12h et 36h avant launch) OU J-Day (entre -2h et +2h)
  let phase = null;
  let metaKey = null;
  let subject = null;
  if (hoursToLaunch >= 12 && hoursToLaunch <= 36) {
    phase = "j1";
    metaKey = "launch_reminder_j1_at";
    subject = "L'app ouvre demain à 09h — RB Perform Founding";
  } else if (hoursToLaunch >= -2 && hoursToLaunch <= 2) {
    phase = "jday";
    metaKey = "launch_reminder_jday_at";
    subject = "C'est ouvert — Ton accès Founding est live";
  } else {
    return res.status(200).json({
      ok: true,
      skipped: true,
      hoursToLaunch: Math.round(hoursToLaunch * 10) / 10,
      message: "Hors fenêtre de rappel (J-1 ou J-Day uniquement)",
    });
  }

  const startedAt = Date.now();
  const stats = { eligible: 0, sent: 0, skipped: 0, failed: 0, phase };

  try {
    const coaches = await getFoundingCoaches();
    stats.eligible = coaches.length;

    for (const coach of coaches) {
      try {
        const user = await getUserMeta(coach.email);
        if (!user) {
          stats.skipped++;
          continue;
        }
        const meta = user.app_metadata || {};
        if (meta[metaKey]) {
          // Déjà envoyé
          stats.skipped++;
          continue;
        }

        const firstName = (coach.full_name || "").split(" ")[0] || null;
        const html = buildEmailHtml({ firstName, phase, hoursToLaunch });
        const sent = await sendEmail({ to: coach.email, subject, html });
        if (!sent) {
          stats.failed++;
          continue;
        }

        await updateUserMeta(user.id, metaKey, new Date().toISOString());
        stats.sent++;
        console.log(`[CRON_LAUNCH] Sent ${phase} reminder to ${coach.email}`);
      } catch (err) {
        stats.failed++;
        console.error(`[CRON_LAUNCH] Error for ${coach.email}:`, err.message);
        await captureException(err, {
          tags: { endpoint: "cron-launch-reminder", phase, email: coach.email },
        });
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`[CRON_LAUNCH] Done ${phase} in ${durationMs}ms —`, JSON.stringify(stats));
    return res.status(200).json({ ok: true, durationMs, ...stats });
  } catch (err) {
    console.error(`[CRON_LAUNCH] Fatal:`, err.message);
    await captureException(err, { tags: { endpoint: "cron-launch-reminder", stage: "fatal" } });
    return res.status(500).json({ error: err.message, ...stats });
  }
};
