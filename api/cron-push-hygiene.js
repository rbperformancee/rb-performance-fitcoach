/**
 * Cron push hygiene — Vercel Cron Job (quotidien 5h UTC = 7h Paris).
 *
 * Probleme : Apple Push Service invalide silencieusement les
 * subscriptions au bout de 2-4 semaines. Apple repond 'sent ok' cote
 * serveur mais ne livre rien cote device. L'athlete arrete de recevoir
 * ses rappels sans comprendre pourquoi.
 *
 * Mecanique :
 *   - Subs Apple AGE 14-21j AVEC warned_at NULL :
 *       envoie 1 email "tap to re-enable" + UPDATE warned_at = NOW().
 *       Si warned_at NOT NULL : skip (anti-spam, 1 seul warning).
 *   - Subs Apple AGE > 21j :
 *       envoie email final + DELETE row. L'athlete devra reactiver
 *       manuellement dans Profile.
 *
 * Pas de traitement FCM (Android) car FCM ne souffre pas de ce bug.
 *
 * Idempotent : si le cron tombe 2x dans la meme journee, warned_at
 * empeche le 2e mail. Robuste aux retries Vercel.
 */

const nodemailer = require("nodemailer");
const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER;
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON_AUTH_FAIL] CRON_SECRET missing");
    return false;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase ${res.status}: ${t}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function sendEmail(to, subject, html) {
  if (!SMTP_PASS) {
    console.warn("[push-hygiene] ZOHO_SMTP_PASS missing — skip email");
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: `RB Perform <${SMTP_USER}>`,
      to,
      replyTo: SMTP_USER,
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.warn("[push-hygiene] email failed:", e?.message);
    return false;
  }
}

/**
 * Template HTML email — design premium cohérent avec l'app
 * (noir + teal accent). Mobile-first, fonts safe, single-column.
 */
function buildEmailHtml({ firstName, kind }) {
  const isFinal = kind === "final";
  const headline = isFinal
    ? `${firstName ? firstName + ", " : ""}tes notifs RB Perform sont à réactiver`
    : `${firstName ? firstName + ", " : ""}réactive tes notifs RB Perform`;
  const subtitle = isFinal
    ? "On a dû reset ton inscription aux notifications. iOS invalide silencieusement les tokens au bout de quelques semaines — c'est un bug Apple connu, rien que tu aies fait."
    : "Tes notifs vont arrêter de fonctionner d'ici quelques jours (bug iOS connu). 10 secondes pour les remettre à neuf.";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f5f5f5;">
  <div style="max-width:540px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;letter-spacing:3px;font-weight:800;color:#02d1ba;text-transform:uppercase;">RB Perform</div>
    </div>

    <div style="background:linear-gradient(160deg,rgba(2,209,186,0.05),rgba(15,15,15,0.5));border:1px solid rgba(2,209,186,0.18);border-radius:18px;padding:28px 24px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.2;">${headline}</h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7);">${subtitle}</p>

      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px 16px;margin:16px 0;">
        <div style="font-size:11px;color:#02d1ba;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">En 3 étapes</div>
        <ol style="margin:0;padding-left:18px;color:rgba(255,255,255,0.75);font-size:13.5px;line-height:1.7;">
          <li>Ouvre <strong style="color:#fff;">rbperform.app</strong> sur ton iPhone</li>
          <li>Va dans <strong style="color:#fff;">Profil → Notifications</strong></li>
          <li>Tape <strong style="color:#02d1ba;">↻ Réinitialiser les notifications</strong> ${isFinal ? "(ou <strong>Activer</strong> si elles sont OFF)" : ""}</li>
        </ol>
      </div>

      <div style="text-align:center;margin-top:22px;">
        <a href="https://rbperform.app/?view=profil" style="display:inline-block;padding:14px 28px;background:#02d1ba;color:#04201d;text-decoration:none;border-radius:100px;font-weight:800;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">Ouvrir l'app</a>
      </div>
    </div>

    <p style="margin:24px 0 6px;font-size:11px;color:rgba(255,255,255,0.35);text-align:center;line-height:1.5;">
      Ce message est automatique — il sert juste à éviter que tu rates tes rappels du matin et du soir.
      <br/>Tu peux répondre à cet email si tu as une question.
    </p>
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.2);text-align:center;">RB Perform · rb.performancee@gmail.com</p>
  </div>
