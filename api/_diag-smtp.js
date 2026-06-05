/**
 * GET/POST /api/_diag-smtp?secret=XXX
 *
 * Diagnostic Zoho SMTP : vérifie si les credentials sont réellement
 * présentes au runtime (vs vides), et tente un sendMail test vers
 * RB_SUPPORT_EMAIL. Retourne un JSON détaillé pour débugger sans deviner.
 *
 * À supprimer après diagnostic (endpoint sensible).
 *
 * Auth : query param `secret` qui doit matcher CRON_SECRET (déjà en env Vercel).
 */

const nodemailer = require('nodemailer');
const { RB_SUPPORT_EMAIL } = require('./_branding');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const secret = (req.query?.secret || '').toString();
  const expected = process.env.CRON_SECRET || '';
  if (!expected || secret !== expected) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const SMTP_USER_RAW = process.env.ZOHO_SMTP_USER;
  const SMTP_PASS_RAW = process.env.ZOHO_SMTP_PASS;

  const report = {
    env: {
      ZOHO_SMTP_USER_present: Boolean(SMTP_USER_RAW),
      ZOHO_SMTP_USER_length: SMTP_USER_RAW ? SMTP_USER_RAW.length : 0,
      ZOHO_SMTP_USER_value_safe: SMTP_USER_RAW ? SMTP_USER_RAW.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
      ZOHO_SMTP_PASS_present: Boolean(SMTP_PASS_RAW),
      ZOHO_SMTP_PASS_length: SMTP_PASS_RAW ? SMTP_PASS_RAW.length : 0,
      MISTRAL_API_KEY_present: Boolean(process.env.MISTRAL_API_KEY),
      MISTRAL_API_KEY_length: (process.env.MISTRAL_API_KEY || '').length,
    },
    smtp_test: null,
  };

  if (!SMTP_USER_RAW || !SMTP_PASS_RAW) {
    report.smtp_test = { skipped: true, reason: 'creds missing or empty' };
    return res.status(200).json(report);
  }

  const SMTP_USER = SMTP_USER_RAW || 'rayan@rbperform.app';

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS_RAW },
    });

    // verify() = handshake + auth check, sans envoyer d'email
    await transporter.verify();
    report.smtp_test = { verify: 'ok' };

    // sendMail test
    const info = await transporter.sendMail({
      from: `RB Perform Diag <${SMTP_USER}>`,
      to: [RB_SUPPORT_EMAIL],
      subject: 'DIAG SMTP — ' + new Date().toISOString(),
      text: 'Diagnostic Zoho SMTP réussi. Tu peux supprimer cet email.',
    });
    report.smtp_test.sendMail = {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  } catch (e) {
    report.smtp_test = {
      error: e.message,
      code: e.code,
      command: e.command,
      response: e.response,
      responseCode: e.responseCode,
    };
  }

  return res.status(200).json(report);
};
