// TEMP : diagnostic /api/waitlist — returns inline status of each step.
// À supprimer une fois le bug identifié. Auth via query secret pour éviter
// fuite d'info publique.

const { getServiceClient } = require('./_supabase');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const secret = req.query?.secret || '';
  if (secret !== 'rb-debug-2026-06-05') {
    return res.status(403).json({ error: 'forbidden' });
  }

  const out = {
    env: {
      SUPABASE_URL_set: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY_len: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
      ZOHO_SMTP_USER: process.env.ZOHO_SMTP_USER || null,
      ZOHO_SMTP_PASS_set: !!process.env.ZOHO_SMTP_PASS,
      ZOHO_SMTP_PASS_len: (process.env.ZOHO_SMTP_PASS || '').length,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    steps: [],
  };

  // 1. Test Supabase upsert
  try {
    const sb = getServiceClient();
    const { data, error } = await sb.from('waitlist').upsert({
      name: 'diag', email: `diag-${Date.now()}@example.com`,
      source: 'diag-endpoint', created_at: new Date().toISOString(),
    }, { onConflict: 'email' }).select();
    out.steps.push({ step: 'supabase_upsert', ok: !error, error: error?.message || null, rows: data?.length });
  } catch (e) {
    out.steps.push({ step: 'supabase_upsert', ok: false, error: e.message });
  }

  // 2. Test SMTP connect + send (to NOTIFY_EMAIL si query 'send=1')
  try {
    const trans = nodemailer.createTransport({
      host: 'smtp.zoho.eu', port: 465, secure: true,
      auth: {
        user: process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app',
        pass: process.env.ZOHO_SMTP_PASS,
      },
    });
    await trans.verify();
    out.steps.push({ step: 'smtp_verify', ok: true });
    if (req.query?.send === '1') {
      const info = await trans.sendMail({
        from: `RB Perform <${process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app'}>`,
        to: ['rb.performancee@gmail.com'],
        subject: 'DIAG /api/waitlist-debug test',
        text: 'Debug test envoyé ' + new Date().toISOString(),
      });
      out.steps.push({ step: 'smtp_sendMail', ok: true, messageId: info.messageId, response: info.response });
    }
  } catch (e) {
    out.steps.push({ step: 'smtp', ok: false, error: e.message });
  }

  return res.status(200).json(out);
};
