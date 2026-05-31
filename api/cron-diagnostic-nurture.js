/**
 * Cron Diagnostic Nurture — Vercel Cron Job (J+3 relance).
 *
 * Schedule : tous les jours à 09h UTC (cf. vercel.json).
 *
 * Logique :
 * - Cherche les leads diagnostic créés il y a 3-4 jours qui n'ont PAS reçu
 *   le J+3 ni converti (nurture_j3_sent_at IS NULL AND converted_to_founding=false).
 * - Envoie un mail "relance vendeur" avec angle différent du rapport initial :
 *   * Re-rappelle le score + pilier faible (personnalisation forte)
 *   * Reframe Hormozi : "ton diagnostic ne sert à rien sans plan d'action"
 *   * 2 actions précises à faire cette semaine
 *   * CTA Founding (199€ vs 299€) avec UTM tracking dédié
 * - Marque nurture_j3_sent_at à now() pour idempotence.
 *
 * Auto-check conversion : pour chaque lead, on regarde si son email est passé
 * dans coaches.subscription_plan=founding APRÈS son diagnostic. Si oui →
 * converted_to_founding=true et on skip le mail (pas de spam aux clients).
 *
 * Cible : tous les leads `coach_diagnostics` avec consent_marketing=true OU
 * sans (cf. décision Rayan : le consent porte sur "diagnostic + conseils").
 * Désinscription : List-Unsubscribe header + email perso.
 */

const { captureException } = require("./_sentry");
const { getServiceClient } = require("./_supabase");
const nodemailer = require("nodemailer");
const { PILLARS, KITS } = require("./_diagnostic-content");

const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const G = "#02d1ba";

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

const escHtml = (s) => String(s ?? "").replace(/[&<>"'`=\/]/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  "'": "&#39;", "`": "&#96;", "=": "&#61;", "/": "&#47;",
}[c]));

function getTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// =============================================================================
// Email J+3 — angle "ton diagnostic ne vaut rien sans plan d'action"
// =============================================================================
function buildNurtureEmail({ firstName, globalScore, weakPillar }) {
  const greet = firstName ? escHtml(firstName) : "Coach";
  const kit = KITS[weakPillar];
  const pillarLabel = PILLARS[weakPillar].label;

  // Pick les 2 premières actions du kit pour le J+3 (les 3 sont dans le rapport)
  const action1 = kit.actions[0] || {};
  const action2 = kit.actions[1] || {};

  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${greet}, t'as digéré ton diagnostic ?</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Arial,sans-serif;color:#fff;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#050505;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;">

  <tr><td align="center" style="padding-bottom:32px;">
    <div style="font-size:22px;font-weight:900;letter-spacing:0.12em;color:#fff;">RB<span style="color:${G};">PERFORM</span></div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:14px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:${G};">● J+3 · Relance perso</div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:18px;">
    <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;color:#fff;">
      ${greet}, t'as digéré<br>ton diagnostic<span style="color:${G};">?</span>
    </h1>
  </td></tr>

  <tr><td align="left" style="padding-bottom:18px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.78);">
      Il y a 3 jours, tu as fait le diagnostic et t'as eu ton score : <strong style="color:#fff;">${globalScore}/100</strong>,
      pilier le plus faible <strong style="color:${G};">${escHtml(pillarLabel)}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.78);">
      Maintenant la question qui pique : <strong style="color:#fff;">qu'est-ce que tu en as fait ?</strong>
    </p>
  </td></tr>

  <tr><td align="left" style="padding-bottom:24px;">
    <p style="margin:0;font-size:14.5px;line-height:1.7;color:rgba(255,255,255,0.65);font-style:italic;border-left:2px solid ${G};padding-left:14px;">
      Sois honnête : 90% des coachs qui font un audit le ferment, se disent « intéressant »,
      et ne touchent rien. Une semaine plus tard, ils ont le même business avec un score 47/100,
      sauf qu'ils ont en plus la culpabilité de savoir qu'ils n'ont rien fait. C'est exactement
      pour ça que les diagnostics ne servent à rien sans plan d'action.
    </p>
  </td></tr>

  <tr><td align="left" style="padding-bottom:14px;">
    <h2 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.01em;">
      2 trucs concrets à faire cette semaine
    </h2>
  </td></tr>

  <tr><td style="padding-bottom:28px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:14px 0;">
        <div style="display:inline-block;width:24px;height:24px;background:${G};color:#000;border-radius:6px;text-align:center;line-height:24px;font-weight:900;font-size:12px;margin-right:10px;vertical-align:top;">1</div>
        <div style="display:inline-block;vertical-align:top;max-width:calc(100% - 40px);">
          <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:6px;">${escHtml(action1.title || "")}</div>
          <div style="font-size:13.5px;line-height:1.65;color:rgba(255,255,255,0.7);">${escHtml(action1.body || "")}</div>
        </div>
      </td></tr>
      <tr><td style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.05);">
        <div style="display:inline-block;width:24px;height:24px;background:${G};color:#000;border-radius:6px;text-align:center;line-height:24px;font-weight:900;font-size:12px;margin-right:10px;vertical-align:top;">2</div>
        <div style="display:inline-block;vertical-align:top;max-width:calc(100% - 40px);">
          <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:6px;">${escHtml(action2.title || "")}</div>
          <div style="font-size:13.5px;line-height:1.65;color:rgba(255,255,255,0.7);">${escHtml(action2.body || "")}</div>
        </div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.25);border-radius:14px;">
      <tr><td style="padding:20px 22px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${G};margin-bottom:10px;">Ou tu fais ça en 15 min avec RB Perform</div>
        <p style="margin:0;font-size:14px;line-height:1.65;color:rgba(255,255,255,0.8);">
          ${escHtml(kit.rb_solves)}
        </p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:8px 0 24px;">
    <a href="https://rbperform.app/founding?utm_source=diagnostic&utm_medium=email&utm_campaign=nurture_j3"
       style="display:inline-block;padding:18px 40px;background:${G};color:#000;border-radius:100px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">
      Verrouiller ma place — 199€ →
    </a>
    <p style="margin:14px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">
      30 places fondatrices · Bloqué à vie · Sans engagement
    </p>
  </td></tr>

  <tr><td style="padding:24px 0 0;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0 0 6px;font-size:14px;color:rgba(255,255,255,0.85);font-weight:600;">Rayan</p>
    <p style="margin:0 0 14px;font-size:12px;color:rgba(255,255,255,0.4);font-style:italic;">Founder · RB Perform</p>
    <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.55);">
      <strong style="color:#fff;">P.S.</strong> — Si t'as commencé à bouger ces 2 actions depuis 3 jours, écris-moi en réponse,
      je veux savoir où tu en es. Si t'as rien fait, écris-moi quand même, je veux savoir ce qui te bloque.
      Dans les deux cas, je te réponds perso.
    </p>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

