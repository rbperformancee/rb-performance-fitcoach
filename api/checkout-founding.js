/**
 * POST /api/checkout-founding
 *
 * Cree une Stripe Checkout Session pour le Founding Coach Program (199€/mois).
 *
 * Multi-currency (wave 5.8) :
 *   Body optionnel : { currency: 'EUR' | 'USD' | 'GBP' }
 *   Le client peut suggerer une devise (depuis /api/geo). Si le Price ID
 *   correspondant existe, on l'utilise. Sinon fallback EUR (ne casse rien).
 *
 * Env vars (alignees sur les standards STRIPE_PRICE_* de checkout.js) :
 *   STRIPE_SECRET_KEY              — sk_live_... / sk_test_...
 *   STRIPE_PRICE_FOUNDING          — Price ID EUR (defaut, requis)
 *   STRIPE_PRICE_FOUNDING_USD      — Price ID USD (optionnel)
 *   STRIPE_PRICE_FOUNDING_GBP      — Price ID GBP (optionnel)
 *
 * Tax compliance EU (RGPD/TVA) :
 *   - automatic_tax : Stripe calcule TVA selon billing address
 *   - tax_id_collection : collecte VAT ID B2B (reverse charge UE)
 *   - billing_address_collection : required (necessaire pour automatic_tax)
 *
 * Voir MULTI-CURRENCY.md pour le setup Stripe Dashboard.
 */

const getStripe = require('./_stripe');
const { secureRequest } = require('./_security');

const CURRENCY_PRICE_ENV = {
  EUR: 'STRIPE_PRICE_FOUNDING',
  USD: 'STRIPE_PRICE_FOUNDING_USD',
  GBP: 'STRIPE_PRICE_FOUNDING_GBP',
};

function resolvePriceId(requestedCurrency) {
  const cur = String(requestedCurrency || '').toUpperCase();
  if (CURRENCY_PRICE_ENV[cur]) {
    const id = process.env[CURRENCY_PRICE_ENV[cur]];
    if (id) return { priceId: id, currency: cur };
  }
  // Fallback EUR
  return { priceId: process.env.STRIPE_PRICE_FOUNDING, currency: 'EUR' };
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
    const { currency } = req.body || {};
    const { priceId, currency: usedCurrency } = resolvePriceId(currency);

    if (!priceId) {
      return res.status(500).json({
        error: 'STRIPE_PRICE_FOUNDING not configured. Create a price in Stripe Dashboard first.'
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
      // Tax compliance — Stripe calcule TVA EU + sales tax US automatiquement
      automatic_tax: { enabled: true },
      // VAT ID B2B (reverse charge) — required pour vendre B2B en UE
      tax_id_collection: { enabled: true },
      // Necessaire pour automatic_tax
      billing_address_collection: 'required',
      // Sync l'address back sur le Customer pour les renouvellements
      customer_update: undefined,
      subscription_data: {
        metadata: {
          founding_coach: 'true',
          locked_price: '199',
          currency: usedCurrency,
        },
      },
      success_url: `${baseUrl}/founding?success=true`,
      cancel_url: `${baseUrl}/founding?cancelled=true`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url, currency: usedCurrency });
  } catch (err) {
    console.error('[checkout-founding] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
