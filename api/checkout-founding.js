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

const { z } = require('zod');
const getStripe = require('./_stripe');
const { secureRequest } = require('./_security');

const bodySchema = z.object({
  email: z.string().email().max(254),
  currency: z.enum(['EUR', 'USD', 'GBP']).optional(),
}).passthrough();

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

/**
 * Resolve un Stripe Customer existant par email — evite les Founders
 * qui signup 2x et finissent avec 2 abonnements actifs facturees.
 */
async function findExistingCustomer(stripe, email) {
  if (!email) return null;
  try {
    const list = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 5 });
    if (!list.data || list.data.length === 0) return null;
    return list.data[0].id;
  } catch (e) {
    console.error('[checkout-founding] customer lookup failed:', e.message);
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

  // Parse JSON body — Vercel auto-parses, but malformed input may surface as
  // string or null. Reject malformed early with 400 before reaching Stripe.
  let rawBody;
  try {
    rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!rawBody || typeof rawBody !== 'object') throw new Error('invalid body');
  } catch (e) {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  // Schema validation — require at least an email to reduce abuse surface
  // (empty POSTs spawning Stripe Checkout Sessions).
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid body',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { currency, email } = parsed.data;
    const { priceId, currency: usedCurrency } = resolvePriceId(currency);

    if (!priceId) {
      return res.status(500).json({
        error: 'STRIPE_PRICE_FOUNDING not configured. Create a price in Stripe Dashboard first.'
      });
    }

    const baseUrl = 'https://rbperform.app';
    const stripe = getStripe();

    // Dedup customer si email fourni — evite la double-souscription Founder
    const existingCustomerId = await findExistingCustomer(stripe, email);

    const sessionParams = {
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
    };
    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
      sessionParams.customer_update = { address: 'auto', name: 'auto' };
    } else if (email) {
      sessionParams.customer_email = email.toLowerCase().trim();
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url, currency: usedCurrency });
  } catch (err) {
    console.error('[checkout-founding] Error:', err.message);
    const isProd = process.env.VERCEL_ENV === 'production';
    return res.status(500).json({ error: isProd ? 'Stripe error' : err.message });
  }
};
