/**
 * Cron pre-call reminders pour candidatures coaching.
 * Schedule : tous les heures (vercel.json crons)
 *
 * Pour chaque coaching_applications avec call_scheduled_at à venir :
 *   - J-1 (entre 22h et 26h avant) : email "demain on se parle"
 *   - H-2 (entre 1h30 et 2h30 avant) : email "RDV dans 2h"
 *   - H-0 (entre 0min et 15min avant) : email "lien direct + tu peux me joindre ici"
 *
 * Dedup : table notification_logs (type = call_reminder_X) pour ne pas
 * re-envoyer 2x le même reminder.
 *
 * Pour set call_scheduled_at : Rayan le fait via Supabase Studio ou via
 * une future enhancement CRM (champ "Confirmer le créneau").
 */

const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');
const { RB_SUPPORT_EMAIL } = require('./_branding');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const G = '#02d1ba';

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CRON_AUTH_FAIL] CRON_SECRET missing');
    return false;
  }
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${cronSecret}`;
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SB ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

function formatCallTime(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return { day, time, full: `${day} à ${time}` };
}

const TEMPLATES = {
  // J-1 (la veille)
  d_minus_1: (firstName, callIso) => {
    const { full } = formatCallTime(callIso);
    return {
      subject: `Demain on se parle, ${firstName || 'champion'}`,
      html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">
    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">Rappel — J-1</div>
    <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.2;letter-spacing:-0.5px;margin-bottom:16px">
      Demain on se parle${firstName ? `, ${escHtml(firstName)}` : ''}.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:26px">
      Notre appel stratégique est prévu pour <strong style="color:#fff">${escHtml(full)}</strong>. 30 minutes, on regarde ensemble si on peut bosser ensemble.
    </div>
    <div style="margin-bottom:24px;padding:18px 20px;background:rgba(2,209,186,0.05);border-left:3px solid ${G};border-radius:6px">
      <div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.7;font-weight:600;margin-bottom:8px">3 choses avant demain :</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7">
        → <strong style="color:#fff">Endroit calme</strong>, écouteurs si possible<br>
        → <strong style="color:#fff">Ton vrai pourquoi</strong> en tête (au-delà du physique)<br>
        → <strong style="color:#fff">Ton budget annuel forme</strong> (salle + suppléments + bouffe spé) au clair
      </div>
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7">
      Si tu ne peux plus, préviens-moi 24h avant. Sinon, à demain.
    </div>
  </td></tr>
  <tr><td style="padding:20px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.25)">Rayan · RB Perform</div>
  </td></tr>
</table>
</td></tr></table></body></html>`,
    };
  },

  // H-2 (2h avant)
  h_minus_2: (firstName, callIso) => {
    const { time } = formatCallTime(callIso);
    return {
      subject: `On se parle dans 2h ${firstName ? `, ${firstName}` : ''}`,
      html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">
    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">Dans 2 heures</div>
    <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.2;letter-spacing:-0.5px;margin-bottom:16px">
      On se parle à ${escHtml(time)}.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:26px">
      Trouve un endroit calme, branche tes écouteurs. Je t'appelle au numéro que tu m'as donné dans ta candidature.
    </div>
    <div style="margin-bottom:24px;padding:14px 18px;background:rgba(2,209,186,0.05);border-left:3px solid ${G};border-radius:6px">
      <div style="font-size:13px;color:#fff;line-height:1.6;font-weight:600">
        Si tu ne peux plus, dis-le maintenant — pas dans 1h30.
      </div>
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7">
      À tout' .
    </div>
  </td></tr>
  <tr><td style="padding:20px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.25)">Rayan · RB Perform</div>
  </td></tr>
</table>
</td></tr></table></body></html>`,
    };
  },
};

function buildTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// IMPORTANT : utilise funnel_notification_logs (pas notification_logs).
// notification_logs.client_id a une FK vers clients(id) → l'application_id ne
// passe pas. Migration 118 introduit funnel_notification_logs sans FK.
async function wasSent(applicationId, type) {
  const data = await sbFetch(
    `/rest/v1/funnel_notification_logs?ref_id=eq.${applicationId}&type=eq.${type}&select=id&limit=1`
  );
  return Array.isArray(data) && data.length > 0;
}

async function logSent(applicationId, type) {
  await sbFetch('/rest/v1/funnel_notification_logs', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      ref_id: applicationId,
      type,
      sent_date: new Date().toISOString().split('T')[0],
    }),
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  const transporter = buildTransporter();
  if (!transporter) {
    return res.status(500).json({ error: 'Missing ZOHO_SMTP_PASS' });
  }

  const results = { d_minus_1: 0, h_minus_2: 0, skipped: 0, errors: 0 };
  const now = new Date();

  try {
    // Fenêtre intéressante : calls programmés dans les 26h à venir (= J-1 max)
    const max = new Date(now.getTime() + 26 * 3600 * 1000).toISOString();
    const min = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

    const apps = await sbFetch(
      `/rest/v1/coaching_applications?call_scheduled_at=gte.${min}&call_scheduled_at=lte.${max}&select=id,email,nom_prenom,call_scheduled_at&order=call_scheduled_at.asc`
    );
    if (!Array.isArray(apps)) {
      return res.status(500).json({ error: 'Failed to load applications', detail: apps });
    }

    for (const app of apps) {
      const callTime = new Date(app.call_scheduled_at).getTime();
      const hoursUntil = (callTime - now.getTime()) / 3600000;
      const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';

      try {
        // J-1 : entre 22h et 26h avant
        if (hoursUntil >= 22 && hoursUntil <= 26) {
          if (await wasSent(app.id, 'call_reminder_d_minus_1')) {
            results.skipped++;
            continue;
          }
          const tpl = TEMPLATES.d_minus_1(firstName, app.call_scheduled_at);
          await transporter.sendMail({
            from: `Rayan · RB Perform <${SMTP_USER}>`,
            to: [app.email],
            replyTo: SMTP_USER,
            subject: tpl.subject,
            html: tpl.html,
          });
          await logSent(app.id, 'call_reminder_d_minus_1');
          results.d_minus_1++;
        }
        // H-2 : entre 1.5h et 2.5h avant
        else if (hoursUntil >= 1.5 && hoursUntil <= 2.5) {
          if (await wasSent(app.id, 'call_reminder_h_minus_2')) {
            results.skipped++;
            continue;
          }
          const tpl = TEMPLATES.h_minus_2(firstName, app.call_scheduled_at);
          await transporter.sendMail({
            from: `Rayan · RB Perform <${SMTP_USER}>`,
            to: [app.email],
            replyTo: SMTP_USER,
            subject: tpl.subject,
            html: tpl.html,
          });
          await logSent(app.id, 'call_reminder_h_minus_2');
          results.h_minus_2++;
        }
      } catch (err) {
        results.errors++;
        console.error(`[CALL_REMINDER_FAIL] app=${app.id} email=${app.email} err=${err.message}`);
        await captureException(err, {
          tags: { cron: 'coaching-call-reminder' },
          extra: { application_id: app.id, hours_until: hoursUntil },
        });
      }
    }

    return res.status(200).json({ ok: true, processed: apps.length, ...results });
  } catch (err) {
    console.error('[cron-coaching-call-reminder] unexpected:', err.message);
    await captureException(err, { tags: { cron: 'coaching-call-reminder', stage: 'unexpected' } });
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
