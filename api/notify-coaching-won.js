/**
 * POST /api/notify-coaching-won
 *
 * Déclenché quand Rayan marque un call comme "closed_won" dans le CRM.
 * Envoie au candidat le mail "tu as fait le bon choix" qui :
 *   - Renforce la décision (anti remords post-call)
 *   - Lui rappelle ce qu'il a signé sans dévoiler le prix
 *   - Lui indique les next steps (paiement via lien envoyé par Rayan + onboarding)
 *
 * Auth : super_admin JWT OU INTERNAL_API_SECRET (server-to-server).
 *
 * Body : { application_id: uuid }
 *
 * Verrous brand respectés :
 *   - JAMAIS le mot "coach sportif" ou "préparateur"
 *   - JAMAIS le prix
 *   - Ton : "athlète qui accompagne les athlètes"
 */

const { z } = require('zod');
const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const ADMIN_SECRET = process.env.ADMIN_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
const G = '#02d1ba';

const bodySchema = z.object({
  application_id: z.string().uuid(),
});

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

function hasServerSecret(req) {
  if (!ADMIN_SECRET) return false;
  const headerSecret = req.headers['x-admin-secret'];
  if (headerSecret && headerSecret === ADMIN_SECRET) return true;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${ADMIN_SECRET}`;
}

async function isSupabaseSuperAdmin(req) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const jwt = m[1];
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
    });
    if (!userResp.ok) return false;
    const user = await userResp.json();
    const email = (user?.email || '').toLowerCase();
    if (!email) return false;
    const check = await sbFetch(
      `/rest/v1/super_admins?email=eq.${encodeURIComponent(email)}&select=email&limit=1`
    );
    return Array.isArray(check) && check.length > 0;
  } catch { return false; }
}

function buildWonEmail(firstName) {
  const name = firstName ? `, ${escHtml(firstName)}` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">On commence ensemble</div>

    <div style="font-size:30px;font-weight:900;color:#fff;line-height:1.15;letter-spacing:-1px;margin-bottom:16px">
      T'as fait le bon choix${name}.
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.75;margin-bottom:22px">
      Je voulais te le dire à chaud, post-call : les athlètes qui prennent ce genre de décision rapidement, c'est exactement le profil avec qui je fais les plus gros résultats. Pas une coïncidence.
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.75;margin-bottom:26px">
      Tu vas pas regretter — pas parce que je te le dis, parce que les 90 prochains jours vont être pensés autour de TOI : ton objectif, ton agenda, tes points faibles, ton ressenti. Pas une copie d'un autre programme. Pas un PDF générique.
    </div>

    <div style="margin-bottom:26px;padding:20px;background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.2);border-radius:12px">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:12px">Tes 3 prochaines étapes</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.7">
        <strong style="color:#fff">1. Paiement</strong> — tu reçois le lien (que je t'ai partagé sur le call). Tu cliques, t'es onboardé en 2 minutes.<br><br>
        <strong style="color:#fff">2. Page d'accueil</strong> — après le paiement, tu tombes sur ta roadmap 30 jours et tu télécharges l'app.<br><br>
        <strong style="color:#fff">3. Ton premier programme</strong> — je le construis sous 48h max après ton paiement, sur la base de ce qu'on s'est dit.
      </div>
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin-bottom:14px">
      Si t'as une question, réponds à ce mail. Je lis tout.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:4px">
      On va faire un truc bien ensemble.
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
  const serverOk = hasServerSecret(req);
  const superAdminOk = serverOk ? false : await isSupabaseSuperAdmin(req);
  if (!serverOk && !superAdminOk) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  let body;
  try {
    body = bodySchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid body', detail: e.errors });
  }

  try {
    const apps = await sbFetch(
      `/rest/v1/coaching_applications?id=eq.${body.application_id}&select=id,email,nom_prenom&limit=1`
    );
    if (!Array.isArray(apps) || apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = apps[0];

    let emailSent = false;
    const transporter = buildTransporter();
    if (transporter && app.email) {
      try {
        const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [app.email],
          replyTo: SMTP_USER,
          subject: `T'as fait le bon choix${firstName ? ', ' + firstName : ''}`,
          html: buildWonEmail(firstName),
        });
        emailSent = true;
      } catch (e) {
        console.error(`[WON_EMAIL_FAIL] app=${app.id} email=${app.email} reason="${e.message}"`);
        await captureException(e, {
          tags: { endpoint: 'notify-coaching-won', stage: 'email' },
          extra: { application_id: app.id },
        });
      }
    }

    return res.status(200).json({ ok: true, email_sent: emailSent });
  } catch (err) {
    console.error('[notify-coaching-won] unexpected:', err.message);
    await captureException(err, { tags: { endpoint: 'notify-coaching-won' } });
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
