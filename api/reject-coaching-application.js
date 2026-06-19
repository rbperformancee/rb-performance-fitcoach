/**
 * POST /api/reject-coaching-application
 *
 * Rejette une candidature coaching (Rayan décide que ce n'est pas le bon match)
 * et envoie un mail "pas le bon match" gracieux avec lien vers l'ebook 100 jours
 * comme lead magnet de récupération.
 *
 * Auth : super-admin (cookie SUPABASE service role OU header X-Admin-Secret)
 *
 * Body : { application_id: uuid, reason?: string }
 *
 * Side effects :
 *   - UPDATE coaching_applications SET call_outcome='rejected_by_us'
 *   - Envoie email avec lead magnet (best-effort)
 *   - Logue dans notification_logs (type=rejection_sent) pour dedup
 *
 * Réponses :
 *   200 : { ok: true, email_sent: bool }
 *   400 : application_id manquant
 *   401 : non admin
 *   404 : application introuvable
 *   500 : erreur
 */

const { z } = require('zod');
const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');
const { RB_SUPPORT_EMAIL } = require('./_branding');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const ADMIN_SECRET = process.env.ADMIN_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
const G = '#02d1ba';

// URL publique de l'ebook (lead magnet de récupération)
const EBOOK_URL = process.env.EBOOK_PURCHASE_URL || 'https://rbperform.com/ebook';

const bodySchema = z.object({
  application_id: z.string().uuid(),
  reason: z.string().max(2000).optional(),
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

function buildRejectionEmail(firstName) {
  const name = firstName ? `, ${escHtml(firstName)}` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:20px;font-weight:800">Décision sur ta candidature</div>

    <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.25;letter-spacing:-0.5px;margin-bottom:18px">
      Salut${name}.
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.75;margin-bottom:20px">
      J'ai regardé ton dossier en détail. Honnêtement, je ne pense pas que l'accompagnement premium RB Perform soit le bon move pour toi <em>maintenant</em>.
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.75;margin-bottom:26px">
      Ce n'est pas un jugement sur toi — c'est une question de match entre où tu en es aujourd'hui et ce que je propose, qui est un format intensif sur 3 à 12 mois minimum avec une exigence d'engagement spécifique. À ce stade, je préfère être direct plutôt que te prendre ton temps et ton argent.
    </div>

    <div style="margin-bottom:30px;padding:20px;background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.2);border-radius:12px">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:10px">Mon cadeau pour toi</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.65;margin-bottom:16px">
        L'<strong style="color:#fff">Ebook Athlète 100J</strong> — le protocole exact que j'utilise pour construire ma propre prép. Programme détaillé + méthode + suivi. Pas un PDF générique, du vrai contenu actionnable.
      </div>
      <a href="${escHtml(EBOOK_URL)}" style="display:inline-block;padding:12px 22px;background:${G};color:#000;text-decoration:none;font-weight:800;font-size:13px;border-radius:8px;letter-spacing:.5px">→ Découvrir l'ebook</a>
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.75;margin-bottom:18px">
      Tes infos restent dans mon CRM. Si dans 6 mois ta situation a évolué (engagement, budget, clarté sur tes objectifs), reping-moi directement. Je relis le dossier sans nouveau formulaire.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.75;margin-bottom:8px">
      Continue de bosser, même sans moi.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.85);font-weight:700;margin-top:4px">
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

function hasServerSecret(req) {
  if (!ADMIN_SECRET) return false;
  const headerSecret = req.headers['x-admin-secret'];
  if (headerSecret && headerSecret === ADMIN_SECRET) return true;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// Vérifie qu'une JWT Supabase appartient à un super_admin. Permet aux
// boutons du CRM (côté client React) de déclencher la rejection sans
// avoir besoin d'exposer INTERNAL_API_SECRET au navigateur.
async function isSupabaseSuperAdmin(req) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const jwt = m[1];

  try {
    // Décode l'email depuis la JWT puis check la table super_admins via service role
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
    });
    if (!userResp.ok) return false;
    const user = await userResp.json();
    const email = (user?.email || '').toLowerCase();
    if (!email) return false;

    const adminCheck = await sbFetch(
      `/rest/v1/super_admins?email=eq.${encodeURIComponent(email)}&select=email&limit=1`
    );
    return Array.isArray(adminCheck) && adminCheck.length > 0;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Accepte 2 voies d'auth :
  //   1. X-Admin-Secret / Bearer INTERNAL_API_SECRET (server-to-server)
  //   2. Bearer <supabase_user_jwt> où l'email est dans super_admins (côté CRM client)
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
    // 1. Charger la candidature
    const apps = await sbFetch(
      `/rest/v1/coaching_applications?id=eq.${body.application_id}&select=id,email,nom_prenom,call_outcome&limit=1`
    );
    if (!Array.isArray(apps) || apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = apps[0];

    // 2. Marquer comme rejected_by_us
    await sbFetch(`/rest/v1/coaching_applications?id=eq.${app.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        call_outcome: 'rejected_by_us',
        call_completed_at: new Date().toISOString(),
      }),
    });

    // 3. Envoyer le mail rejet (best-effort)
    let emailSent = false;
    const transporter = buildTransporter();
    if (transporter && app.email) {
      try {
        const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [app.email],
          replyTo: SMTP_USER,
          subject: `Réponse sur ta candidature RB Perform`,
          html: buildRejectionEmail(firstName),
        });
        emailSent = true;
      } catch (e) {
        console.error(`[REJECT_EMAIL_FAIL] app=${app.id} email=${app.email} reason="${e.message}"`);
        await captureException(e, {
          tags: { endpoint: 'reject-coaching-application', stage: 'email' },
          extra: { application_id: app.id, reason: body.reason },
        });
      }
    }

    // 4. Log dedup (au cas où Rayan re-clique) — funnel_notification_logs
    // car notification_logs.client_id a une FK vers clients(id).
    try {
      await sbFetch('/rest/v1/funnel_notification_logs', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({
          ref_id: app.id,
          type: 'rejection_sent',
          sent_date: new Date().toISOString().split('T')[0],
        }),
      });
    } catch {} // best-effort

    return res.status(200).json({ ok: true, email_sent: emailSent });
  } catch (err) {
    console.error('[reject-coaching-application] unexpected:', err.message);
    await captureException(err, { tags: { endpoint: 'reject-coaching-application' } });
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
