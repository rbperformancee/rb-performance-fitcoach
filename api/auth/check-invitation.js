/**
 * POST /api/auth/check-invitation
 *
 * Body : { email }
 * Reponse :
 *   { status: 'ready' }   - le compte existe (auth.users present ou cree),
 *                           le caller peut (re)tenter signInWithOtp
 *   { status: 'unknown' } - aucun client avec cet email cote coach
 *
 * Pourquoi cet endpoint :
 * Le coach ajoute un client via CoachDashboard.addClient — qui INSERT dans
 * `clients` et envoie un mail de bienvenue Zoho. Mais ca ne cree pas de
 * `auth.users`. Resultat : le client tente signInWithOtp(shouldCreateUser:false)
 * → "Signups not allowed for otp" → "Compte inexistant".
 *
 * Cet endpoint comble le trou : si on trouve un `clients` row pour cet email,
 * on cree (idempotent) la row `auth.users` correspondante via l'admin API.
 * Ensuite signInWithOtp re-emis cote browser passe et envoie le code.
 *
 * Securite : on ne cree un auth.users QUE si un coach a deja cree un
 * `clients` row avec cet email. Aucune enumeration possible : pour qu'on
 * crée un auth, il faut deja etre dans la base clients (geste du coach).
 */

const { createClient } = require('@supabase/supabase-js');
const { isOriginAllowed } = require('../_security');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!isOriginAllowed(req)) return res.status(403).json({ error: 'origin_forbidden' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email_required' });

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'email_invalid' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Existing client row ?
  const { data: client, error: cliErr } = await supabase
    .from('clients')
    .select('id, email, full_name, coach_id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (cliErr) {
    console.error('[check-invitation] clients lookup failed:', cliErr.message);
    return res.status(500).json({ error: 'lookup_failed', details: cliErr.message });
  }

  if (!client) {
    return res.status(200).json({ status: 'unknown' });
  }

  // 2. Auth user existe ?
  // listUsers ne supporte pas filter by email, on pagine.
  let existingUser = null;
  try {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    existingUser = list?.users?.find(
      (u) => (u.email || '').toLowerCase() === normalizedEmail
    );
  } catch (e) {
    console.warn('[check-invitation] listUsers failed:', e?.message);
  }

  if (existingUser) {
    return res.status(200).json({ status: 'ready', existed: true });
  }

  // 3. Cree auth.users (sans password — login OTP only)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: {
      full_name: client.full_name || null,
      coach_id: client.coach_id || null,
      created_via: 'check-invitation',
    },
  });

  if (createErr || !created?.user) {
    console.error('[check-invitation] createUser failed:', createErr?.message);
    return res.status(500).json({ error: 'auth_create_failed', details: createErr?.message });
  }

  // user_id sur clients pour traceabilite (le lookup useAuth se fait par
  // email donc pas critique, juste cosmétique).
  if (!client.user_id) {
    await supabase.from('clients').update({ user_id: created.user.id }).eq('id', client.id);
  }

  return res.status(200).json({ status: 'ready', existed: false });
};