</body></html>`;
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase env missing" });

  const now = new Date();
  const ms14 = 14 * 24 * 3600 * 1000;
  const ms21 = 21 * 24 * 3600 * 1000;
  const cutoffWarn = new Date(now.getTime() - ms14).toISOString();
  const cutoffPurge = new Date(now.getTime() - ms21).toISOString();

  let warned = 0;
  let purged = 0;
  let purgedNoEmail = 0;
  let skipped = 0;
  let emailFails = 0;
  const errors = [];

  try {
    // ====================================================================
    // 1) PURGE : Apple subs > 21 jours
    // ====================================================================
    const toPurge = await sbFetch(
      `/rest/v1/push_subscriptions?select=id,client_id,endpoint,created_at` +
      `&endpoint=like.https://web.push.apple.com/*` +
      `&created_at=lt.${encodeURIComponent(cutoffPurge)}`
    );

    if (Array.isArray(toPurge) && toPurge.length > 0) {
      const clientIds = [...new Set(toPurge.map((s) => s.client_id).filter(Boolean))];
      const idsCsv = clientIds.map((id) => `"${id}"`).join(",");
      const clients = await sbFetch(
        `/rest/v1/clients?select=id,full_name,email&id=in.(${idsCsv})`
      );
      const byId = Object.fromEntries((clients || []).map((c) => [c.id, c]));

      for (const sub of toPurge) {
        const client = byId[sub.client_id];
        // Envoi email final AVANT delete pour avoir le contexte
        if (client?.email) {
          const firstName = (client.full_name || "").split(" ")[0] || "";
          const ok = await sendEmail(
            client.email,
            "Tes notifs RB Perform sont à réactiver",
            buildEmailHtml({ firstName, kind: "final" })
          );
          if (!ok) emailFails++;
        } else {
          purgedNoEmail++;
        }
        // Delete par id (specifique) pour ne pas casser d'autres devices
        try {
          await sbFetch(
            `/rest/v1/push_subscriptions?id=eq.${sub.id}`,
            { method: "DELETE", headers: { Prefer: "return=minimal" } }
          );
          purged++;
        } catch (e) {
          errors.push(`purge ${sub.id.slice(0, 8)}: ${e.message}`);
        }
      }
    }

    // ====================================================================
    // 2) WARN : Apple subs entre 14 et 21 jours, warned_at NULL
    // ====================================================================
    const toWarn = await sbFetch(
      `/rest/v1/push_subscriptions?select=id,client_id,endpoint,created_at` +
      `&endpoint=like.https://web.push.apple.com/*` +
      `&created_at=lt.${encodeURIComponent(cutoffWarn)}` +
      `&created_at=gte.${encodeURIComponent(cutoffPurge)}` +
      `&warned_at=is.null`
    );

    if (Array.isArray(toWarn) && toWarn.length > 0) {
      const clientIds = [...new Set(toWarn.map((s) => s.client_id).filter(Boolean))];
      const idsCsv = clientIds.map((id) => `"${id}"`).join(",");
      const clients = await sbFetch(
        `/rest/v1/clients?select=id,full_name,email&id=in.(${idsCsv})`
      );
      const byId = Object.fromEntries((clients || []).map((c) => [c.id, c]));

      for (const sub of toWarn) {
        const client = byId[sub.client_id];
        if (!client?.email) { skipped++; continue; }

        const firstName = (client.full_name || "").split(" ")[0] || "";
        const ok = await sendEmail(
          client.email,
          "Réactive tes notifs RB Perform (10 sec)",
          buildEmailHtml({ firstName, kind: "warn" })
        );
        if (ok) {
          // Marque comme averti — empeche le re-spam les jours suivants
          try {
            await sbFetch(
              `/rest/v1/push_subscriptions?id=eq.${sub.id}`,
              {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ warned_at: now.toISOString() }),
              }
            );
            warned++;
          } catch (e) {
            errors.push(`warn-patch ${sub.id.slice(0, 8)}: ${e.message}`);
          }
        } else {
          emailFails++;
        }
      }
    }

    const result = {
      ok: true,
      timestamp: now.toISOString(),
      warned,
      purged,
      purgedNoEmail,
      skipped,
      emailFails,
      errors: errors.slice(0, 10),
    };
    console.log("[push-hygiene]", JSON.stringify(result));
    return res.status(200).json(result);
  } catch (e) {
    console.error("[CRON_PUSH_HYGIENE_FAILED]", e?.message);
    await captureException(e, { tags: { endpoint: "cron-push-hygiene" } });
    return res.status(500).json({ error: e.message });
  }
};
