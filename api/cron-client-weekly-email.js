/**
 * Cron client weekly email — Vercel Cron Job
 *
 * Schedule : lundi 8h UTC (≈ 9h-10h Paris). Cf. vercel.json.
 * Tombe APRÈS le push bilan dimanche soir → le bilan hebdo est à jour.
 *
 * Pour chaque client avec email + onboarding terminé :
 *   - Sessions complétées 7j vs 7j précédents
 *   - PR battus la semaine
 *   - Compliance habits (% sur 7j)
 *   - Évolution poids vs il y a 7j
 *   - Bilan hebdo soumis ? (lien si non)
 *
 * Email HTML envoyé via Resend.
 *
 * Engagement passif — le client revoit ses chiffres sans ouvrir l'app.
 * Si la semaine était top → motivation à continuer. Si flat → réveil.
 */

const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "RB Perform <noreply@rbperform.app>";

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON_AUTH_FAIL] CRON_SECRET missing");
    return false;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function buildEmail({ firstName, accentColor, sessions7d, sessionsPrev7d, prCount, habitsCompliancePct, weightDelta, hasCheckin }) {
  const G = accentColor || "#02d1ba";
  const sessionsTrend = sessions7d - sessionsPrev7d;
  const trendIcon = sessionsTrend > 0 ? "↑" : sessionsTrend < 0 ? "↓" : "→";
  const trendColor = sessionsTrend > 0 ? "#34d399" : sessionsTrend < 0 ? "#fb923c" : "rgba(255,255,255,0.5)";

  const stats = [
    { label: "Séances", value: sessions7d, sub: sessionsTrend !== 0 ? `${trendIcon} ${Math.abs(sessionsTrend)}` : "", subColor: trendColor },
    ...(prCount > 0 ? [{ label: "Records", value: prCount, sub: "battus", subColor: "#fbbf24" }] : []),
    ...(habitsCompliancePct !== null ? [{ label: "Habits", value: `${habitsCompliancePct}%`, sub: "compliance 7j", subColor: habitsCompliancePct >= 75 ? "#34d399" : habitsCompliancePct >= 50 ? G : "#fb923c" }] : []),
    ...(weightDelta !== null ? [{ label: "Poids", value: `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}`, sub: "kg vs sem-1", subColor: "rgba(255,255,255,0.5)" }] : []),
  ];

  const subject = sessions7d > 0
    ? `${firstName ? firstName + ", t" : "T"}a semaine en chiffres · ${sessions7d} séance${sessions7d > 1 ? "s" : ""}`
    : `${firstName ? firstName + ", o" : "O"}n se voit cette semaine ?`;

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><title>${escHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif;color:#fff;">
  <div style="max-width:540px;margin:0 auto;padding:36px 28px;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:10px;">Bilan hebdo</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:#fff;line-height:1.2;">
        ${escHtml(firstName || "Ta")} semaine<span style="color:${G};">.</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(${stats.length}, 1fr);gap:8px;margin-bottom:28px;">
      ${stats.map((s) => `
      <div style="padding:18px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;text-align:center;">
        <div style="font-size:28px;font-weight:200;color:#fff;letter-spacing:-1px;line-height:1;">${escHtml(s.value)}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-top:6px;">${escHtml(s.label)}</div>
        ${s.sub ? `<div style="font-size:10px;color:${s.subColor};margin-top:4px;font-weight:600;">${escHtml(s.sub)}</div>` : ""}
      </div>`).join("")}
    </div>

    ${!hasCheckin ? `
    <div style="padding:18px 22px;background:rgba(2,209,186,0.06);border:1px solid rgba(2,209,186,0.2);border-radius:14px;margin-bottom:24px;">
      <div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.6;margin-bottom:12px;">
        <strong>Tu n'as pas encore soumis ton bilan cette semaine</strong> — 30 secondes pour ton coach.
      </div>
      <a href="https://rbperform.app/login?view=checkin" style="display:inline-block;padding:10px 18px;background:${G};color:#000;border-radius:9px;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;">Remplir mon bilan →</a>
    </div>` : ""}

    <div style="padding:16px 20px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:14px;margin-bottom:24px;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.7;">
        ${sessions7d === 0
          ? "Pas de séance cette semaine. Tout le monde a le droit à une coupure — mais une bonne semaine commence par démarrer."
          : sessionsTrend > 0
            ? `${sessionsTrend} séance${sessionsTrend > 1 ? "s" : ""} de plus que la semaine passée. Tu accélères.`
            : sessionsTrend < 0
              ? "Léger recul cette semaine. Pas grave — la régularité bat l'intensité."
              : "Régularité parfaite. Le coach voit ta consistance."}
      </div>
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://rbperform.app/login" style="display:inline-block;padding:13px 28px;background:${G};color:#000;border-radius:11px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Ouvrir l'app</a>
    </div>

    <div style="padding-top:18px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <div style="font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:3px;text-transform:uppercase;font-weight:700;">RB Perform</div>
    </div>

  </div>
</body></html>`;

  return { subject, html };
}

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.warn("[weekly-email] RESEND_API_KEY missing — skip");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[weekly-email] Resend failed", res.status, text);
    return false;
  }
  return true;
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase env missing" });

  try {
    // Sem en cours = lundi 0h00 UTC → maintenant
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - diff);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartIso = weekStart.toISOString();
    const weekStartDate = weekStart.toISOString().slice(0, 10);
    // Sem précédente
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const prevWeekStartIso = prevWeekStart.toISOString();

    const clients = await sbFetch(
      `/rest/v1/clients?select=id,full_name,email,onboarding_done,coaches(accent_color)&onboarding_done=eq.true`
    );
    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, eligible: 0 });
    }

    let sent = 0;
    let skipped = 0;
    for (const c of clients) {
      if (!c.email) { skipped++; continue; }
      const firstName = (c.full_name || "").split(" ")[0] || "";
      const accentColor = c.coaches?.accent_color || "#02d1ba";

      // Fetch en parallèle pour ce client
      const [sessions, sessionsPrev, prs, habits, habitLogs7, weights, checkin] = await Promise.all([
        sbFetch(`/rest/v1/session_logs?client_id=eq.${c.id}&logged_at=gte.${weekStartIso}&select=id`),
        sbFetch(`/rest/v1/session_logs?client_id=eq.${c.id}&logged_at=gte.${prevWeekStartIso}&logged_at=lt.${weekStartIso}&select=id`),
        sbFetch(`/rest/v1/coach_activity_log?client_id=eq.${c.id}&activity_type=eq.client_pr&created_at=gte.${weekStartIso}&select=id`),
        sbFetch(`/rest/v1/habits?client_id=eq.${c.id}&active=eq.true&select=id`),
        sbFetch(`/rest/v1/habit_logs?client_id=eq.${c.id}&date=gte.${weekStartDate}&select=id`),
        sbFetch(`/rest/v1/weight_logs?client_id=eq.${c.id}&select=date,weight&order=date.desc&limit=20`),
        sbFetch(`/rest/v1/weekly_checkins?client_id=eq.${c.id}&week_start=eq.${weekStartDate}&select=id`),
      ]);

      const sessions7d = Array.isArray(sessions) ? sessions.length : 0;
      const sessionsPrev7d = Array.isArray(sessionsPrev) ? sessionsPrev.length : 0;
      const prCount = Array.isArray(prs) ? prs.length : 0;
      const habitsCount = Array.isArray(habits) ? habits.length : 0;
      const habitLogsCount = Array.isArray(habitLogs7) ? habitLogs7.length : 0;
      const habitsCompliancePct = habitsCount > 0
        ? Math.round((habitLogsCount / (habitsCount * 7)) * 100)
        : null;
      const hasCheckin = Array.isArray(checkin) && checkin.length > 0;
      // Weight delta : poids le plus récent vs le plus ancien dans la semaine
      let weightDelta = null;
      if (Array.isArray(weights) && weights.length >= 2) {
        const latest = weights[0].weight;
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const baseline = weights.find((w) => w.date <= sevenDaysAgo);
        if (baseline) weightDelta = parseFloat(latest) - parseFloat(baseline.weight);
      }

      // Skip envoi si client totalement inactif (0 séances, 0 habits, 0 weight)
      // → évite spam "ta semaine n'a rien" aux clients en pause/churn.
      if (sessions7d === 0 && sessionsPrev7d === 0 && habitsCount === 0 && (!Array.isArray(weights) || weights.length === 0)) {
        skipped++; continue;
      }

      const { subject, html } = buildEmail({
        firstName, accentColor,
        sessions7d, sessionsPrev7d, prCount,
        habitsCompliancePct, weightDelta, hasCheckin,
      });
      const ok = await sendEmail(c.email, subject, html);
      if (ok) sent++;
    }

    return res.status(200).json({ ok: true, eligible: clients.length, sent, skipped });
  } catch (e) {
    console.error("[cron-client-weekly-email]", e);
    await captureException(e, { tags: { endpoint: "cron-client-weekly-email" } });
    return res.status(500).json({ error: e.message });
  }
};
