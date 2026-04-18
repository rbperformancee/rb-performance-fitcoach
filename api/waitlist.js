/**
 * POST /api/waitlist
 *
 * Stocke un prospect de la waitlist dans Supabase.
 * Table: waitlist (name, email, clients, problem, source, created_at)
 *
 * Body: { name, email, clients, problem, source }
 */

const { createClient } = require('@supabase/supabase-js');
const { rateLimit, getIP } = require('./_security');

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://rbperform.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 5 submissions per hour per IP
  const rl = rateLimit(req, { max: 5, windowMs: 3600000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Trop de tentatives. Reessaie plus tard.' });

  try {
    const { name, email, clients, problem, source } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('waitlist').upsert({
        name: (name || '').trim(),
        email: email.toLowerCase().trim(),
        clients: clients || null,
        problem: problem || null,
        source: source || 'waitlist',
        created_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    } else {
      console.log('[waitlist]', JSON.stringify({ name, email, clients, problem }));
    }

    // Email de confirmation waitlist (si Resend configuré)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const firstName = (name || '').trim().split(' ')[0] || 'Coach';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'RB Perform <noreply@rbperform.app>',
            to: [email.toLowerCase().trim()],
            subject: 'Tu es sur la liste — RB Perform',
            html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px"><tr><td align="center"><table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%"><tr><td style="text-align:center;padding-bottom:24px"><span style="font-size:14px;font-weight:900;letter-spacing:3px;color:rgba(255,255,255,0.2)">RB<span style="color:rgba(2,209,186,0.4)">PERFORM</span></span></td></tr><tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px"><div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px">Salut ${firstName},</div><div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:16px;line-height:1.3">Tu es sur la liste<span style="color:#02d1ba">.</span></div><div style="font-size:14px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:24px">RB Perform lance en mai 2026. Tu fais partie des premiers coachs a avoir reserve ta place. On te previent des que c est pret.</div><div style="font-size:14px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:24px">En attendant, tu peux deja tester la demo :</div><div style="text-align:center;margin-bottom:24px"><a href="https://rbperform.app/demo" style="display:inline-block;background:#02d1ba;color:#000;font-size:13px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:100px;letter-spacing:.06em;text-transform:uppercase">Tester la demo coach</a></div><div style="font-size:12px;color:rgba(255,255,255,0.25);text-align:center">50 places Founding Coach a 199EUR/mois verrouille a vie.</div></td></tr><tr><td style="padding:24px 0 0;text-align:center"><div style="font-size:11px;color:rgba(255,255,255,0.15)">RB Perform — rb.performancee@gmail.com</div></td></tr></table></td></tr></table></body></html>`,
          }),
        });
      } catch (e) {
        console.error('[waitlist] email error:', e.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[waitlist] Error:', err.message);
    return res.status(200).json({ ok: true });
  }
};
