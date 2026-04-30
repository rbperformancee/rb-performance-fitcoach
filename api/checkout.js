/**
 * POST /api/checkout
 *
 * Cree une Stripe Checkout Session pour les plans standard.
 *
 * Body: { plan, currency?, email? }
 *   plan     : 'starter' | 'pro' | 'elite'
 *   currency : 'EUR' | 'USD' | 'GBP' (optionnel)
 *   email    : email du coach (optionnel mais recommande). Si fourni,
 *              on cherche un Customer Stripe existant pour eviter les
 *              doublons (coach qui signup 2x = 2 abonnements payants).
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

/**
 * Resolve un Stripe Customer existant par email. Si plusieurs (coach qui
 * a check-out plusieurs fois sans completer), on prend le plus recent.
 * Retourne null si aucun match — le checkout creera un nouveau Customer.
 */
async function findExistingCustomer(stripe, email) {
  if (!email) return null;
  try {
    const list = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 5 });
    if (!list.data || list.data.length === 0) return null;
    // Prendre le plus recent (premier de la liste, Stripe trie desc par defaut)
    return list.data[0].id;
  } catch (e) {
    console.error('[checkout] customer lookup failed:', e.message);
    return null;
  }
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

  // Reject malformed JSON with 400 (rather than 500 from generic catch).
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') throw new Error('invalid body');
  } catch (e) {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  try {
    const { plan, currency, email } = body;

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
    const stripe = getStripe();

    // Dedup customer si email fourni : evite la double-souscription
    const existingCustomerId = await findExistingCustomer(stripe, email);

    const sessionParams = {
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
    };
    // Soit on reutilise le Customer existant, soit on pre-remplit l'email
    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
      sessionParams.customer_update = { address: 'auto', name: 'auto' };
    } else if (email) {
      sessionParams.customer_email = email.toLowerCase().trim();
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url, currency: usedCurrency });
  } catch (err) {
    console.error('[checkout] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
