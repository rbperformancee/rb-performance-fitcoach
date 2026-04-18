/**
 * POST /api/waitlist
 *
 * Stocke un prospect de la waitlist dans Supabase.
 * Table: waitlist (name, email, clients, problem, source, created_at)
 *
 * Body: { name, email, clients, problem, source }
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[waitlist] Error:', err.message);
    return res.status(200).json({ ok: true });
  }
};
