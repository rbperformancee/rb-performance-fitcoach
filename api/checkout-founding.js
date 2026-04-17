/**
 * POST /api/checkout-founding
 *
 * Crée une Stripe Checkout Session pour le Founding Coach Program.
 * Redirige le prospect vers Stripe pour payer 149€/mois.
 *
 * Env vars requises :
 *   STRIPE_SECRET_KEY — clé secrète Stripe (sk_live_... ou sk_test_...)
 *   STRIPE_FOUNDING_PRICE_ID — ID du prix Stripe (price_...)
 *
 * Le prix doit être créé dans le dashboard Stripe :
 *   - Produit : "Founding Coach Program"
 *   - Prix : 149€/mois récurrent
 *   - Metadata : { founding: true, locked_price: true }
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const priceId = process.env.STRIPE_FOUNDING_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({
        error: 'STRIPE_FOUNDING_PRICE_ID not configured. Create a price in Stripe Dashboard first.'
      });
    }

    const origin = req.headers.origin || req.headers.referer || 'https://rbperform.app';
    const baseUrl = origin.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      subscription_data: {
        metadata: {
          founding_coach: 'true',
          locked_price: '199',
        },
      },
      success_url: `${baseUrl}/founding?success=true`,
      cancel_url: `${baseUrl}/founding?cancelled=true`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout-founding] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
