/**
 * GET /api/cron-crm-weekly-digest
 *
 * Cron hebdo (dimanche 19h Paris) qui envoie à Rayan un digest des KPIs
 * du funnel coaching de la semaine écoulée :
 *   - Nb candidatures reçues
 *   - Nb calls bookés (call_scheduled_at posé)
 *   - Nb calls confirmed (mail H-24 click)
 *   - Nb calls réalisés (call_outcome = closed_won / closed_lost / no_show)
 *   - Show-up rate (= 1 - no_show / total_realisés)
 *   - Close rate (= closed_won / (closed_won + closed_lost))
 *   - Top 3 sources (UTM / source field)
 *   - Recommandation auto si KPIs faibles
 *
 * Format mail : sobre, brand RB Perform, lisible en 10s sur mobile.
 *
 * Auth : Bearer CRON_SECRET (Vercel cron) ou INTERNAL_API_SECRET.
 */

const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const ADMIN_SECRET = process.env.ADMIN_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
const RAYAN_EMAIL = process.env.RAYAN_PERSONAL_EMAIL || 'rayan.b2701@gmail.com';
const G = '#02d1ba';

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`SB ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function isAuthorized(req) {
  const auth = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  if (ADMIN_SECRET && auth === `Bearer ${ADMIN_SECRET}`) return true;
  if (ADMIN_SECRET && req.headers['x-admin-secret'] === ADMIN_SECRET) return true;
  return false;
}

function pct(n, d) {
  if (!d || d <= 0) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

function buildDigestEmail({ since, until, k, top3 }) {
  const periodLabel = `${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(since)} → ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(until)}`;

  // Recommandations auto basées sur les KPIs
  const recs = [];
  if (k.candidatures === 0) {
    recs.push('Aucune candidature cette semaine. Pousse 1-2 stories ou un DM à des prospects identifiés.');
  } else if (k.candidatures < 3) {
    recs.push(`Seulement ${k.candidatures} candidature(s). Push tes contenus haute-conversion (méthode, transformation).`);
  }
  if (k.calls_booked > 0 && k.show_up_rate_pct != null && k.show_up_rate_pct < 75) {
    recs.push(`Show-up rate ${k.show_up_rate_pct}%. Active confirme H-24 (déjà en place) + rappel WhatsApp manuel J-1 sur les borderline.`);
  }
  if (k.calls_done > 0 && k.close_rate_pct != null && k.close_rate_pct < 50) {
    recs.push(`Close rate ${k.close_rate_pct}%. Re-lis tes notes : objection prix ? timing ? ou pas le bon profil ?`);
  }
  if (recs.length === 0 && k.candidatures > 0) {
    recs.push('Bonne semaine. Continue de pousser le contenu qui marche.');
  }

  const row = (label, val, accent) => `
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:rgba(255,255,255,0.6);font-weight:600">${escHtml(label)}</td>
      <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:22px;color:${accent || '#fff'};font-weight:800;letter-spacing:-0.5px;text-align:right">${escHtml(String(val))}</td>
    </tr>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:36px 28px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:8px;font-weight:800">Digest CRM</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:24px">${escHtml(periodLabel)} (7 derniers jours)</div>

    <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(255,255,255,0.02);border-radius:12px;overflow:hidden;margin-bottom:24px">
      ${row('Candidatures reçues', k.candidatures, G)}
      ${row('Calls bookés', k.calls_booked, '#fff')}
      ${row('Calls confirmés (H-24)', k.calls_confirmed, '#fff')}
      ${row('Calls réalisés', k.calls_done, '#fff')}
      ${row('No-show', k.no_show, k.no_show > 0 ? '#fbbf24' : '#fff')}
      ${row('Signés', k.closed_won, k.closed_won > 0 ? G : '#fff')}
    </table>

    <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(2,209,186,0.04);border:1px solid ${G}22;border-radius:12px;overflow:hidden;margin-bottom:24px">
      ${row('Show-up rate', k.show_up_rate_pct != null ? `${k.show_up_rate_pct}%` : '—', G)}
      ${row('Close rate', k.close_rate_pct != null ? `${k.close_rate_pct}%` : '—', G)}
    </table>

    ${top3.length > 0 ? `
    <div style="margin-bottom:24px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:10px">Top sources</div>
      ${top3.map((s, i) => `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.025);border-radius:8px;margin-bottom:4px;font-size:13px"><span style="color:rgba(255,255,255,0.75);text-transform:capitalize">${i+1}. ${escHtml(s.source)}</span><span style="color:${G};font-weight:700">${s.count}</span></div>`).join('')}
    </div>` : ''}

    ${recs.length > 0 ? `
    <div style="padding:16px 18px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);border-radius:12px;margin-bottom:24px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#fbbf24;font-weight:800;margin-bottom:10px">À faire cette semaine</div>
      ${recs.map(r => `<div style="font-size:13px;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:6px">→ ${escHtml(r)}</div>`).join('')}
    </div>` : ''}

    <div style="text-align:center;margin-top:20px">
      <a href="https://rbperform.app/admin/crm" target="_blank" style="display:inline-block;padding:12px 22px;background:${G};color:#000;text-decoration:none;border-radius:10px;font-size:12px;font-weight:800;letter-spacing:.5px">Ouvrir le CRM</a>
    </div>

  </td></tr>
  <tr><td style="padding:18px 0 0;text-align:center"><div style="font-size:10px;color:rgba(255,255,255,0.22);letter-spacing:.5px">RB Perform · Digest auto dimanche 19h</div></td></tr>
</table>
</td></tr></table></body></html>`;
}

