/**
 * Cron daily : refresh la matérialisée vue lead_intent_scores.
 * Schedule : tous les jours à 8h UTC (vercel.json)
 *
 * Idempotent. Si la vue n'existe pas encore (migration 122 pas appliquée),
 * répond 200 sans crash.
 */

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || '') === `Bearer ${cronSecret}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  try {
    // Pas d'API REST pour REFRESH MATERIALIZED VIEW, on utilise pg-bouncer via RPC.
    // Astuce : on crée une fonction Postgres dédiée et on l'appelle via RPC.
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/refresh_lead_intent_scores`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[refresh-lead-intent] HTTP ${resp.status}: ${text.slice(0, 300)}`);
      return res.status(200).json({ ok: false, status: resp.status, body: text.slice(0, 300) });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[refresh-lead-intent] exception:', err.message);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
