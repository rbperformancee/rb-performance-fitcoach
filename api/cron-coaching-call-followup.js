/**
 * Cron post-call followup pour candidatures coaching.
 * Schedule : tous les jours à 9h30 (UTC) — vercel.json
 *
 * Pour chaque coaching_applications avec call_outcome = 'closed_lost'
 * et call_completed_at récent :
 *   J+1 : mail "j'ai bien noté tes hésitations" + recadre l'enjeu
 *   J+3 : mail "dernière fenêtre — voici 1 vidéo qui répond à ton blocage"
 *   J+7 : mail "je ferme ton dossier — bon courage" (porte fermée, peut rouvrir)
 *
 * Dedup : notification_logs (type = followup_lost_jN).
 *
 * Note : pas de relance sur 'no_show' ici (à gérer manuellement par Rayan,
 * souvent un coup de fil ou WhatsApp direct est plus efficace).
 */

const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const EBOOK_URL = process.env.EBOOK_PURCHASE_URL || 'https://rbperform.com/ebook';
const G = '#02d1ba';

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || '') === `Bearer ${cronSecret}`;
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
  if (!res.ok && res.status !== 204) {
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

const wrap = (eyebrow, body) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">
    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">${eyebrow}</div>
    ${body}
  </td></tr>
  <tr><td style="padding:20px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.25)">Rayan · RB Perform</div>
  </td></tr>
</table>
</td></tr></table></body></html>`;

const TEMPLATES = {
  followup_lost_j1: (firstName) => ({
    subject: `${firstName ? firstName + ', ' : ''}j'ai bien noté ton hésitation`,
    html: wrap('Après notre appel', `
    <div style="font-size:24px;font-weight:900;color:#fff;line-height:1.25;margin-bottom:16px">
      Salut${firstName ? ' ' + escHtml(firstName) : ''}.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:20px">
      Sincèrement, merci pour notre échange hier. J'ai bien capté ton hésitation et je préfère mille fois ça qu'un faux "oui" qui se transforme en regret 2 semaines après.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;margin-bottom:24px">
      Une chose que je veux te clarifier — parce qu'on en a peut-être pas eu le temps : le but de ce qu'on fait ensemble, c'est pas que tu signes "un truc de plus". C'est que tu transformes vraiment ton corps et ta vie de sportif sur 6-12 mois minimum. Si on rentre pas dans cette logique, mieux vaut qu'on ne commence pas.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.85);line-height:1.7;margin-bottom:10px;font-weight:600">
      Ma seule question : qu'est-ce qui t'a vraiment freiné ?
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:8px">
      Réponds-moi en 2 lignes, je lis tout.
    </div>
    `),
  }),

  followup_lost_j3: (firstName) => ({
    subject: `${firstName ? firstName + ', ' : ''}une dernière chose`,
    html: wrap('72 heures après', `
    <div style="font-size:24px;font-weight:900;color:#fff;line-height:1.25;margin-bottom:16px">
      Une dernière chose${firstName ? ', ' + escHtml(firstName) : ''}.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:20px">
      Je vais pas insister 10 fois. Mais 9 fois sur 10 quand quelqu'un dit "je vais réfléchir" sur ce genre de décision, c'est qu'il y a un truc précis qui bloque (le prix, le timing, le doute sur soi-même).
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;margin-bottom:24px">
      Tu sais quoi : si t'as encore une question concrète qui te freine, dis-le moi maintenant. Je te réponds direct, sans pitch. Pas de "tu sais quoi tente le coup". Juste une réponse à ta question.
    </div>
    <div style="margin-bottom:24px;padding:18px 20px;background:rgba(2,209,186,0.05);border-left:3px solid ${G};border-radius:6px">
      <div style="font-size:14px;color:#fff;line-height:1.65;font-weight:600;margin-bottom:6px">Sinon, si tu sais que c'est pas le bon moment :</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.65;margin-bottom:14px">L'ebook Athlète 100J est une alternative complète, sans engagement, pour t'apprendre la méthode et bosser en autonomie.</div>
      <a href="${escHtml(EBOOK_URL)}" style="display:inline-block;padding:11px 20px;background:${G};color:#000;text-decoration:none;font-weight:800;font-size:13px;border-radius:8px">→ Découvrir l'ebook</a>
    </div>
    `),
  }),

  followup_lost_j7: (firstName) => ({
    subject: `Je ferme ton dossier${firstName ? ', ' + firstName : ''}`,
    html: wrap('Une semaine après', `
    <div style="font-size:24px;font-weight:900;color:#fff;line-height:1.25;margin-bottom:16px">
      Je ferme ton dossier.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:20px">
      Pas de hard feelings — au contraire. Je préfère que tu prennes ta décision tranquillement plutôt que de te harceler comme un commercial.
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;margin-bottom:24px">
      Tes infos restent dans mon CRM 12 mois. Si à un moment ta situation évolue — financièrement, mentalement, ou si tu sens que c'est devenu une priorité non-négociable — ping-moi directement à ce mail. Je relis ton dossier sans nouveau formulaire.
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:8px">
      Sinon, continue de bosser sérieusement. C'est ce qui fait la différence à long terme.
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.85);font-weight:700;margin-top:14px">
      Rayan
    </div>
    `),
  }),
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

