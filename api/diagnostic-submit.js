/**
 * POST /api/diagnostic-submit
 *
 * Lead magnet "Diagnostic Coach" — soumission du formulaire 10 questions.
 * Calcule le score (via _diagnostic-scoring), persiste (coach_diagnostics),
 * envoie le rapport branded au lead + notifie Rayan, retourne les données
 * structurées pour l'affichage in-page.
 *
 * Source de vérité contenu : api/_diagnostic-content.js
 * Source de vérité scoring : api/_diagnostic-scoring.js
 * Front : public/diagnostic.html
 *
 * Réponse :
 *   { ok: true,
 *     globalScore: 73,
 *     pillarScores: { P1: 15, ..., P5: 5 },
 *     weakPillar: "P5",
 *     fragilePillars: ["P5"],
 *     band: { code, title, body },
 *     kit: { title, diagnostic, actions: [...], rb_solves },
 *     reframe: "...",
 *     pillarLabels: { P1: "Prévisibilité...", ... } }
 */

const { z } = require("zod");
const nodemailer = require("nodemailer");
const { getServiceClient } = require("./_supabase");
const { rateLimit, attachRequestId } = require("./_security");
const { captureException } = require("./_sentry");
const { RB_SUPPORT_EMAIL } = require("./_branding");
const {
  PILLARS, QUESTIONS, KITS, ACQUISITION_REFRAME,
} = require("./_diagnostic-content");
const { computeScores } = require("./_diagnostic-scoring");

const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const G = "#02d1ba";

const answerSchema = z.enum(["a", "b", "c"]);

const submitSchema = z.object({
  email: z.string().email().max(254),
  firstName: z.string().max(80).optional().nullable(),
  answers: z.object({
    Q1: answerSchema, Q2: answerSchema, Q3: answerSchema, Q4: answerSchema,
    Q5: answerSchema, Q6: answerSchema, Q7: answerSchema, Q8: answerSchema,
    Q9: answerSchema, Q10: answerSchema,
  }),
  consent_marketing: z.boolean().optional().default(false),
  utm_source: z.string().max(100).optional().nullable(),
  utm_medium: z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(100).optional().nullable(),
  utm_term: z.string().max(100).optional().nullable(),
  utm_content: z.string().max(100).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
}).passthrough();

