/**
 * POST /api/waitlist
 * Stocke un prospect + envoie email confirmation + notifie Rayan
 */

const { getServiceClient } = require('./_supabase');
const nodemailer = require('nodemailer');
const { z } = require('zod');
const { rateLimit, attachRequestId } = require('./_security');
const { captureException } = require('./_sentry');
const { RB_SUPPORT_EMAIL } = require('./_branding');

// Schema validation inputs waitlist (zod, defense en profondeur).
// email = RFC-compliant + max 254 chars (RFC 3696). Reste = strings
// optionnelles avec caps anti-overflow. Frontend cap deja a 100/200 pour UTM,
// on double-check cote backend. .passthrough() : tolere des champs en plus
// sans crasher (resilience aux changements frontend).
const waitlistSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  email: z.string().email().max(254),
  clients: z.string().max(50).optional().nullable(),
  problem: z.string().max(500).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  utm_source: z.string().max(100).optional().nullable(),
  utm_medium: z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(100).optional().nullable(),
  utm_content: z.string().max(100).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
}).passthrough();

const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const NOTIFY_EMAIL = RB_SUPPORT_EMAIL;
const G = '#02d1ba';

function getTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu', port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
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

  const rl = rateLimit(req, { max: 5, windowMs: 3600000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Trop de tentatives.' });

  try {
    const parsed = waitlistSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    const { name, email, clients, problem, source,
            utm_source, utm_medium, utm_campaign, utm_content, referrer } = parsed.data;

    const cleanEmail = email.toLowerCase().trim();
    const firstName = (name || '').trim().split(' ')[0] || 'Coach';
    // Truncate UTM strings (defense en profondeur, frontend cap deja a 100/200)
    const trunc = (s, n) => (s == null ? null : String(s).slice(0, n));

    // Save to Supabase
    let dbOk = false;
    try {
      const supabase = getServiceClient();
      const { error: dbErr } = await supabase.from('waitlist').upsert({
        name: (name || '').trim(), email: cleanEmail,
        clients: clients || null, problem: problem || null,
        source: source || 'waitlist',
        utm_source: trunc(utm_source, 100),
        utm_medium: trunc(utm_medium, 100),
        utm_campaign: trunc(utm_campaign, 100),
        utm_content: trunc(utm_content, 100),
        referrer: trunc(referrer, 200),
        created_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      if (dbErr) throw dbErr;
      dbOk = true;
    } catch (dbEx) {
      console.error(`[WAITLIST_LOST] db_write_failed email=${cleanEmail} reason="${dbEx.message}"`);
      await captureException(dbEx, { tags: { endpoint: 'waitlist', stage: 'db' }, extra: { email: cleanEmail, source: source || 'waitlist' } });
    }

    // Send emails via Zoho SMTP
    const transporter = getTransporter();
    if (transporter) {
      // 1. Email confirmation au prospect
      try {
        await transporter.sendMail({
          from: `RB Perform <${SMTP_USER}>`,
          to: [cleanEmail],
          subject: `${firstName}, tu es sur la liste`,
          html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px"><tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%">
  <tr><td align="center" style="padding-bottom:24px">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.5);margin-bottom:6px">Coaching Premium</div>
    <div style="font-size:24px;font-weight:900;color:#f0f0f0;letter-spacing:-1px">RB<span style="color:${G}">.</span>Perform</div>
  </td></tr>
  <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px">Salut ${firstName},</div>
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:16px;line-height:1.3">Tu es sur la liste<span style="color:${G}">.</span></div>
    <div style="font-size:14px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:24px">RB Perform lance en mai 2026. Tu fais partie des premiers coachs a avoir reserve ta place. On te previent des que c'est pret.</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:24px">En attendant, tu peux deja tester la demo :</div>
    <div style="text-align:center;margin-bottom:24px">
      <a href="https://rbperform.app/demo" style="display:inline-block;background:${G};color:#000;font-size:13px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:100px;letter-spacing:.06em;text-transform:uppercase">Tester la demo coach</a>
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.25);text-align:center">30 places Founding Coach a 199EUR/mois verrouille a vie.</div>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center"><div style="font-size:11px;color:rgba(255,255,255,0.15)">RB Perform — rayan@rbperform.app</div></td></tr>
</table></td></tr></table></body></html>`,
        });
      } catch (e) {
        console.error(`[WAITLIST_EMAIL_FAILED] prospect email=${cleanEmail} reason="${e.message}" db_ok=${dbOk}`);
        await captureException(e, { tags: { endpoint: 'waitlist', stage: 'email_prospect' }, extra: { email: cleanEmail, db_ok: dbOk } });
      }

      // 2. Notification a Rayan
      try {
        await transporter.sendMail({
          from: `RB Perform <${SMTP_USER}>`,
          to: [NOTIFY_EMAIL],
          subject: `Nouveau inscrit waitlist : ${(name || '').trim() || cleanEmail}`,
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
  <tr><td style="background:#111;border-radius:16px;border:1px solid rgba(2,209,186,0.2);padding:28px">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${G};margin-bottom:12px;font-weight:700">Nouvelle inscription waitlist</div>
    <div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:16px">${(name || '').trim() || 'Anonyme'}<span style="color:${G}">.</span></div>
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:rgba(255,255,255,0.6);line-height:2.2">
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px">Email</td><td style="color:#fff;font-weight:600">${cleanEmail}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px">Clients</td><td>${clients || '—'}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px">Probleme</td><td>${problem || '—'}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px">Source</td><td>${source || 'waitlist'}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px">UTM</td><td style="font-family:'JetBrains Mono',monospace;font-size:11px">${[utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || '—'}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.3);padding-right:12px">Referrer</td><td style="font-family:'JetBrains Mono',monospace;font-size:11px">${referrer || '—'}</td></tr>
    </table>
  </td></tr>
</table></td></tr></table></body></html>`,
        });
      } catch (e) {
        console.error(`[WAITLIST_NOTIFY_FAILED] ops email=${cleanEmail} reason="${e.message}"`);
        await captureException(e, { tags: { endpoint: 'waitlist', stage: 'notify_ops' }, extra: { email: cleanEmail } });
      }
    } else {
      console.error(`[WAITLIST_NO_TRANSPORT] email=${cleanEmail} — ZOHO_SMTP_PASS missing, prospect not notified by email`);
      await captureException(new Error('ZOHO_SMTP_PASS missing on /api/waitlist'), { tags: { endpoint: 'waitlist', stage: 'env' }, extra: { email: cleanEmail, db_ok: dbOk } });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[WAITLIST_UNCAUGHT] reason="${err.message}"`);
    await captureException(err, { tags: { endpoint: 'waitlist', stage: 'uncaught' } });
    return res.status(200).json({ ok: true });
  }
};
