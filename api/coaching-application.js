/**
 * POST /api/coaching-application
 *
 * Recoit une candidature high-ticket depuis /candidature (form public).
 * - Insert/upsert dans coaching_applications (email = unique key)
 * - Email auto a Rayan via Zoho SMTP avec resume des reponses
 *
 * Body : tous les champs de OnboardingFlow + email + utm/source
 *
 * Securise : rate-limit 3 candidatures / heure / IP (anti-spam),
 * email obligatoire format RFC, validation zod.
 */

const { z } = require('zod');
const nodemailer = require('nodemailer');
const { getServiceClient } = require('./_supabase');
const { rateLimit, attachRequestId } = require('./_security');
const { captureException } = require('./_sentry');
const { RB_SUPPORT_EMAIL } = require('./_branding');

// Adresse perso pour les recaps candidature (independante du support general).
// Si tu veux changer, edite cette constante (et redeploy).
const APPLICATION_RECAP_EMAIL = 'rayan.b2701@gmail.com';

const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const G = '#02d1ba';

const applicationSchema = z.object({
  email: z.string().email().max(254),
  nom_prenom: z.string().max(120).optional().nullable(),
  telephone: z.string().max(40).optional().nullable(),
  age: z.coerce.number().int().min(13).max(120).optional().nullable(),
  poids: z.coerce.number().min(20).max(400).optional().nullable(),
  taille: z.coerce.number().int().min(80).max(260).optional().nullable(),
  passe_sportif: z.string().max(2000).optional().nullable(),
  metier: z.string().max(500).optional().nullable(),
  sommeil: z.string().max(500).optional().nullable(),
  pas_jour: z.string().max(500).optional().nullable(),
  allergies: z.string().max(500).optional().nullable(),
  repas: z.string().max(2000).optional().nullable(),
  jours_entrainement: z.string().max(500).optional().nullable(),
  heures_seance: z.string().max(500).optional().nullable(),
  diet_actuelle: z.string().max(2000).optional().nullable(),
  points_faibles: z.string().max(2000).optional().nullable(),
  objectifs_6semaines: z.string().max(2000).optional().nullable(),
  objectifs_3mois: z.string().max(2000).optional().nullable(),
  objectifs_6mois: z.string().max(2000).optional().nullable(),
  motivation_score: z.coerce.number().int().min(0).max(10).optional().nullable(),
  freins: z.string().max(2000).optional().nullable(),
  sacrifices: z.string().max(2000).optional().nullable(),
  vision_physique: z.string().max(2000).optional().nullable(),
  one_rm_bench: z.coerce.number().min(0).max(500).optional().nullable(),
  one_rm_squat: z.coerce.number().min(0).max(500).optional().nullable(),
  one_rm_traction: z.coerce.number().min(0).max(500).optional().nullable(),
  motivation_principale: z.string().max(2000).optional().nullable(),
  risques_abandon: z.string().max(2000).optional().nullable(),
  autres_infos: z.string().max(2000).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  utm_source: z.string().max(100).optional().nullable(),
  utm_medium: z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(100).optional().nullable(),
  utm_content: z.string().max(100).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  preferred_slots: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
  })).max(5).optional().nullable(),
}).passthrough();

function getTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu', port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function formatSlot(s) {
  // Format "lundi 5 mai · 14h"
  try {
    const d = new Date(s.date + 'T12:00:00');
    const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `${day} · ${s.time.replace(':00', 'h')}`;
  } catch { return `${s.date} ${s.time}`; }
}

