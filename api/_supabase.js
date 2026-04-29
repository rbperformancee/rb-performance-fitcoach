/**
 * Supabase client factory partage entre les endpoints API.
 *
 * Avant : 8 endpoints ré-instanciaient leur propre client avec env vars
 * inconsistantes (SUPABASE_SERVICE_KEY vs SUPABASE_SERVICE_ROLE_KEY,
 * fallbacks differents). Source de bugs en deploiement (env var manquant
 * sur un endpoint mais pas sur les autres).
 *
 * Maintenant : un seul point d'entree. Memoization du client lazy
 * (cree au premier appel, reutilise sur les invocations chaudes Vercel).
 *
 * Env vars utilisees :
 *   SUPABASE_URL (ou REACT_APP_SUPABASE_URL en fallback)
 *   SUPABASE_SERVICE_ROLE_KEY (admin, requis pour la majorite des endpoints)
 *   SUPABASE_ANON_KEY (ou REACT_APP_SUPABASE_ANON_KEY) — pour signInWithOtp
 */

const { createClient } = require('@supabase/supabase-js');

let _serviceClient = null;
let _anonClient = null;

function getUrl() {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL not configured');
  return url;
}

/**
 * Service-role client (bypass RLS). Pour les operations admin :
 * inserts dans tables coachs, gestion auth, lectures cross-tenant, etc.
 */
function getServiceClient(extraOptions = {}) {
  if (_serviceClient && !extraOptions.fresh) return _serviceClient;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  const client = createClient(getUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...extraOptions,
  });
  if (!extraOptions.fresh) _serviceClient = client;
  return client;
}

/**
 * Anon client. Utilise pour les flows public (signInWithOtp, magic link).
 * RLS s'applique. Ne pas utiliser pour des inserts admin.
 */
function getAnonClient(extraOptions = {}) {
  if (_anonClient && !extraOptions.fresh) return _anonClient;
  const key = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!key) throw new Error('SUPABASE_ANON_KEY not configured');
  const client = createClient(getUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...extraOptions,
  });
  if (!extraOptions.fresh) _anonClient = client;
  return client;
}

module.exports = { getServiceClient, getAnonClient };
