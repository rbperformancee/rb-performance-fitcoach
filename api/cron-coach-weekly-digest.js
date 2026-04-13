/**
 * Cron : chaque lundi 7h UTC — digest hebdomadaire pour chaque coach.
 * Email avec resume semaine + actions prioritaires.
 */

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "RB Perform <noreply@rbperform.com>", to: [to], subject, html }),
  });
}

function buildDigestHtml({ coach, clients, weekStats }) {
  const coachName = coach.full_name?.split(" ")[0] || "Coach";
  const { totalSessions, newWeights, activeCount, inactiveCount, expiringSoon } = weekStats;

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

    <a href="https://rb-perfor.vercel.app" style="display:inline-block;background:#02d1ba;color:#000;font-size:14px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:12px;letter-spacing:0.3px;">
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
  if (!RESEND_KEY) return res.status(500).json({ error: "Missing RESEND_API_KEY" });

  try {
    const coaches = await sbFetch("/rest/v1/coaches?select=id,email,full_name&is_active=eq.true");
    if (!Array.isArray(coaches)) return res.status(500).json({ error: "Failed to load coaches" });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const in14 = new Date(Date.now() + 14 * 86400000).toISOString();
    let sent = 0;

    for (const coach of coaches) {
      const clients = await sbFetch(`/rest/v1/clients?coach_id=eq.${coach.id}&select=id,email,full_name,subscription_end_date,subscription_status`);
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

      // Expirants
      const expiringSoon = clients.filter((c) => {
        if (!c.subscription_end_date) return false;
        const d = new Date(c.subscription_end_date);
        return d > new Date() && d < new Date(in14);
      });

      const html = buildDigestHtml({
        coach,
        clients,
        weekStats: {
          totalSessions: Array.isArray(sessionsData) ? sessionsData.length : 0,
          newWeights: Array.isArray(weightsData) ? weightsData.length : 0,
          activeCount,
          inactiveCount,
          expiringSoon,
        },
      });

      await sendEmail(coach.email, "Ta semaine RB Perform — digest", html);
      sent++;
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