function buildAdminEmail(app) {
  const score = app.motivation_score != null ? `${app.motivation_score}/10` : '?';
  const obj = (app.objectifs_3mois || app.objectifs_6semaines || '').slice(0, 80);
  const fmt = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:rgba(255,255,255,0.45);font-size:12px;width:160px;vertical-align:top">${k}</td><td style="padding:4px 0;color:#fff;font-size:13px">${String(v).replace(/</g, '&lt;')}</td></tr>` : '';

  const slotsHtml = Array.isArray(app.preferred_slots) && app.preferred_slots.length
    ? `<div style="margin-bottom:24px;padding:18px;background:rgba(2,209,186,0.08);border:1px solid rgba(2,209,186,0.3);border-radius:12px">
         <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:12px">Créneaux préférés du prospect</div>
         ${app.preferred_slots.map(s => `<div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:6px;text-transform:capitalize">→ ${formatSlot(s)}</div>`).join('')}
       </div>`
    : '';

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#111;border-radius:16px;border:1px solid rgba(2,209,186,0.2);padding:32px">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${G};margin-bottom:12px;font-weight:700">Nouvelle candidature high-ticket</div>
    <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px">${(app.nom_prenom || 'Anonyme').replace(/</g, '&lt;')}<span style="color:${G}">.</span></div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:24px">Score motivation : <strong style="color:${G}">${score}</strong> · Objectif : "${obj.replace(/</g, '&lt;')}"</div>

    ${slotsHtml}

    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px">
      ${fmt('Email', app.email)}
      ${fmt('Telephone', app.telephone)}
      ${fmt('Age', app.age)}
      ${fmt('Poids', app.poids ? `${app.poids} kg` : '')}
      ${fmt('Taille', app.taille ? `${app.taille} cm` : '')}
      ${fmt('Passe sportif', app.passe_sportif)}
      ${fmt('Metier', app.metier)}
      ${fmt('Sommeil', app.sommeil)}
      ${fmt('Allergies', app.allergies)}
      ${fmt('Jours d\'entrainement', app.jours_entrainement)}
      ${fmt('Heures par seance', app.heures_seance)}
      ${fmt('Diet actuelle', app.diet_actuelle)}
      ${fmt('Points faibles', app.points_faibles)}
      ${fmt('Objectifs 6 semaines', app.objectifs_6semaines)}
      ${fmt('Objectifs 3 mois', app.objectifs_3mois)}
      ${fmt('Objectifs 6 mois', app.objectifs_6mois)}
      ${fmt('Score motivation', score)}
      ${fmt('Freins', app.freins)}
      ${fmt('Sacrifices', app.sacrifices)}
      ${fmt('Vision physique', app.vision_physique)}
      ${fmt('1RM Bench', app.one_rm_bench)}
      ${fmt('1RM Squat', app.one_rm_squat)}
      ${fmt('1RM Traction', app.one_rm_traction)}
      ${fmt('Motivation principale', app.motivation_principale)}
      ${fmt('Risques d\'abandon', app.risques_abandon)}
      ${fmt('Autres infos', app.autres_infos)}
      ${fmt('Source', app.source || 'instagram')}
      ${fmt('UTM source', app.utm_source)}
      ${fmt('UTM campaign', app.utm_campaign)}
    </table>

    <div style="margin-top:24px;padding:14px 18px;background:rgba(2,209,186,0.06);border:1px solid rgba(2,209,186,0.18);border-radius:10px">
      <div style="font-size:11px;color:${G};font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Action rapide</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7)">
        ${app.telephone ? `WhatsApp : <a href="https://wa.me/${String(app.telephone).replace(/[^0-9]/g, '')}" style="color:${G}">${app.telephone}</a><br>` : ''}
        ${app.email ? `Email direct : <a href="mailto:${app.email}" style="color:${G}">${app.email}</a>` : ''}
      </div>
    </div>
  </td></tr>
  <tr><td style="padding:18px 0 0;text-align:center"><div style="font-size:11px;color:rgba(255,255,255,0.2)">RB Perform · /candidature high-ticket pipeline</div></td></tr>
</table>
</td></tr></table></body></html>`;
}

