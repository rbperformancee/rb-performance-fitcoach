/**
 * POST /api/notify-founding
 *
 * Stocke l'email d'un prospect intéressé par le Founding Coach Program.
 * Sauvegarde dans Supabase table `founding_waitlist`.
 *
 * Body: { email: string }
 */

const { createClient } = require('@supabase/supabase-js');
const { rateLimit } = require('./_security');
const { captureException } = require('./_sentry');

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://rbperform.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { max: 5, windowMs: 3600000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Too many requests' });

  try {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

    const cleanEmail = email.toLowerCase().trim();

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error: dbErr } = await supabase.from('founding_waitlist').upsert(
          { email: cleanEmail, created_at: new Date().toISOString() },
          { onConflict: 'email' }
        );
        if (dbErr) throw dbErr;
      } catch (dbEx) {
        console.error(`[FOUNDING_WAITLIST_LOST] db_write_failed email=${cleanEmail} reason="${dbEx.message}"`);
        await captureException(dbEx, {
          tags: { endpoint: 'notify-founding', stage: 'db' },
          extra: { email: cleanEmail },
        });
      }
    } else {
      console.error(`[FOUNDING_WAITLIST_LOST] supabase_env_missing email=${cleanEmail}`);
      await captureException(new Error('Supabase env vars missing on /api/notify-founding'), {
        tags: { endpoint: 'notify-founding', stage: 'env' },
        extra: { email: cleanEmail },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[FOUNDING_WAITLIST_UNCAUGHT] reason="${err.message}"`);
    await captureException(err, { tags: { endpoint: 'notify-founding', stage: 'uncaught' } });
    // Always return success to user (email captured or not, UX stays clean)
    return res.status(200).json({ ok: true });
  }
};