module.exports = async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Missing Supabase env' });
  if (!SMTP_PASS) return res.status(500).json({ error: 'SMTP not configured' });

  const until = new Date();
  const since = new Date(until.getTime() - 7 * 86400 * 1000);
  const sinceISO = since.toISOString();
  const untilISO = until.toISOString();

  try {
    // Toutes les candidatures créées dans la fenêtre
    const newApps = await sbFetch(
      `/rest/v1/coaching_applications?created_at=gte.${sinceISO}&created_at=lte.${untilISO}&select=id,source,utm_source`
    );

    // Calls bookés dans la fenêtre (call_scheduled_at posé dans la fenêtre — pour calls futurs)
    // OU calls réalisés dans la fenêtre (call_completed_at dans la fenêtre — closed_won/lost/no_show)
    const allApps = await sbFetch(
      `/rest/v1/coaching_applications?or=(call_scheduled_at.gte.${sinceISO},call_completed_at.gte.${sinceISO})&select=id,call_scheduled_at,call_completed_at,call_outcome,call_confirmed_at`
    );

    const calls_booked = allApps.filter(a => a.call_scheduled_at && new Date(a.call_scheduled_at) >= since && new Date(a.call_scheduled_at) <= until).length;
    const calls_confirmed = allApps.filter(a => a.call_confirmed_at && new Date(a.call_confirmed_at) >= since && new Date(a.call_confirmed_at) <= until).length;
    const calls_done_arr = allApps.filter(a => a.call_completed_at && new Date(a.call_completed_at) >= since && new Date(a.call_completed_at) <= until && ['closed_won','closed_lost','no_show'].includes(a.call_outcome));
    const calls_done = calls_done_arr.length;
    const no_show = calls_done_arr.filter(a => a.call_outcome === 'no_show').length;
    const closed_won = calls_done_arr.filter(a => a.call_outcome === 'closed_won').length;
    const closed_lost = calls_done_arr.filter(a => a.call_outcome === 'closed_lost').length;

    const show_up_rate_pct = calls_done > 0 ? Math.round(((calls_done - no_show) / calls_done) * 100) : null;
    const close_attempts = closed_won + closed_lost;
    const close_rate_pct = close_attempts > 0 ? Math.round((closed_won / close_attempts) * 100) : null;

    // Top sources des nouvelles candidatures
    const sourceCounts = {};
    for (const a of newApps) {
      const src = a.utm_source || a.source || 'unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
    const top3 = Object.entries(sourceCounts).sort(([,a],[,b]) => b - a).slice(0, 3).map(([source, count]) => ({ source, count }));

    const k = {
      candidatures: newApps.length,
      calls_booked, calls_confirmed, calls_done, no_show, closed_won,
      show_up_rate_pct, close_rate_pct,
    };

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu', port: 465, secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `RB Perform <${SMTP_USER}>`,
      to: [RAYAN_EMAIL],
      replyTo: SMTP_USER,
      subject: `Digest CRM · ${k.candidatures} candidatures, ${closed_won} signés cette semaine`,
      html: buildDigestEmail({ since, until, k, top3 }),
    });

    return res.status(200).json({ ok: true, kpis: k, top3, period: { since: sinceISO, until: untilISO } });
  } catch (err) {
    console.error('[weekly-digest] err:', err.message);
    await captureException(err, { tags: { cron: 'crm-weekly-digest' } }).catch(() => {});
    return res.status(500).json({ error: err.message });
  }
};
