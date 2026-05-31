/**
 * Admin outreach — envoi manuel d'emails personnalisés brandés RB Perform.
 *
 * Auth : header `Authorization: Bearer <CRON_SECRET>` (même secret que les crons).
 *
 * Usage :
 *   curl -X POST https://rbperform.app/api/admin-outreach \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"to":"daniel@x.com","firstName":"Daniel","context":"Tu m\\'as DM hier."}'
 *
 * Body :
 *   - to        (required) destinataire
 *   - firstName (required) prénom pour personnaliser
 *   - context   (optional) phrase de contexte qui remplace "Comme promis, je reviens vers toi."
 *   - dryRun    (optional) si true, ne fait que renvoyer le HTML sans envoyer
 *
 * NB : utilise le même template / SMTP que scripts/send-outreach-mail.mjs.
 * Garde les deux sources synchronisées si tu touches au template.
 */

const { captureException } = require("./_sentry");
const nodemailer = require("nodemailer");

const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const G = "#02d1ba";

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

function buildHtml({ firstName, context }) {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>${firstName} — Ta place Founding RB Perform</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Arial,sans-serif;color:#fff;-webkit-text-size-adjust:100%;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#050505;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;">

  <tr><td align="center" style="padding-bottom:32px;">
    <div style="font-size:22px;font-weight:900;letter-spacing:0.12em;color:#fff;font-family:'Inter',Arial,sans-serif;">
      RB<span style="color:${G};">PERFORM</span>
    </div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:14px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:${G};">
      ● On lance le 26 mai
    </div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:18px;">
    <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Inter',Arial,sans-serif;">
      ${firstName},<br/>ta place Founding<span style="color:${G};">.</span>
    </h1>
  </td></tr>

  <tr><td align="left" style="padding-bottom:24px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.78);">
      Hey ${firstName},
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.78);">
      ${context ? context + ' ' : "Comme promis, je reviens vers toi."}
      <strong style="color:#fff;">RB Perform ouvre officiellement le 26 mai 2026 à 09h00.</strong>
      En rejoignant le cercle Founding maintenant, tu verrouilles
      <strong style="color:${G};">199 €/mois à vie</strong> — le tarif standard ensuite est 299 €/mois.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.78);">
      Tu peux bloquer ta place maintenant. Tu auras accès à ton compte tout de suite
      pour ton onboarding, et l'app ouvre dans son entier le 26 mai à 09h sharp.
    </p>
  </td></tr>

  <tr><td align="left" style="padding-bottom:32px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.25);border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${G};margin-bottom:8px;">
          Ce que tu verrouilles
        </div>
        <ul style="margin:0;padding:0 0 0 16px;color:rgba(255,255,255,0.8);font-size:13.5px;line-height:1.8;">
          <li><strong style="color:#fff;">199 €/mois à vie</strong> (vs 299 €/mois standard ensuite)</li>
          <li><strong style="color:#fff;">0% commission</strong> sur tes paiements clients (Stripe direct)</li>
          <li><strong style="color:#fff;">Dashboard MRR + anti-churn IA</strong> en accès complet</li>
          <li><strong style="color:#fff;">Conformité RGPD</strong> native — hébergement EU (Frankfurt)</li>
        </ul>
      </td></tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:0 0 24px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr><td align="center" bgcolor="${G}" style="border-radius:100px;">
        <a href="https://rbperform.app/founding"
           style="display:inline-block;padding:16px 36px;background:${G};color:#000;border-radius:100px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Inter',Arial,sans-serif;">
          Sécuriser ma place — 199€ →
        </a>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;font-size:12px;color:rgba(255,255,255,0.45);text-align:center;">
      Paiement sécurisé Stripe · Sans engagement · Annulable à tout moment
    </p>
  </td></tr>

  <tr><td align="left" style="padding:24px 0;">
    <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.55);">
      Si tu veux d'abord en discuter ou voir une démo, réponds simplement à ce mail.
      Je te lis et te réponds perso dans la journée.
    </p>
  </td></tr>

  <tr><td align="left" style="padding:8px 0 0;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:24px 0 4px;font-size:14px;color:rgba(255,255,255,0.85);font-weight:600;">
      Rayan
    </p>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);font-style:italic;">
      Founder · RB Perform · <a href="https://rbperform.app" style="color:rgba(255,255,255,0.5);text-decoration:none;">rbperform.app</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function buildText({ firstName, context }) {
  return `Hey ${firstName},

${context ? context + ' ' : "Comme promis, je reviens vers toi. "}RB Perform ouvre officiellement le 26 mai 2026 à 09h00.

En rejoignant le cercle Founding maintenant, tu verrouilles 199€/mois à vie — le tarif standard ensuite est 299€/mois.

Ce que tu verrouilles :
- 199€/mois à vie (vs 299€/mois standard ensuite)
- 0% commission sur tes paiements clients
- Dashboard MRR + anti-churn IA en accès complet
- Conformité RGPD native — hébergement EU

→ Sécuriser ma place : https://rbperform.app/founding

Tu auras accès à ton compte tout de suite pour ton onboarding, et l'app ouvre dans son entier le 26 mai à 09h sharp.

Si tu veux d'abord en discuter ou voir une démo, réponds simplement à ce mail.

Rayan
Founder · RB Perform
https://rbperform.app`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // Body parsing (Vercel parse JSON automatiquement quand Content-Type est json)
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { to, firstName, context = "", dryRun = false } = body;

  if (!to || !firstName) {
    return res.status(400).json({ error: "missing_fields", required: ["to", "firstName"] });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: "invalid_email" });
  }

  const subject = `${firstName} — Ta place Founding RB Perform (lancement 26 mai)`;
  const html = buildHtml({ firstName, context });
  const text = buildText({ firstName, context });

  if (dryRun) {
    return res.status(200).json({ ok: true, dryRun: true, to, subject, htmlLength: html.length });
  }

  if (!SMTP_PASS) {
    return res.status(500).json({ error: "ZOHO_SMTP_PASS missing in env" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.eu",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const info = await transporter.sendMail({
      from: `Rayan Bonte <${SMTP_USER}>`,
      to,
      replyTo: SMTP_USER,
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>`,
        "X-Outreach": "founding-launch-manual",
      },
    });

    console.log(`[ADMIN_OUTREACH] Sent to ${to} — ${info.messageId}`);
    return res.status(200).json({
      ok: true,
      to,
      subject,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (err) {
    console.error(`[ADMIN_OUTREACH] Error for ${to}:`, err.message);
    await captureException(err, {
      tags: { endpoint: "admin-outreach", to },
    });
    return res.status(500).json({ error: err.message });
  }
};
