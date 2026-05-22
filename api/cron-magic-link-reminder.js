/**
 * Cron magic-link reminder — Vercel Cron Job
 *
 * Schedule : tous les jours à 10h UTC. Cf. vercel.json.
 *
 * Problème résolu : un coach paye 199€ via Stripe, reçoit un magic link
 * pour set son password. Le lien expire après 1h (ou 24h si setting upgrade).
 * Si le coach ne clique pas à temps → bloqué. Il doit aller manuellement
 * sur /welcome (qui propose un renvoi) ou /login → forgot password.
 *
 * Ce cron envoie automatiquement un email de rappel avec un nouveau magic
 * link aux coachs qui ont payé mais jamais loggé.
 *
 * Cadence : 2 rappels max (J+1, J+3). Après 7j, on stop — un email manuel
 * de Rayan a plus de chance de convertir un lead qui ne répond pas.
 *
 * Idempotence : on track les emails envoyés via raw_app_meta_data.reminders
 * sur auth.users :
 *   {
 *     last_reminder_at: "2026-05-23T10:00:00Z",
 *     reminder_count: 1   // 0 → 1 (J+1) → 2 (J+3)
 *   }
 *
 * On utilise auth.users (pas coaches) parce que :
 *   - last_sign_in_at est le seul signal fiable "n'a jamais loggé"
 *   - raw_app_meta_data est éditable via Auth Admin API sans migration DB
 */

const { captureException } = require("./_sentry");
const nodemailer = require("nodemailer");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const SITE = "https://rbperform.app";
const G = "#02d1ba";

// Stop après 2 rappels (J+1 et J+3) — au-delà email manuel
const MAX_REMINDERS = 2;

// Fenêtres d'envoi (en heures depuis created_at)
const REMINDER_WINDOWS = [
  { count: 0, minHours: 18, maxHours: 36 },  // J+1 (entre 18h et 36h après signup)
  { count: 1, minHours: 60, maxHours: 84 },  // J+3 (entre 60h et 84h)
];

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
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

async function getCoachRow(email) {
  // Lookup coach via REST API to get plan + locked_price for email personalization
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/coaches?email=eq.${encodeURIComponent(email)}&select=full_name,subscription_plan,locked_price&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function generateMagicLink(email, plan, lockedPrice) {
  const welcomeQuery = `plan=${encodeURIComponent(plan || "founding")}${lockedPrice ? `&price=${encodeURIComponent(lockedPrice)}` : ""}`;
  const linkData = await sbAuthFetch("/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({
      type: "recovery",
      email: email.toLowerCase(),
      options: {
        redirectTo: `${SITE}/welcome?${welcomeQuery}`,
      },
    }),
  });
  return (linkData && linkData.action_link) || (linkData && linkData.properties && linkData.properties.action_link) || null;
}

function buildEmailHtml({ firstName, magicLink, plan, lockedPrice, reminderCount }) {
  const greeting = firstName ? `${firstName},` : "Salut,";
  const planName = plan === "founding" ? "Founding Coach Program" : `plan ${plan || "RB Perform"}`;
  const priceLine = lockedPrice ? `<strong style="color:${G}">${lockedPrice}€/mois bloqué à vie</strong>` : "";

  const introByCount = reminderCount === 0
    ? `Tu as réservé ta place sur le <strong>${planName}</strong> hier${priceLine ? ` (${priceLine})` : ""}, mais tu n'as pas encore défini ton mot de passe pour accéder à ton dashboard coach.`
    : `2e rappel — Ta place sur le <strong>${planName}</strong>${priceLine ? ` (${priceLine})` : ""} est toujours là, mais ton compte n'est pas encore activé. Voici un nouveau lien.`;

  const urgency = reminderCount === 0
    ? "Le lien initial est probablement expiré (1h après envoi). Voici un nouveau lien valable 24h."
    : "Si tu rencontres un blocage technique, réponds à cet email — Rayan répond perso sous 24h.";

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Inter',Arial,sans-serif;color:#fff;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">

  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:${G};margin-bottom:8px;">● RB Perform</div>
  </div>

  <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;margin:0 0 16px;color:#fff;">
    ${greeting}<br/>Active ton accès en 30 secondes.
  </h1>

  <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,0.75);margin:0 0 20px;">
    ${introByCount}
  </p>

  <p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.6);margin:0 0 28px;">
    ${urgency}
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="${magicLink}" style="display:inline-block;padding:16px 32px;background:${G};color:#000;border-radius:100px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">
      Définir mon mot de passe →
    </a>
  </div>

  <p style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.5;margin:32px 0 0;text-align:center;">
    Lien direct (si le bouton ne marche pas) :<br/>
    <a href="${magicLink}" style="color:${G};word-break:break-all;text-decoration:none;">${magicLink}</a>
  </p>

  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:40px 0 24px;" />

  <p style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.6;text-align:center;">
    Tu as reçu cet email parce que tu as payé pour le ${planName} mais ton compte n'est pas encore activé.<br/>
    Une question ? Réponds à cet email — c'est Rayan qui te lit perso.<br/><br/>
    <em>RB Perform — La performance sans compromis.</em>
  </p>

