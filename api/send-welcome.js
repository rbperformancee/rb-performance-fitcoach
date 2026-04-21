/**
 * POST /api/send-welcome
 * Envoie un email de bienvenue au client via Zoho SMTP.
 * Remplace la Edge Function Supabase send-welcome.
 */

const nodemailer = require('nodemailer');

const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const APP_URL = 'https://rbperform.app';
const G = '#02d1ba';

function buildWelcomeHtml(name, type, extra) {
  const greeting = name ? `Salut ${name},` : 'Bienvenue,';

  if (type === 'programme_ready') {
    const progName = extra?.programme_name || 'ton nouveau programme';
    return wrap(`
      <div style="font-size:11px;font-weight:700;color:${G};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Programme Pret</div>
      <div style="font-size:22px;font-weight:900;color:#f0f0f0;margin-bottom:6px">${greeting} ${progName} t'attend.</div>
      <p style="font-size:14px;color:rgba(255,255,255,0.45);line-height:1.7;margin:0 0 24px">
        Ton coach vient de publier ton programme. Connecte-toi pour le decouvrir et commencer.
      </p>
      ${cta('Voir mon programme')}
    `);
  }

  // Default: welcome
  return wrap(`
    <div style="font-size:11px;font-weight:700;color:${G};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Bienvenue</div>
    <div style="font-size:22px;font-weight:900;color:#f0f0f0;margin-bottom:6px">${greeting}</div>
    <p style="font-size:14px;color:rgba(255,255,255,0.45);line-height:1.7;margin:0 0 24px">
      Ton espace coaching est pret. Connecte-toi pour acceder a tes seances, suivre tes charges et visualiser ta progression.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="padding:8px 0"><div style="font-size:13px;font-weight:700;color:#f0f0f0;margin-bottom:2px">Programme personnalise</div><div style="font-size:12px;color:#6b7280">Seances, exercices, sets, reps, tempo, RIR</div></td></tr>
      <tr><td style="padding:8px 0"><div style="font-size:13px;font-weight:700;color:#f0f0f0;margin-bottom:2px">Suivi nutrition</div><div style="font-size:12px;color:#6b7280">Scanne tes produits, logue tes repas, suis tes macros</div></td></tr>
      <tr><td style="padding:8px 0"><div style="font-size:13px;font-weight:700;color:#f0f0f0;margin-bottom:2px">Progression en temps reel</div><div style="font-size:12px;color:#6b7280">Tes charges evoluent, tu le vois seance apres seance</div></td></tr>
    </table>
    ${cta('Acceder a mon espace')}
    ${infoBox('Comment se connecter',
      '<strong style="color:#f0f0f0">1.</strong> Ouvre ' + APP_URL + '/login<br>' +
      '<strong style="color:#f0f0f0">2.</strong> Entre ton adresse email<br>' +
      '<strong style="color:#f0f0f0">3.</strong> Recois un code a 6 chiffres<br>' +
      '<strong style="color:#f0f0f0">4.</strong> Entre le code — tu es connecte'
    )}
    ${infoBox('Installer sur iPhone',
      '<strong style="color:#f0f0f0">1.</strong> Ouvre Safari sur ' + APP_URL + '/login<br>' +
      '<strong style="color:#f0f0f0">2.</strong> Appuie sur Partager en bas<br>' +
      '<strong style="color:#f0f0f0">3.</strong> Selectionne "Sur l\'ecran d\'accueil"'
    )}
    ${infoBox('Installer sur Android',
      '<strong style="color:#f0f0f0">1.</strong> Ouvre Chrome sur ' + APP_URL + '/login<br>' +
      '<strong style="color:#f0f0f0">2.</strong> Appuie sur les 3 points en haut<br>' +
      '<strong style="color:#f0f0f0">3.</strong> Selectionne "Ajouter a l\'ecran d\'accueil"'
    )}
  `);
}

function wrap(inner) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
  <tr><td align="center" style="padding-bottom:24px">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.5);margin-bottom:6px">Coaching Premium</div>
    <div style="font-size:24px;font-weight:900;color:#f0f0f0;letter-spacing:-1px">RB<span style="color:${G}">.</span>Perform</div>
  </td></tr>
  <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:32px">${inner}</td></tr>
  <tr><td style="padding:24px 0 0;text-align:center"><div style="font-size:11px;color:rgba(255,255,255,0.2)">RB Perform — rayan@rbperform.app</div></td></tr>
</table>
</td></tr></table></body></html>`;
}

function cta(label) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td align="center">
    <a href="${APP_URL}/login" style="display:inline-block;background:${G};color:#000;font-size:14px;font-weight:800;text-decoration:none;padding:15px 36px;border-radius:12px;letter-spacing:0.3px">${label}</a>
  </td></tr></table>`;
}

function infoBox(title, content) {
  return `<tr><td style="padding:16px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.15);border-radius:14px;padding:20px 24px">
    <tr><td>
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${G};opacity:0.7;margin-bottom:10px;font-weight:700">${title}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.45);line-height:2">${content}</div>
    </td></tr></table>
  </td></tr>`;
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || APP_URL);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SMTP_PASS) return res.status(500).json({ error: 'ZOHO_SMTP_PASS missing' });

  try {
    const { email, full_name, type, programme_name } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const name = (full_name || '').split(' ')[0] || '';
    const subject = type === 'programme_ready'
      ? `${name ? name + ', ton' : 'Ton'} programme est pret`
      : `${name ? name + ', ton' : 'Ton'} espace RB Perform est pret`;

    const html = buildWelcomeHtml(name, type, { programme_name });

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `RB Perform <${SMTP_USER}>`,
      to: [email],
      subject,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[send-welcome] error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