function buildClientEmail(app) {
  const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';
  const slots = Array.isArray(app.preferred_slots) ? app.preferred_slots : [];

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">Candidature reçue</div>

    <div style="font-size:28px;font-weight:900;color:#fff;line-height:1.15;letter-spacing:-1px;margin-bottom:14px">
      Bien reçu${firstName ? `, ${firstName.replace(/</g, '&lt;')}` : ''}.
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;margin-bottom:28px">
      Ta candidature pour l'accompagnement premium RB Perform est arrivée. Je lis chaque dossier personnellement.
    </div>

    ${slots.length ? `
    <div style="margin-bottom:28px;padding:20px;background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.2);border-radius:12px">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:10px">Tes 3 créneaux</div>
      ${slots.map(s => `<div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:6px;text-transform:capitalize">→ ${formatSlot(s)}</div>`).join('')}
    </div>
    ` : ''}

    <div style="margin-bottom:28px;padding:18px 20px;background:rgba(255,255,255,0.025);border-left:3px solid ${G};border-radius:6px">
      <div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.7;font-weight:600">
        Prochaine étape : je te recontacte sous 24h pour caler le créneau définitif parmi tes dispos.
      </div>
    </div>

    <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:8px">
      Si ton profil match l'offre (5 places, sélection sur dossier), on enchaîne avec ton appel stratégique de 30 minutes.
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7">
      Aucun paiement avant validation de ma part.
    </div>

  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:.5px">
      RB Perform · Rayan Bonte<br>
      <span style="color:rgba(255,255,255,0.18)">Cet email confirme la réception de ta candidature.</span>
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://rbperform.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  attachRequestId(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Anti-spam : 3 candidatures / heure / IP
  const rl = rateLimit(req, { max: 3, windowMs: 3600000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Trop de tentatives. Reessaie plus tard.' });

  try {
    const parsed = applicationSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Donnees invalides',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const data = parsed.data;
    data.email = data.email.toLowerCase().trim();

    // Insert or update (UPSERT sur email)
    let dbOk = false;
    try {
      const supabase = getServiceClient();
      const { error: dbErr } = await supabase
        .from('coaching_applications')
        .upsert(data, { onConflict: 'email' });
      if (dbErr) throw dbErr;
      dbOk = true;
    } catch (dbEx) {
      console.error(`[COACHING_APP_LOST] db_write_failed email=${data.email} reason="${dbEx.message}"`);
      await captureException(dbEx, {
        tags: { endpoint: 'coaching-application', stage: 'db' },
        extra: { email: data.email },
      });
    }

    // Email a Rayan + email de confirmation au client
    const transporter = getTransporter();
    if (transporter) {
      try {
        const score = data.motivation_score != null ? `${data.motivation_score}/10` : '?';
        const obj = (data.objectifs_3mois || data.objectifs_6semaines || '').slice(0, 50);
        await transporter.sendMail({
          from: `RB Perform Candidatures <${SMTP_USER}>`,
          to: [APPLICATION_RECAP_EMAIL],
          replyTo: data.email,  // Reply direct au candidat
          subject: `Candidature high-ticket : ${(data.nom_prenom || 'Anonyme')} (${score})${obj ? ' — ' + obj : ''}`,
          html: buildAdminEmail(data),
        });
      } catch (e) {
        console.error(`[COACHING_APP_EMAIL_FAILED] email=${data.email} reason="${e.message}" db_ok=${dbOk}`);
        await captureException(e, {
          tags: { endpoint: 'coaching-application', stage: 'email_admin' },
          extra: { email: data.email, db_ok: dbOk },
        });
      }
      // Confirmation client (best-effort, on-demand)
      try {
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [data.email],
          replyTo: SMTP_USER,
          subject: `Ta candidature est arrivée${data.nom_prenom ? `, ${String(data.nom_prenom).split(/\s+/)[0]}` : ''}.`,
          html: buildClientEmail(data),
        });
      } catch (e) {
        console.error(`[COACHING_APP_CLIENT_EMAIL_FAILED] email=${data.email} reason="${e.message}"`);
        await captureException(e, {
          tags: { endpoint: 'coaching-application', stage: 'email_client' },
          extra: { email: data.email },
        });
      }
    }

    return res.status(200).json({ ok: true, db: dbOk });
  } catch (err) {
    console.error('[coaching-application] unexpected:', err.message);
    await captureException(err, { tags: { endpoint: 'coaching-application', stage: 'unexpected' } });
    return res.status(500).json({ error: 'Internal error' });
  }
};