</div>
</body></html>`;
}

async function sendReminderEmail({ to, html, subject, reminderCount }) {
  if (!SMTP_PASS) {
    console.warn(`[CRON_REMINDER] SMTP password missing — skipping email to ${to}`);
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
    headers: {
      "List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>`,
      "X-Reminder-Count": String(reminderCount),
    },
  });
  return true;
}

async function listEligibleUsers() {
  // Récupère les users via /admin/users (paginated).
  // On filtre côté code : last_sign_in_at NULL + created_at dans la bonne fenêtre.
  const allUsers = [];
  let page = 1;
  const perPage = 200;
  while (page <= 5) {  // safety : max 1000 users scannés
    const result = await sbAuthFetch(`/admin/users?page=${page}&per_page=${perPage}`);
    const users = (result && result.users) || [];
    if (users.length === 0) break;
    allUsers.push(...users);
    if (users.length < perPage) break;
    page++;
  }
  return allUsers;
}

function shouldRemindNow(user) {
  // Filtres :
  // 1. Coach (role coach dans user_metadata)
  const role = user.user_metadata && user.user_metadata.role;
  if (role !== "coach") return null;

  // 2. Jamais loggé
  if (user.last_sign_in_at) return null;

  // 3. Reminder count < MAX
  const meta = user.app_metadata || {};
  const reminders = meta.reminders || {};
  const reminderCount = reminders.reminder_count || 0;
  if (reminderCount >= MAX_REMINDERS) return null;

  // 4. Created_at dans la bonne fenêtre pour ce reminderCount
  const createdAt = new Date(user.created_at);
  const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const window = REMINDER_WINDOWS.find((w) => w.count === reminderCount);
  if (!window) return null;
  if (hoursSinceCreated < window.minHours || hoursSinceCreated > window.maxHours) return null;

  // 5. Pas envoyé dans les dernières 18h (anti-double-trigger)
  if (reminders.last_reminder_at) {
    const lastSent = new Date(reminders.last_reminder_at);
    const hoursSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSent < 18) return null;
  }

  return { reminderCount, hoursSinceCreated };
}

async function updateReminderMeta(userId, currentReminders) {
  const newReminders = {
    last_reminder_at: new Date().toISOString(),
    reminder_count: (currentReminders.reminder_count || 0) + 1,
  };
  await sbAuthFetch(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({
      app_metadata: { reminders: newReminders },
    }),
  });
  return newReminders;
}

module.exports = async (req, res) => {
  // Auth — accepte soit le Bearer CRON_SECRET, soit l'invocation Vercel native
  const isVercelCron = req.headers["user-agent"] && req.headers["user-agent"].includes("vercel-cron");
  if (!isAuthorizedCron(req) && !isVercelCron) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (!SUPABASE_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" });
  }

  const startedAt = Date.now();
  const stats = { scanned: 0, eligible: 0, sent: 0, failed: 0, skipped: 0 };

  try {
    const users = await listEligibleUsers();
    stats.scanned = users.length;

    for (const user of users) {
      const decision = shouldRemindNow(user);
      if (!decision) {
        stats.skipped++;
        continue;
      }
      stats.eligible++;

      try {
        const coach = await getCoachRow(user.email);
        const firstName = (coach && coach.full_name && coach.full_name.split(" ")[0]) || null;
        const plan = (coach && coach.subscription_plan) || "founding";
        const lockedPrice = coach && coach.locked_price;

        const magicLink = await generateMagicLink(user.email, plan, lockedPrice);
        if (!magicLink) {
          console.error(`[CRON_REMINDER] No magic link for ${user.email}`);
          stats.failed++;
          continue;
        }

        const subject = decision.reminderCount === 0
          ? `Active ton accès RB Perform — ${plan === "founding" ? "Founding Coach" : plan}`
          : `Dernier rappel — Ton accès RB Perform t'attend`;

        const html = buildEmailHtml({
          firstName,
          magicLink,
          plan,
          lockedPrice,
          reminderCount: decision.reminderCount,
        });

        const sent = await sendReminderEmail({ to: user.email, html, subject, reminderCount: decision.reminderCount });
        if (!sent) {
          stats.failed++;
          continue;
        }

        // Update metadata pour éviter de re-envoyer
        await updateReminderMeta(user.id, (user.app_metadata && user.app_metadata.reminders) || {});
        stats.sent++;
        console.log(`[CRON_REMINDER] Sent reminder #${decision.reminderCount + 1} to ${user.email}`);
      } catch (err) {
        stats.failed++;
        console.error(`[CRON_REMINDER] Error for ${user.email}:`, err.message);
        await captureException(err, {
          tags: { endpoint: "cron-magic-link-reminder", email: user.email },
        });
      }
    }

    const duration = Date.now() - startedAt;
    console.log(`[CRON_REMINDER] Done in ${duration}ms — stats:`, JSON.stringify(stats));
    return res.status(200).json({ ok: true, durationMs: duration, ...stats });
  } catch (err) {
    console.error(`[CRON_REMINDER] Fatal:`, err.message);
    await captureException(err, { tags: { endpoint: "cron-magic-link-reminder", stage: "fatal" } });
    return res.status(500).json({ error: err.message, ...stats });
  }
};
