/**
 * GET /api/cron-coaching-call-reminders
 *
 * Cron Vercel (1×/h) qui envoie 2 mails distincts pour réduire le no-show :
 *   - **H-24** : "Confirme ton appel demain à HH:MM" avec bouton qui marque
 *     call_confirmed_at en DB. Génère un token unique. Réduit no-show ~30%
 *     selon spec Jonas.
 *   - **H-2** : rappel court "Ton appel dans 2h, prêt ?" avec lien WhatsApp.
 *
 * Anti-doublon via `reminder_h24_sent_at` / `reminder_h2_sent_at`.
 *
 * Fenêtres :
 *   - H-24 : call_scheduled_at dans [now+23h, now+25h]
 *   - H-2  : call_scheduled_at dans [now+1.5h, now+2.5h]
 *
 * Vercel cron headers : on accepte uniquement les requêtes signées avec
 * VERCEL_CRON_SECRET ou le secret admin (test manuel).
 */

const nodemailer = require('nodemailer');
const crypto = require('node:crypto');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const ADMIN_SECRET = process.env.ADMIN_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://rbperform.app';
const WHATSAPP_URL = 'https://wa.me/33695129347';
const G = '#02d1ba';

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

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
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`SB ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function isAuthorized(req) {
  // Vercel cron : signed via VERCEL_CRON_SECRET dans Authorization header
  const auth = req.headers.authorization || '';
  if (process.env.VERCEL_CRON_SECRET && auth === `Bearer ${process.env.VERCEL_CRON_SECRET}`) return true;
  // Test manuel : admin secret
  if (ADMIN_SECRET && auth === `Bearer ${ADMIN_SECRET}`) return true;
  if (ADMIN_SECRET && req.headers['x-admin-secret'] === ADMIN_SECRET) return true;
  return false;
}

function fmtFR(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }).format(date).replace(':', 'h');
}

function fmtTimeOnly(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit',
  }).format(date).replace(':', 'h');
}

function buildH24Email({ firstName, dateLabel, confirmUrl }) {
  const name = firstName ? ` ${escHtml(firstName)}` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:18px;font-weight:800">Demain · ${escHtml(dateLabel.split(' à ')[0])}</div>

    <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.2;letter-spacing:-0.5px;margin-bottom:18px">
      On s'appelle demain${name}.
    </div>

    <div style="font-size:18px;color:${G};font-weight:800;margin-bottom:24px">
      ${escHtml(dateLabel)}
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:24px">
      Petit check rapide : confirme que t'es toujours dispo demain pour qu'on s'organise. Si t'as un imprévu, mieux vaut décaler maintenant que perdre nos 30 min mutuellement.
    </div>

    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 14px;width:100%">
      <tr>
        <td align="center" valign="middle" bgcolor="${G}" style="background:${G};border-radius:10px;padding:0">
          <a href="${confirmUrl}" target="_blank" rel="noopener" style="display:block;padding:16px 16px;color:#000;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:.5px;font-family:-apple-system,Inter,sans-serif">Je confirme — j'y serai</a>
        </td>
      </tr>
    </table>

    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;width:100%">
      <tr>
        <td align="center" valign="middle" bgcolor="#181818" style="background:#181818;border-radius:10px;border:1px solid rgba(255,255,255,0.12);padding:0">
          <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" style="display:block;padding:13px 16px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;font-family:-apple-system,Inter,sans-serif">Décaler / problème → WhatsApp</a>
        </td>
      </tr>
    </table>

    <div style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;padding-top:18px;border-top:1px solid rgba(255,255,255,0.06)">
      Si t'as pas le temps de cliquer "Je confirme", pas grave, je t'appelle quand même demain. Mais une réponse rapide me confirme que c'est good de ton côté.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.85);font-weight:700;margin-top:24px">
      Rayan
    </div>

  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function buildH2Email({ firstName, timeLabel, isConfirmed }) {
  const name = firstName ? ` ${escHtml(firstName)}` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:36px 30px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:14px;font-weight:800">Dans 2 heures</div>

    <div style="font-size:24px;font-weight:900;color:#fff;line-height:1.2;margin-bottom:18px">
      ${escHtml(timeLabel)}${name} — t'es prêt.
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:22px">
      Je t'appelle sur WhatsApp à l'heure. Casque, endroit calme, 30 min focus. Réfléchis à ton vrai pourquoi pendant ces 2 heures — c'est ce qui va faire la différence dans nos échanges.
    </div>

    ${isConfirmed ? '' : `<div style="font-size:13px;color:rgba(245,158,11,0.85);line-height:1.6;margin-bottom:18px;padding:12px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:8px">
      Tu n'as pas encore confirmé. Si tu peux plus, préviens-moi sur WhatsApp <strong>maintenant</strong> pour qu'on cale autrement.
    </div>`}

    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 14px;width:100%">
      <tr>
        <td align="center" valign="middle" bgcolor="#181818" style="background:#181818;border-radius:10px;border:1px solid rgba(255,255,255,0.12);padding:0">
          <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" style="display:block;padding:13px 16px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;font-family:-apple-system,Inter,sans-serif">WhatsApp Rayan</a>
        </td>
      </tr>
    </table>

    <div style="font-size:14px;color:rgba(255,255,255,0.85);font-weight:700;margin-top:18px">
      À tout à l'heure.<br>Rayan
    </div>

  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function buildTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu', port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

module.exports = async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }
  const transporter = buildTransporter();
  if (!transporter) {
    return res.status(500).json({ error: 'SMTP not configured' });
  }

  const now = Date.now();
  // Fenêtres généreuses (le cron tourne 1x/h, on couvre 2h pour éviter qu'un
  // call tombe entre 2 runs si le cron est en retard / Vercel resched).
  const h24Start = new Date(now + 23 * 3600000).toISOString();
  const h24End   = new Date(now + 25 * 3600000).toISOString();
  const h2Start  = new Date(now + 1.5 * 3600000).toISOString();
  const h2End    = new Date(now + 2.5 * 3600000).toISOString();

  const results = { h24_sent: 0, h2_sent: 0, errors: [] };

  // ── H-24 ──
  try {
    const h24Apps = await sbFetch(
      `/rest/v1/coaching_applications?call_scheduled_at=gte.${h24Start}&call_scheduled_at=lte.${h24End}&reminder_h24_sent_at=is.null&call_outcome=is.null&select=id,email,nom_prenom,call_scheduled_at`
    );
    for (const app of (h24Apps || [])) {
      if (!app.email) continue;
      const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';
      const dateLabel = fmtFR(new Date(app.call_scheduled_at));
      // Génère un token unique pour le bouton de confirmation
      const token = crypto.randomBytes(24).toString('hex');
      const confirmUrl = `${APP_BASE_URL}/api/coaching-call-confirm?token=${token}`;
      try {
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [app.email],
          replyTo: SMTP_USER,
          subject: `Demain — confirme ton appel à ${fmtTimeOnly(new Date(app.call_scheduled_at))}`,
          html: buildH24Email({ firstName, dateLabel, confirmUrl }),
        });
        // Marque sent + sauve le token uniquement après envoi réussi
        await sbFetch(`/rest/v1/coaching_applications?id=eq.${app.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            reminder_h24_sent_at: new Date().toISOString(),
            call_confirm_token: token,
          }),
        });
        results.h24_sent++;
      } catch (e) {
        console.error(`[h24] app=${app.id} email=${app.email} fail: ${e.message}`);
        results.errors.push({ stage: 'h24', app: app.id, err: e.message });
      }
    }
  } catch (e) {
    console.error(`[h24] query fail: ${e.message}`);
    results.errors.push({ stage: 'h24_query', err: e.message });
  }

  // ── H-2 ──
  try {
    const h2Apps = await sbFetch(
      `/rest/v1/coaching_applications?call_scheduled_at=gte.${h2Start}&call_scheduled_at=lte.${h2End}&reminder_h2_sent_at=is.null&call_outcome=is.null&select=id,email,nom_prenom,call_scheduled_at,call_confirmed_at`
    );
    for (const app of (h2Apps || [])) {
      if (!app.email) continue;
      const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';
      const timeLabel = fmtTimeOnly(new Date(app.call_scheduled_at));
      const isConfirmed = !!app.call_confirmed_at;
      try {
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [app.email],
          replyTo: SMTP_USER,
          subject: `Dans 2h — appel à ${timeLabel}`,
          html: buildH2Email({ firstName, timeLabel, isConfirmed }),
        });
        await sbFetch(`/rest/v1/coaching_applications?id=eq.${app.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ reminder_h2_sent_at: new Date().toISOString() }),
        });
        results.h2_sent++;
      } catch (e) {
        console.error(`[h2] app=${app.id} email=${app.email} fail: ${e.message}`);
        results.errors.push({ stage: 'h2', app: app.id, err: e.message });
      }
    }
  } catch (e) {
    console.error(`[h2] query fail: ${e.message}`);
    results.errors.push({ stage: 'h2_query', err: e.message });
  }

  await captureException(null, { tags: { cron: 'call-reminders' }, extra: results }).catch(() => {});
  return res.status(200).json({ ok: true, ...results });
};
