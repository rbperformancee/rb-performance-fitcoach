/**
 * POST /api/auth/redeem-invitation
 *
 * Body : { token, password, prenom }
 *
 * Flow atomique cote serveur (service-role) :
 *   1. Valide le token (status=pending, not expired)
 *   2. Cree auth.users via admin API (email_confirm=true → pas de mail conf)
 *   3. Insert clients (id = auth user id) + lie au coach
 *   4. Optionnel : clone le programme assigne
 *   5. Marque invitation = accepted
 *
 * Reponse : { ok, email } → le client appelle signInWithPassword pour avoir
 * sa session normalement.
 *
 * Pourquoi serveur :
 *   - signUp() cote browser ne renvoie pas toujours une session immediate
 *     (quand Supabase a "Confirm email" ON), l'INSERT clients echoue RLS.
 *   - admin.createUser({ email_confirm: true }) cree directement un user
 *     pre-confirme + service-role insert dans clients sans probleme RLS.
 *   - Idempotent : si auth.users existe deja avec cet email, on reuse.
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

  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: 'origin_forbidden' });
  }

  const { token, password, prenom } = req.body || {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token_required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'password_too_short' });
  if (!prenom || !prenom.trim()) return res.status(400).json({ error: 'prenom_required' });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Charger l'invitation
  const { data: inv, error: invErr } = await supabase
    .from('invitations')
    .select('id, email, prenom, programme_id, expires_at, status, coach_id')
    .eq('token', token)
    .maybeSingle();

  if (invErr || !inv) {
    return res.status(404).json({ error: 'invitation_not_found' });
  }
  if (inv.status !== 'pending') {
    return res.status(409).json({ error: 'invitation_already_used' });
  }
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return res.status(410).json({ error: 'invitation_expired' });
  }

  const email = inv.email.toLowerCase().trim();

  // 2. Cree (ou reuse) auth.users
  let userId = null;

  // Verifier d'abord si l'email a deja un user (cas re-redeem partiel)
  // listUsers ne supporte pas filter par email, on pagine.
  // Pour ce cas (volume faible) on accepte le cout.
  try {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => (u.email || '').toLowerCase() === email);
    if (existing) {
      userId = existing.id;
      // Reset password to the new one provided (idempotent re-redeem)
      try {
        await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } catch (e) { /* ignore, on continue */ }
    }
  } catch (e) {
    console.warn('[redeem-invitation] listUsers failed:', e?.message);
  }

  if (!userId) {
    const { data: createRes, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: prenom.trim(),
        invited_by_coach: inv.coach_id,
      },
    });
    if (createErr || !createRes?.user) {
      console.error('[redeem-invitation] createUser failed:', createErr?.message);
      return res.status(500).json({ error: 'auth_user_create_failed', details: createErr?.message });
    }
    userId = createRes.user.id;
  }

  // 3. Insert (ou update) clients
  const clientPayload = {
    id: userId,
    user_id: userId,
    coach_id: inv.coach_id,
    email,
    full_name: prenom.trim(),
    status: 'active',
    subscription_start_date: new Date().toISOString(),
  };

  // Try insert ; si duplicate, on fait un update pour s'assurer que coach_id est bon
  const { error: insErr } = await supabase.from('clients').insert(clientPayload);
  if (insErr) {
    if (insErr.code === '23505') {
      // duplicate id — on update les champs cles
      await supabase
        .from('clients')
        .update({
          coach_id: inv.coach_id,
          full_name: prenom.trim(),
          status: 'active',
        })
        .eq('id', userId);
    } else {
      console.error('[redeem-invitation] clients insert failed:', insErr.message);
      return res.status(500).json({ error: 'client_create_failed', details: insErr.message });
    }
  }

  // 4. Clone programme si fourni
  if (inv.programme_id) {
    try {
      const { data: srcProg } = await supabase
        .from('programmes')
        .select('html_content, programme_name')
        .eq('id', inv.programme_id)
        .maybeSingle();
      if (srcProg) {
        await supabase.from('programmes').insert({
          client_id: userId,
          html_content: srcProg.html_content,
          programme_name: srcProg.programme_name,
          is_active: true,
          uploaded_by: 'invitation',
        });
      }
    } catch (e) {
      console.warn('[redeem-invitation] programme clone failed:', e?.message);
      // Non-bloquant : le coach peut reassigner manuellement
    }
  }

  // 5. Mark invitation accepted
  await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', inv.id);

  // 6. Reponse OK ; le client va appeler signInWithPassword pour avoir une session
  return res.status(200).json({ ok: true, email });
};
