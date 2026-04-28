/**
 * POST /api/checkout
 *
 * Cree une Stripe Checkout Session pour les plans standard.
 *
 * Body: { plan: 'starter' | 'pro' | 'elite', currency?: 'EUR' | 'USD' | 'GBP' }
 *
 * Env vars (par plan, base EUR + alternates) :
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_STARTER       — EUR defaut (requis)
 *   STRIPE_PRICE_STARTER_USD   — optionnel
 *   STRIPE_PRICE_STARTER_GBP   — optionnel
 *   STRIPE_PRICE_PRO[_USD|_GBP]
 *   STRIPE_PRICE_ELITE[_USD|_GBP]
 *
 * Voir MULTI-CURRENCY.md pour le setup Stripe Dashboard.
 */

const getStripe = require('./_stripe');
const { secureRequest } = require('./_security');

const PLANS = {
  starter: { baseEnv: 'STRIPE_PRICE_STARTER', name: 'Starter', amount: 199 },
  pro:     { baseEnv: 'STRIPE_PRICE_PRO',     name: 'Pro',     amount: 299 },
  elite:   { baseEnv: 'STRIPE_PRICE_ELITE',   name: 'Elite',   amount: 499 },
};

function resolvePriceId(plan, requestedCurrency) {
  const cfg = PLANS[plan];
  if (!cfg) return { priceId: null, currency: null };
  const cur = String(requestedCurrency || '').toUpperCase();
  if (cur === 'USD' || cur === 'GBP') {
    const id = process.env[`${cfg.baseEnv}_${cur}`];
    if (id) return { priceId: id, currency: cur };
  }
  return { priceId: process.env[cfg.baseEnv], currency: 'EUR' };
}

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
    const { plan, currency } = req.body || {};

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        error: `Plan invalide. Choisis: ${Object.keys(PLANS).join(', ')}`,
      });
    }

    const config = PLANS[plan];
    const { priceId, currency: usedCurrency } = resolvePriceId(plan, currency);

    if (!priceId) {
      return res.status(500).json({
        error: `${config.baseEnv} not configured. Create price in Stripe Dashboard.`,
      });
    }

    const baseUrl = 'https://rbperform.app';

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      // Tax compliance — TVA EU + sales tax US calcules automatiquement
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'required',
      subscription_data: {
        metadata: {
          plan: plan,
          plan_name: config.name,
          amount: String(config.amount),
          currency: usedCurrency,
        },
      },
      success_url: `${baseUrl}/?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl}/?checkout=cancelled&plan=${plan}`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url, currency: usedCurrency });
  } catch (err) {
    console.error('[checkout] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