// =============================================================================
// Conversion check : email du lead apparaît-il dans coaches founding ?
// =============================================================================
async function checkConversion(supabase, email, diagnosticCreatedAt) {
  const { data } = await supabase
    .from("coaches")
    .select("id, created_at, subscription_plan")
    .eq("email", email)
    .eq("subscription_plan", "founding")
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  // On vérifie que le coach s'est inscrit APRÈS son diagnostic
  return new Date(data.created_at) >= new Date(diagnosticCreatedAt);
}

// =============================================================================
// Endpoint cron
// =============================================================================
module.exports = async (req, res) => {
  const isVercelCron = req.headers["user-agent"] && req.headers["user-agent"].includes("vercel-cron");
  if (!isAuthorizedCron(req) && !isVercelCron) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const startedAt = Date.now();
  const stats = { eligible: 0, sent: 0, converted: 0, skipped: 0, failed: 0 };

  try {
    const supabase = getServiceClient();
    const transporter = getTransporter();
    if (!transporter) {
      return res.status(500).json({ error: "ZOHO_SMTP_PASS missing" });
    }

    // Fenêtre J+3 : leads créés entre 3 et 4 jours (laisse une marge de safety
    // si le cron rate une exécution une journée, on rattrape sur la suivante).
    const now = new Date();
    const minAge = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 jours
    const maxAge = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 jours

    const { data: leads, error: qErr } = await supabase
      .from("coach_diagnostics")
      .select("id, email, first_name, global_score, weak_pillar, created_at")
      .is("nurture_j3_sent_at", null)
      .eq("converted_to_founding", false)
      .gte("created_at", minAge.toISOString())
      .lte("created_at", maxAge.toISOString())
      .order("created_at", { ascending: true })
      .limit(200);

    if (qErr) throw qErr;
    stats.eligible = (leads || []).length;

    for (const lead of (leads || [])) {
      try {
        // Check conversion : skip + mark si le lead a déjà payé
        const converted = await checkConversion(supabase, lead.email, lead.created_at);
        if (converted) {
          await supabase
            .from("coach_diagnostics")
            .update({ converted_to_founding: true, converted_at: new Date().toISOString() })
            .eq("id", lead.id);
          stats.converted++;
          console.log(`[NURTURE_J3] CONVERTED ${lead.email} — skip nurture`);
          continue;
        }

        const firstName = lead.first_name || null;
        const html = buildNurtureEmail({
          firstName,
          globalScore: lead.global_score,
          weakPillar: lead.weak_pillar,
        });
        const subject = `${firstName || "Coach"}, t'as digéré ton diagnostic ?`;

        await transporter.sendMail({
          from: `Rayan Bonte <${SMTP_USER}>`,
          to: lead.email,
          replyTo: SMTP_USER,
          subject,
          html,
          headers: {
            "List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>`,
            "X-Diagnostic-Id": lead.id,
            "X-Nurture-Phase": "j3",
          },
        });

        await supabase
          .from("coach_diagnostics")
          .update({ nurture_j3_sent_at: new Date().toISOString() })
          .eq("id", lead.id);

        stats.sent++;
        console.log(`[NURTURE_J3] sent to ${lead.email} (score ${lead.global_score}, weak ${lead.weak_pillar})`);
      } catch (err) {
        stats.failed++;
        console.error(`[NURTURE_J3] Error for ${lead.email}:`, err.message);
        await captureException(err, {
          tags: { endpoint: "cron-diagnostic-nurture", lead_id: lead.id },
          extra: { email: lead.email },
        });
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`[NURTURE_J3] Done in ${durationMs}ms —`, JSON.stringify(stats));
    return res.status(200).json({ ok: true, durationMs, ...stats });
  } catch (err) {
    console.error(`[NURTURE_J3] Fatal:`, err.message);
    await captureException(err, { tags: { endpoint: "cron-diagnostic-nurture", stage: "fatal" } });
    return res.status(500).json({ error: err.message, ...stats });
  }
};
