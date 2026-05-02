/**
 * Cron : chaque lundi 7h UTC — digest hebdomadaire pour chaque coach.
 * Email avec resume semaine + actions prioritaires.
 */

const { captureException } = require("./_sentry");
const nodemailer = require("nodemailer");
const { RB_SUPPORT_EMAIL } = require("./_branding");
const { buildUnsubUrl } = require("./_unsubToken");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON_AUTH_FAIL] CRON_SECRET missing — refused");
    return false;
  }
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

async function sendEmail(to, subject, html) {
  if (!SMTP_PASS) return;
  // Gmail/Yahoo (depuis fev 2024) exigent List-Unsubscribe + List-Unsubscribe-Post
  // pour les bulk senders, sinon -> Promotions/spam.
  const unsubUrl = buildUnsubUrl(to, "weekly_digest");
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: `RB Perform <${SMTP_USER}>`,
    to,
    replyTo: RB_SUPPORT_EMAIL,
    subject,
    html,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>, <mailto:unsubscribe@rbperform.app?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

function buildDigestHtml({ coach, clients, weekStats }) {
  const coachName = coach.full_name?.split(" ")[0] || "Coach";
  const { totalSessions, newWeights, activeCount, inactiveCount, expiringSoon, mrr, retentionPct, businessScore, scoreDelta, topClient, churnRiskClients } = weekStats;
  const deltaSign = scoreDelta > 0 ? "↑" : scoreDelta < 0 ? "↓" : "·";
  const deltaColor = scoreDelta > 0 ? "#02d1ba" : scoreDelta < 0 ? "#ef4444" : "rgba(255,255,255,0.4)";
  const churnRows = (churnRiskClients || []).slice(0, 3).map((c) => `<tr>
    <td style="padding:8px 10px;color:#e5e5e5;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05)">${c.full_name || c.email}</td>
    <td style="padding:8px 10px;color:#ef4444;font-size:12px;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right">Inactif ${c._days}j</td>
  </tr>`).join("");

  const expiringRows = expiringSoon.slice(0, 5).map((c) => {
    const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
    return `<tr>
      <td style="padding:8px 10px;color:#e5e5e5;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05)">${c.full_name || c.email}</td>
      <td style="padding:8px 10px;color:${days <= 7 ? "#ef4444" : "#f97316"};font-size:12px;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right">${days}j</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <tr><td align="center" style="padding-bottom:28px;">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.5);margin-bottom:6px;">Digest coach · hebdo</div>
    <div style="font-size:28px;font-weight:900;color:#f0f0f0;letter-spacing:-1px;">RB<span style="color:#02d1ba">.</span>Perform</div>
  </td></tr>

  <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:32px;">
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:18px;">${coachName},</div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:20px;line-height:1.35;">Voici ta semaine<br><span style="color:#02d1ba">en chiffres.</span></div>

    <!-- Score business vs semaine precedente -->
    <div style="background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.18);border-radius:14px;padding:18px 20px;margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(2,209,186,0.7);font-weight:700;margin-bottom:6px">Score business</div>
      <div style="display:flex;align-items:baseline;gap:10px">
        <span style="font-family:'Courier',monospace;font-size:40px;font-weight:200;color:#02d1ba;letter-spacing:-2px">${businessScore}</span>
        <span style="font-size:12px;font-weight:600;color:${deltaColor};letter-spacing:.5px">${deltaSign} ${Math.abs(scoreDelta)} pts</span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:100px;overflow:hidden;margin-top:10px">
        <div style="height:100%;width:${businessScore}%;background:#02d1ba;box-shadow:0 0 8px rgba(2,209,186,.5);border-radius:100px"></div>
      </div>
    </div>

    <!-- MRR / Retention / Actifs -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;width:33%">
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);font-weight:700">MRR</div>
          <div style="font-family:'Courier',monospace;font-size:20px;font-weight:200;color:#02d1ba;margin-top:4px;letter-spacing:-1px">${(mrr || 0).toLocaleString("fr-FR")} €</div>
        </td>
        <td style="padding:0 4px"></td>
        <td style="padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;width:33%">
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);font-weight:700">Retention</div>
          <div style="font-family:'Courier',monospace;font-size:20px;font-weight:200;color:#fff;margin-top:4px;letter-spacing:-1px">${retentionPct}%</div>
        </td>
        <td style="padding:0 4px"></td>
        <td style="padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;width:33%">
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.35);font-weight:700">Actifs</div>
          <div style="font-family:'Courier',monospace;font-size:20px;font-weight:200;color:#fff;margin-top:4px;letter-spacing:-1px">${activeCount}/${clients.length}</div>
        </td>
      </tr>
    </table>

    ${churnRows ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#ef4444;font-weight:700;margin-bottom:10px">● A contacter maintenant</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.18);border-radius:12px;overflow:hidden;">${churnRows}</table>
    </div>` : ""}

    ${topClient ? `
    <div style="margin-bottom:16px;padding:14px 16px;background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.15);border-radius:12px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(2,209,186,0.7);font-weight:700;margin-bottom:4px">⭐ Meilleur client</div>
      <div style="font-size:13px;font-weight:600;color:#fff">${topClient.full_name || topClient.email} <span style="color:rgba(255,255,255,0.4);font-weight:400">— ${topClient._sessions} seance${topClient._sessions > 1 ? "s" : ""} cette semaine</span></div>
    </div>` : ""}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td style="padding:12px;background:rgba(2,209,186,0.06);border:1px solid rgba(2,209,186,0.2);border-radius:12px;width:33%">
          <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(2,209,186,0.7);font-weight:700">Seances</div>
          <div style="font-family:'Courier',monospace;font-size:22px;font-weight:800;color:#fff;margin-top:4px">${totalSessions}</div>
        </td>
        <td style="padding:0 4px"></td>
        <td style="padding:12px;background:rgba(129,140,248,0.06);border:1px solid rgba(129,140,248,0.2);border-radius:12px;width:33%">
          <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(129,140,248,0.85);font-weight:700">Pesees</div>
          <div style="font-family:'Courier',monospace;font-size:22px;font-weight:800;color:#fff;margin-top:4px">${newWeights}</div>
        </td>
        <td style="padding:0 4px"></td>
        <td style="padding:12px;background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.2);border-radius:12px;width:33%">
          <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(249,115,22,0.85);font-weight:700">Inactifs</div>
          <div style="font-family:'Courier',monospace;font-size:22px;font-weight:800;color:#fff;margin-top:4px">${inactiveCount}</div>
        </td>
      </tr>
    </table>

    <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8;margin-bottom:20px;">
      <strong style="color:#fff">${activeCount}</strong> clients actifs · <strong style="color:#fff">${clients.length}</strong> au total.
    </div>

    ${expiringSoon.length > 0 ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(249,115,22,0.85);font-weight:700;margin-bottom:10px">
        ⚠ Abonnements expirants
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(249,115,22,0.04);border:1px solid rgba(249,115,22,0.15);border-radius:12px;overflow:hidden;">
        ${expiringRows}
      </table>
    </div>` : ""}

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px;margin-bottom:20px;">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(2,209,186,0.75);font-weight:700;margin-bottom:8px">Actions prioritaires</div>
      <ul style="margin:0;padding:0 0 0 16px;color:rgba(255,255,255,0.65);font-size:13px;line-height:1.9">
        ${inactiveCount > 0 ? `<li><strong style="color:#fff">${inactiveCount}</strong> clients inactifs — envoie un message de relance</li>` : ""}
        ${expiringSoon.length > 0 ? `<li><strong style="color:#fff">${expiringSoon.length}</strong> abonnements expirent bientot — planifie les appels de renouvellement</li>` : ""}
        ${totalSessions < clients.length * 2 ? `<li>Seances sous la moyenne — encourage les clients a se remettre a jour</li>` : ""}
        ${inactiveCount === 0 && expiringSoon.length === 0 ? `<li>Tout roule — continue comme ca</li>` : ""}
      </ul>
    </div>

    <a href="https://rbperform.app/login" style="display:inline-block;background:#02d1ba;color:#000;font-size:14px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:12px;letter-spacing:0.3px;">
      Acceder au dashboard
    </a>

  </td></tr>

  <tr><td style="padding:24px 0 0;text-align:center;">
    <div style="font-size:11px;color:rgba(255,255,255,0.25);">RB Perform — Digest coach envoye chaque lundi matin</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export default async function handler(req, res) {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!SUPABASE_KEY) return res.status(500).json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
  if (!SMTP_PASS) return res.status(500).json({ error: "Missing ZOHO_SMTP_PASS" });

  try {
    // On selectionne weekly_report_enabled + flags unsub_* (RFC 8058)
    const coaches = await sbFetch("/rest/v1/coaches?select=id,email,full_name,weekly_report_enabled,unsub_all,unsub_weekly_digest,last_business_score&is_active=eq.true");
    if (!Array.isArray(coaches)) return res.status(500).json({ error: "Failed to load coaches" });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const in14 = new Date(Date.now() + 14 * 86400000).toISOString();
    let sent = 0;

    for (const coach of coaches) {
      // Respect des opt-outs (toggle interne + List-Unsubscribe RFC 8058)
      if (coach.weekly_report_enabled === false) continue;
      if (coach.unsub_all === true) continue;
      if (coach.unsub_weekly_digest === true) continue;

      const clients = await sbFetch(`/rest/v1/clients?coach_id=eq.${coach.id}&select=id,email,full_name,subscription_end_date,subscription_status,subscription_price,last_active_at`);
      if (!Array.isArray(clients) || clients.length === 0) continue;

      const ids = clients.map((c) => `"${c.id}"`).join(",");
      const [sessionsData, weightsData] = await Promise.all([
        sbFetch(`/rest/v1/session_logs?client_id=in.(${ids})&logged_at=gte.${weekAgo}&select=client_id`),
        sbFetch(`/rest/v1/weight_logs?client_id=in.(${ids})&date=gte.${weekAgo.split("T")[0]}&select=client_id`),
      ]);

      // Inactifs : pas de session depuis 7j
      const activeIds = new Set((sessionsData || []).map((s) => s.client_id));
      const inactiveCount = clients.filter((c) => !activeIds.has(c.id)).length;
      const activeCount = clients.length - inactiveCount;

      // Expirants (14j)
      const expiringSoon = clients.filter((c) => {
        if (!c.subscription_end_date) return false;
        const d = new Date(c.subscription_end_date);
        return d > new Date() && d < new Date(in14);
      });

      // MRR : somme des subscription_price sur abos actifs
      const mrr = clients
        .filter((c) => c.subscription_status === "active" && typeof c.subscription_price === "number")
        .reduce((sum, c) => sum + (c.subscription_price || 0), 0);

      // Retention % = actifs / total
      const retentionPct = clients.length > 0 ? Math.round((activeCount / clients.length) * 100) : 0;

      // Top client : celui avec le plus de sessions cette semaine
      const sessionsByClient = {};
      (sessionsData || []).forEach((s) => { sessionsByClient[s.client_id] = (sessionsByClient[s.client_id] || 0) + 1; });
      const topClientId = Object.entries(sessionsByClient).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topClient = topClientId ? { ...clients.find((c) => c.id === topClientId), _sessions: sessionsByClient[topClientId] } : null;

      // Clients churn risque (inactifs 7j+ avec abo actif)
      const churnRiskClients = clients
        .filter((c) => !activeIds.has(c.id) && c.subscription_status === "active")
        .slice(0, 3)
        .map((c) => {
          const last = c.last_active_at ? new Date(c.last_active_at) : null;
          const _days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : 8;
          return { ...c, _days };
        });

      // Score business (simplifie, aligne avec dashboard)
      const coverage = activeCount / Math.max(clients.length, 1);
      const businessScore = Math.round(coverage * 60 + retentionPct * 0.4);
      const scoreDelta = businessScore - (coach.last_business_score || businessScore);

      // Subject dynamique
      const deltaTxt = scoreDelta > 0 ? `↑ +${scoreDelta} pts` : scoreDelta < 0 ? `↓ ${scoreDelta} pts` : "· stable";
      const subject = `Ta semaine RB Perform · Score ${businessScore} · ${deltaTxt}`;

      const html = buildDigestHtml({
        coach,
        clients,
        weekStats: {
          totalSessions: Array.isArray(sessionsData) ? sessionsData.length : 0,
          newWeights: Array.isArray(weightsData) ? weightsData.length : 0,
          activeCount,
          inactiveCount,
          expiringSoon,
          mrr,
          retentionPct,
          businessScore,
          scoreDelta,
          topClient,
          churnRiskClients,
        },
      });

      await sendEmail(coach.email, subject, html);
      // Persister le score pour comparer la semaine prochaine (best-effort)
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/coaches?id=eq.${coach.id}`, {
          method: "PATCH",
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ last_business_score: businessScore }),
        });
      } catch (_) {}
      sent++;
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    console.error(`[CRON_WEEKLY_DIGEST_FAILED] reason="${e.message || e}"`);
    await captureException(e, { tags: { endpoint: "cron-coach-weekly-digest", stage: "uncaught" } });
    return res.status(500).json({ error: String(e) });
  }
}
