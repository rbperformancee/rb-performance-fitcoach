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
}).passthrough();

function getTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu', port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function buildAdminEmail(app) {
  const score = app.motivation_score != null ? `${app.motivation_score}/10` : '?';
  const obj = (app.objectifs_3mois || app.objectifs_6semaines || '').slice(0, 80);
  const fmt = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:rgba(255,255,255,0.45);font-size:12px;width:160px;vertical-align:top">${k}</td><td style="padding:4px 0;color:#fff;font-size:13px">${String(v).replace(/</g, '&lt;')}</td></tr>` : '';

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#111;border-radius:16px;border:1px solid rgba(2,209,186,0.2);padding:32px">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${G};margin-bottom:12px;font-weight:700">Nouvelle candidature high-ticket</div>
    <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px">${(app.nom_prenom || 'Anonyme').replace(/</g, '&lt;')}<span style="color:${G}">.</span></div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:24px">Score motivation : <strong style="color:${G}">${score}</strong> · Objectif : "${obj.replace(/</g, '&lt;')}"</div>

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

    // Email a Rayan
    const transporter = getTransporter();
    if (transporter) {
      try {
        const score = data.motivation_score != null ? `${data.motivation_score}/10` : '?';
        const obj = (data.objectifs_3mois || data.objectifs_6semaines || '').slice(0, 50);
        await transporter.sendMail({
          from: `RB Perform Candidatures <${SMTP_USER}>`,
          to: [RB_SUPPORT_EMAIL],
          replyTo: data.email,  // Reply direct au candidat
          subject: `Candidature high-ticket : ${(data.nom_prenom || 'Anonyme')} (${score})${obj ? ' — ' + obj : ''}`,
          html: buildAdminEmail(data),
        });
      } catch (e) {
        console.error(`[COACHING_APP_EMAIL_FAILED] email=${data.email} reason="${e.message}" db_ok=${dbOk}`);
        await captureException(e, {
          tags: { endpoint: 'coaching-application', stage: 'email' },
          extra: { email: data.email, db_ok: dbOk },
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
