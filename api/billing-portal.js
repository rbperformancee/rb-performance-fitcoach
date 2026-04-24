/**
 * POST /api/billing-portal
 *
 * Crée une session Stripe Customer Portal pour un coach authentifié.
 * Le coach peut y gérer son abonnement : annulation, changement de CB,
 * téléchargement des factures.
 *
 * Headers: Authorization: Bearer <supabase-jwt>
 *
 * Env vars requises :
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL (ou REACT_APP_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { secureRequest } = require('./_security');

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://rbperform.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });
  if (!secureRequest(req, res, { max: 20, windowMs: 3600000 })) return;

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Supabase env vars not configured' });
    }

    // 1. Extract JWT from Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Verify JWT and resolve user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // 3. Fetch stripe_customer_id from coaches table
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (coachError) {
      console.error('[billing-portal] DB error:', coachError.message);
      return res.status(500).json({ error: 'Erreur base de données' });
    }

    if (!coach || !coach.stripe_customer_id) {
      return res.status(404).json({ error: 'Aucun abonnement actif' });
    }

    // 4. Create Customer Portal session
    const baseUrl = origin || 'https://rbperform.app';
    const session = await stripe.billingPortal.sessions.create({
      customer: coach.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/mon-compte?tab=abonnement`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[billing-portal] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