// Defense en profondeur : escape avant interpolation HTML.
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
// Email HTML — rapport complet branded RB Perform (table layout, Outlook-safe).
// =============================================================================
function buildReportEmail({ firstName, globalScore, pillarScores, band, kit, weakPillarLabel }) {
  const greet = firstName ? escHtml(firstName) : "Coach";
  const pillarRows = Object.entries(pillarScores).map(([pid, score]) => {
    const label = PILLARS[pid].label;
    const pct = Math.round((score / 20) * 100);
    const color = score <= 10 ? "#ff6b6b" : (score <= 15 ? "#f5b400" : G);
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-size:13px;color:rgba(255,255,255,0.75);font-weight:500;">${escHtml(label)}</td>
            <td align="right" style="font-size:13px;color:${color};font-weight:800;white-space:nowrap;">${score} / 20</td>
          </tr></table>
          <div style="background:rgba(255,255,255,0.05);height:4px;border-radius:2px;margin-top:6px;">
            <div style="width:${pct}%;height:4px;background:${color};border-radius:2px;"></div>
          </div>
        </td>
      </tr>`;
  }).join("");

  const actionsHtml = kit.actions.map((a, i) => `
    <tr><td style="padding:14px 0;">
      <div style="display:inline-block;width:24px;height:24px;background:${G};color:#000;border-radius:6px;text-align:center;line-height:24px;font-weight:900;font-size:12px;margin-right:10px;vertical-align:top;">${i + 1}</div>
      <div style="display:inline-block;vertical-align:top;max-width:calc(100% - 40px);">
        <div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:4px;">${escHtml(a.title)}</div>
        <div style="font-size:13px;line-height:1.6;color:rgba(255,255,255,0.65);">${escHtml(a.body)}</div>
      </div>
    </td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${greet} — Ton diagnostic RB Perform</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Arial,sans-serif;color:#fff;-webkit-text-size-adjust:100%;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#050505;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;">

  <tr><td align="center" style="padding-bottom:32px;">
    <div style="font-size:22px;font-weight:900;letter-spacing:0.12em;color:#fff;">RB<span style="color:${G};">PERFORM</span></div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:14px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:${G};">● Ton diagnostic</div>
  </td></tr>

  <tr><td align="left" style="padding-bottom:8px;">
    <h1 style="margin:0;font-size:32px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;color:#fff;">${greet}, ton score :</h1>
  </td></tr>

  <tr><td align="left" style="padding-bottom:20px;">
    <div style="font-size:64px;font-weight:900;color:${G};letter-spacing:-0.04em;line-height:1;">${globalScore}<span style="font-size:24px;color:rgba(255,255,255,0.35);">/100</span></div>
    <div style="font-size:15px;font-weight:700;color:#fff;margin-top:8px;">${escHtml(band.title)}</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;margin-top:4px;">${escHtml(band.body)}</div>
  </td></tr>

  <tr><td style="padding-bottom:32px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${pillarRows}</table>
  </td></tr>

  <tr><td style="padding:0 0 24px;">
    <div style="font-size:13px;line-height:1.65;color:rgba(255,255,255,0.55);font-style:italic;border-left:2px solid ${G};padding-left:14px;">
      ${escHtml(ACQUISITION_REFRAME)}
    </div>
  </td></tr>

  <tr><td style="padding-bottom:18px;">
    <div style="font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${G};margin-bottom:8px;">Ton pilier le plus faible · ${escHtml(weakPillarLabel)}</div>
    <h2 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.01em;line-height:1.2;">${escHtml(kit.title)}</h2>
  </td></tr>

  <tr><td style="padding-bottom:24px;">
    <p style="margin:0;font-size:14px;line-height:1.65;color:rgba(255,255,255,0.75);">${escHtml(kit.diagnostic)}</p>
  </td></tr>

  <tr><td style="padding-bottom:24px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">Les 3 actions à enclencher</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${actionsHtml}</table>
  </td></tr>

  <tr><td style="padding-bottom:32px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.25);border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${G};margin-bottom:8px;">Comment RB Perform le règle</div>
        <p style="margin:0;font-size:13.5px;line-height:1.7;color:rgba(255,255,255,0.8);">${escHtml(kit.rb_solves)}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Bridge "à la main vs RB Perform" -->
  <tr><td style="padding:8px 0 24px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:10px;">Deux chemins pour réparer ça</div>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.8);">
      Tu peux le faire seul : connecter Stripe + Notion + un tableur + Calendly, calculer ton MRR à la main
      chaque 1er du mois, et détecter le churn <strong>quand le client est déjà parti</strong>. Compte
      <strong>~6 mois de mise en place</strong> et ~200€/mois en outils éparpillés.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.8);">
      Ou tu utilises <strong style="color:#fff;">RB Perform</strong> — une seule app construite autour de
      ces 5 piliers. <strong>15 min d'onboarding.</strong> MRR + prévision 90 jours en temps réel.
      Anti-churn IA qui t'alerte <strong>avant</strong> que le client parte. 199€/mois tout inclus.
    </p>
  </td></tr>

  <!-- Founding offer (scarcity) -->
  <tr><td style="padding:0 0 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,rgba(2,209,186,0.08),rgba(2,209,186,0.02));border:1px solid rgba(2,209,186,0.35);border-radius:16px;">
      <tr><td style="padding:24px 22px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:${G};margin-bottom:12px;text-align:center;">● Founding Coach Program</div>
        <div style="text-align:center;margin-bottom:10px;">
          <span style="font-size:18px;color:rgba(255,255,255,0.3);text-decoration:line-through;font-weight:600;vertical-align:middle;">299€</span>
          <span style="font-size:48px;color:${G};font-weight:900;letter-spacing:-0.03em;margin-left:10px;vertical-align:middle;">199€</span>
          <span style="font-size:14px;color:rgba(255,255,255,0.5);font-weight:600;">/mois</span>
        </div>
        <div style="font-size:11px;color:${G};font-weight:700;text-transform:uppercase;letter-spacing:0.1em;text-align:center;margin-bottom:14px;">Bloqué à vie</div>
        <p style="margin:0 0 16px;font-size:13.5px;color:rgba(255,255,255,0.75);line-height:1.55;text-align:center;">
          30 places fondatrices. Une fois la cohorte pleine, le tarif passe à 299€/mois pour les nouveaux.
          Toi, tu restes à 199€ tant que tu es client.
        </p>
        <ul style="margin:0;padding:0 0 0 4px;list-style:none;">
          <li style="font-size:13px;color:rgba(255,255,255,0.8);padding:4px 0;">✓ Sans engagement · Annulable à tout moment</li>
          <li style="font-size:13px;color:rgba(255,255,255,0.8);padding:4px 0;">✓ 0% commission sur tes paiements clients (Stripe direct)</li>
          <li style="font-size:13px;color:rgba(255,255,255,0.8);padding:4px 0;">✓ Conformité RGPD · Hébergement EU</li>
        </ul>
      </td></tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:8px 0 24px;">
    <a href="https://rbperform.app/founding?utm_source=diagnostic&utm_medium=email&utm_campaign=founding_close"
       style="display:inline-block;padding:18px 40px;background:${G};color:#000;border-radius:100px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">
      Verrouiller ma place — 199€ →
    </a>
    <p style="margin:14px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">
      Paiement Stripe sécurisé · Accès compte immédiat
    </p>
  </td></tr>

  <!-- Founder note (humanise) -->
  <tr><td style="padding:24px 0 0;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0 0 6px;font-size:14px;color:rgba(255,255,255,0.85);font-weight:600;">Rayan</p>
    <p style="margin:0 0 14px;font-size:12px;color:rgba(255,255,255,0.4);font-style:italic;">
      Founder · RB Perform
    </p>
    <p style="margin:0;font-size:13.5px;line-height:1.7;color:rgba(255,255,255,0.7);">
      <strong style="color:#fff;">P.S.</strong> — Le diagnostic que tu viens de faire, c'est exactement la grille
      que j'aurais voulu avoir au début quand j'étais coach. Si tu veux discuter de ton cas avant de décider,
      réponds simplement à ce mail. Je te lis perso, et je réponds dans la journée.
    </p>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

// =============================================================================
// Endpoint
// =============================================================================
module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  attachRequestId(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  // Anti-abus : max 10 soumissions par heure par IP (le diag prend ~2 min,
  // donc 10 c'est très large et ça couvre les re-tests / partage famille).
  const rl = rateLimit(req, { max: 10, windowMs: 3600000 });
  if (!rl.allowed) return res.status(429).json({ error: "rate_limited" });

  try {
    const parsed = submitSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_input", issues: parsed.error.issues.slice(0, 3) });
    }
    const d = parsed.data;
    const cleanEmail = d.email.toLowerCase().trim();
    const firstName = (d.firstName || "").trim() || null;

    // Compute scoring
    let scoring;
    try {
      scoring = computeScores(d.answers);
    } catch (scoreErr) {
      console.error(`[DIAG_SCORING_FAIL] email=${cleanEmail} reason="${scoreErr.message}"`);
      return res.status(400).json({ error: "invalid_answers" });
    }
    const { globalScore, pillarScores, weakPillar, fragilePillars, band } = scoring;
    const kit = KITS[weakPillar];
    const weakPillarLabel = PILLARS[weakPillar].label;

    // Persist (best-effort — un échec DB ne doit pas bloquer le rendu du rapport)
    let dbOk = false;
    let diagnosticId = null;
    try {
      const supabase = getServiceClient();
      const { data: inserted, error: dbErr } = await supabase
        .from("coach_diagnostics")
        .insert({
          email: cleanEmail,
          first_name: firstName,
          answers: d.answers,
          scores: pillarScores,
          global_score: globalScore,
          weak_pillar: weakPillar,
          band: band.code,
          utm_source: d.utm_source || null,
          utm_medium: d.utm_medium || null,
          utm_campaign: d.utm_campaign || null,
          utm_term: d.utm_term || null,
          utm_content: d.utm_content || null,
          referrer: d.referrer || null,
          user_agent: (req.headers["user-agent"] || "").slice(0, 500),
          ip_country: req.headers["x-vercel-ip-country"] || null,
          consent_marketing: !!d.consent_marketing,
        })
        .select("id")
        .single();
      if (dbErr) throw dbErr;
      diagnosticId = inserted.id;
      dbOk = true;
    } catch (dbEx) {
      console.error(`[DIAG_LOST] db_write_failed email=${cleanEmail} reason="${dbEx.message}"`);
      await captureException(dbEx, {
        tags: { endpoint: "diagnostic-submit", stage: "db" },
        extra: { email: cleanEmail, globalScore, weakPillar },
      });
    }

    // Send report email + notify Rayan (best-effort)
    const transporter = getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `Rayan Bonte <${SMTP_USER}>`,
          to: cleanEmail,
          replyTo: SMTP_USER,
          subject: `${firstName || "Coach"} → ${globalScore}/100. Voilà ce qui menace ton business.`,
          html: buildReportEmail({ firstName, globalScore, pillarScores, band, kit, weakPillarLabel }),
          headers: {
            "List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>`,
            "X-Diagnostic-Id": diagnosticId || "n/a",
          },
        });
      } catch (e) {
        console.error(`[DIAG_EMAIL_FAILED] lead email=${cleanEmail} reason="${e.message}" db_ok=${dbOk}`);
        await captureException(e, {
          tags: { endpoint: "diagnostic-submit", stage: "email_lead" },
          extra: { email: cleanEmail, db_ok: dbOk },
        });
      }

      // Notification Rayan (1-liner, pas besoin de full report)
      try {
        const safeEmail = escHtml(cleanEmail);
        const safeName = escHtml(firstName || "Anonyme");
        const safePillar = escHtml(weakPillarLabel);
        await transporter.sendMail({
          from: `RB Perform <${SMTP_USER}>`,
          to: RB_SUPPORT_EMAIL,
          subject: `Diagnostic : ${firstName || cleanEmail} — ${globalScore}/100 (faible: ${weakPillar})`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="background:#111;border-radius:16px;border:1px solid rgba(2,209,186,0.2);padding:28px;">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${G};margin-bottom:12px;font-weight:700;">Nouveau diagnostic</div>
    <div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:16px;">${safeName} — ${globalScore}/100</div>
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:rgba(255,255,255,0.6);line-height:2.2;">
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px;">Email</td><td style="color:#fff;font-weight:600;">${safeEmail}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px;">Bande</td><td>${escHtml(band.title)}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px;">Pilier faible</td><td>${safePillar} (${pillarScores[weakPillar]}/20)</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px;">Fragiles</td><td>${escHtml(fragilePillars.join(", ") || "aucun")}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px;">Source</td><td style="font-family:'JetBrains Mono',monospace;font-size:11px;">${escHtml([d.utm_source, d.utm_campaign].filter(Boolean).join(" / ") || "direct")}</td></tr>
    </table>
  </td></tr>
</table></td></tr></table></body></html>`,
        });
      } catch (e) {
        console.error(`[DIAG_NOTIFY_FAILED] ops email=${cleanEmail} reason="${e.message}"`);
        await captureException(e, { tags: { endpoint: "diagnostic-submit", stage: "notify_ops" } });
      }
    } else {
      console.error(`[DIAG_NO_TRANSPORT] email=${cleanEmail} — ZOHO_SMTP_PASS missing`);
      await captureException(new Error("ZOHO_SMTP_PASS missing on /api/diagnostic-submit"), {
        tags: { endpoint: "diagnostic-submit", stage: "env" },
        extra: { email: cleanEmail, db_ok: dbOk },
      });
    }

    // Build pillarLabels map for the frontend (so it doesn't need to import _content)
    const pillarLabels = Object.fromEntries(
      Object.entries(PILLARS).map(([pid, p]) => [pid, p.label])
    );

    return res.status(200).json({
      ok: true,
      diagnosticId,
      globalScore,
      pillarScores,
      weakPillar,
      weakPillarLabel,
      fragilePillars,
      band,
      kit,
      reframe: ACQUISITION_REFRAME,
      pillarLabels,
    });
  } catch (err) {
    console.error(`[DIAG_UNCAUGHT] reason="${err.message}"`);
    await captureException(err, { tags: { endpoint: "diagnostic-submit", stage: "uncaught" } });
    return res.status(500).json({ error: "internal_error" });
  }
};