async function wasSent(applicationId, type) {
  const data = await sbFetch(
    `/rest/v1/notification_logs?client_id=eq.${applicationId}&type=eq.${type}&select=id&limit=1`
  );
  return Array.isArray(data) && data.length > 0;
}

async function logSent(applicationId, type) {
  await sbFetch('/rest/v1/notification_logs', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      client_id: applicationId,
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

  const results = { j1: 0, j3: 0, j7: 0, skipped: 0, errors: 0 };
  const now = Date.now();

  try {
    // Fetch closed_lost de la dernière semaine
    const since = new Date(now - 8 * 86400 * 1000).toISOString();
    const apps = await sbFetch(
      `/rest/v1/coaching_applications?call_outcome=eq.closed_lost&call_completed_at=gte.${since}&select=id,email,nom_prenom,call_completed_at&order=call_completed_at.asc`
    );
    if (!Array.isArray(apps)) {
      return res.status(500).json({ error: 'Failed to load applications', detail: apps });
    }

    for (const app of apps) {
      const completedAt = new Date(app.call_completed_at).getTime();
      const daysSince = (now - completedAt) / 86400000;
      const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';

      let type, tpl;
      if (daysSince >= 1 && daysSince < 2) {
        type = 'followup_lost_j1';
        tpl = TEMPLATES.followup_lost_j1(firstName);
      } else if (daysSince >= 3 && daysSince < 4) {
        type = 'followup_lost_j3';
        tpl = TEMPLATES.followup_lost_j3(firstName);
      } else if (daysSince >= 7 && daysSince < 8) {
        type = 'followup_lost_j7';
        tpl = TEMPLATES.followup_lost_j7(firstName);
      } else {
        results.skipped++;
        continue;
      }

      try {
        if (await wasSent(app.id, type)) {
          results.skipped++;
          continue;
        }
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [app.email],
          replyTo: SMTP_USER,
          subject: tpl.subject,
          html: tpl.html,
        });
        await logSent(app.id, type);
        if (type === 'followup_lost_j1') results.j1++;
        else if (type === 'followup_lost_j3') results.j3++;
        else if (type === 'followup_lost_j7') results.j7++;
      } catch (err) {
        results.errors++;
        console.error(`[FOLLOWUP_LOST_FAIL] app=${app.id} email=${app.email} err=${err.message}`);
        await captureException(err, {
          tags: { cron: 'coaching-call-followup' },
          extra: { application_id: app.id, type, days_since: daysSince },
        });
      }
    }

    return res.status(200).json({ ok: true, processed: apps.length, ...results });
  } catch (err) {
    console.error('[cron-coaching-call-followup] unexpected:', err.message);
    await captureException(err, { tags: { cron: 'coaching-call-followup', stage: 'unexpected' } });
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
