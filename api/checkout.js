/**
 * POST /api/checkout
 *
 * Crée une Stripe Checkout Session pour les plans standard.
 *
 * Body: { plan: 'starter' | 'pro' | 'elite' }
 *
 * Env vars requises :
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_STARTER  — price_... (199€/mois)
 *   STRIPE_PRICE_PRO      — price_... (299€/mois)
 *   STRIPE_PRICE_ELITE    — price_... (499€/mois)
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  starter: {
    priceEnv: 'STRIPE_PRICE_STARTER',
    name: 'Starter',
    amount: 199,
  },
  pro: {
    priceEnv: 'STRIPE_PRICE_PRO',
    name: 'Pro',
    amount: 299,
  },
  elite: {
    priceEnv: 'STRIPE_PRICE_ELITE',
    name: 'Elite',
    amount: 499,
  },
};

const { secureRequest } = require('./_security');

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://rbperform.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!secureRequest(req, res, { max: 10, windowMs: 3600000 })) return;

  try {
    const { plan } = req.body || {};

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        error: `Plan invalide. Choisis: ${Object.keys(PLANS).join(', ')}`,
      });
    }

    const config = PLANS[plan];
    const priceId = process.env[config.priceEnv];

    if (!priceId) {
      return res.status(500).json({
        error: `${config.priceEnv} not configured. Create price in Stripe Dashboard.`,
      });
    }

    const baseUrl = 'https://rbperform.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      subscription_data: {
        metadata: {
          plan: plan,
          plan_name: config.name,
          amount: String(config.amount),
        },
      },
      success_url: `${baseUrl}/?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl}/?checkout=cancelled&plan=${plan}`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
