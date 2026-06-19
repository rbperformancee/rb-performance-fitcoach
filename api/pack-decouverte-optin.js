/**
 * POST /api/pack-decouverte-optin
 *
 * Lead magnet front-funnel : capture email d'un visiteur qui veut le
 * Pack Découverte gratuit. Insère dans pack_decouverte_optins, envoie le
 * mail de livraison immédiat (lien pack), et le cron nurture prend le
 * relais pour les 5 mails J+0 à J+7.
 *
 * Public — pas d'auth (mais rate-limit 3/heure/IP anti-spam).
 *
 * Body : { email, nom_prenom?, source?, utm_source?, utm_medium?, utm_campaign? }
 */

const { z } = require('zod');
const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const PACK_URL = process.env.EBOOK_PURCHASE_URL ||
  'https://www.rbperform.com/programmes?utm_source=rbperform_app&utm_medium=email&utm_campaign=lead_magnet';
const G = '#02d1ba';

const bodySchema = z.object({
  email: z.string().email().max(254),
  nom_prenom: z.string().max(120).optional().nullable(),
  source: z.string().max(60).optional().nullable(),
  utm_source: z.string().max(60).optional().nullable(),
  utm_medium: z.string().max(60).optional().nullable(),
  utm_campaign: z.string().max(80).optional().nullable(),
});

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

// Rate-limit : 3 optins / heure / IP
const ipBuckets = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const cutoff = now - 3600_000;
  const arr = (ipBuckets.get(ip) || []).filter((t) => t > cutoff);
  arr.push(now);
  ipBuckets.set(ip, arr);
  return arr.length > 3;
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

function buildWelcomeEmail(firstName, packUrl) {
  const name = firstName ? `, ${escHtml(firstName)}` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">Pack Découverte</div>

    <div style="font-size:30px;font-weight:900;color:#fff;line-height:1.15;letter-spacing:-1px;margin-bottom:18px">
      C'est offert${name}.
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.75;margin-bottom:24px">
      Tu trouveras dans ce pack 4 semaines de programme structuré (split haut/bas, focus performance), les vidéos de chaque exercice, et un guide nutrition simple pour soutenir l'effort.
    </div>

    <div style="margin-bottom:28px;text-align:center">
      <a href="${escHtml(packUrl)}" style="display:inline-block;padding:16px 32px;background:${G};color:#000;text-decoration:none;font-weight:900;font-size:14px;border-radius:10px;letter-spacing:.5px">
        → ACCÉDER AU PACK
      </a>
    </div>

    <div style="margin-bottom:24px;padding:18px 20px;background:rgba(2,209,186,0.05);border-left:3px solid ${G};border-radius:6px">
      <div style="font-size:13px;color:#fff;line-height:1.7;font-weight:600;margin-bottom:6px">Comment l'utiliser :</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7">
        Choisis le bon split selon ton agenda. Commence à 70% des charges habituelles. Note tes performances. Adapte selon ton ressenti — c'est ça la base d'une progression sérieuse.
      </div>
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin-bottom:14px">
      Je vais t'envoyer 4 mails dans les jours qui viennent — pas du spam, du vrai contenu de méthode que j'utilise sur mes athlètes. Lis-les en diagonale si t'as pas le temps, mais lis-les.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:4px">
      Bon training.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.85);font-weight:700;margin-top:14px">
      Rayan
    </div>

  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.22);letter-spacing:.5px">
      RB Perform · Rayan Bonte
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function buildTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limit' });
  }

  let body;
  try {
    body = bodySchema.parse(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const emailLower = body.email.toLowerCase().trim();
  const firstName = (body.nom_prenom || '').trim().split(/\s+/)[0] || '';

  try {
    // Upsert sur lower(email) — pas d'erreur si déjà optin
    const upsert = await sbFetch('/rest/v1/pack_decouverte_optins?on_conflict=email', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify({
        email: emailLower,
        nom_prenom: body.nom_prenom || null,
        source: body.source || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
      }),
    });

    const isNew = Array.isArray(upsert) && upsert.length > 0;

    // Envoyer le welcome (même si déjà optin, on renvoie le pack)
    const transporter = buildTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [emailLower],
          replyTo: SMTP_USER,
          subject: `Ton Pack Découverte est dispo${firstName ? ', ' + firstName : ''}`,
          html: buildWelcomeEmail(firstName, PACK_URL),
        });
      } catch (e) {
        console.error(`[PACK_WELCOME_FAIL] email=${emailLower} reason="${e.message}"`);
        await captureException(e, {
          tags: { endpoint: 'pack-decouverte-optin', stage: 'welcome_email' },
          extra: { email: emailLower, is_new: isNew },
        });
      }
    }

    return res.status(200).json({ ok: true, is_new: isNew });
  } catch (err) {
    console.error('[pack-decouverte-optin] unexpected:', err.message);
    await captureException(err, { tags: { endpoint: 'pack-decouverte-optin' } });
    return res.status(500).json({ error: 'Internal error' });
  }
};
