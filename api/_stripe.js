/**
 * Lazy Stripe client initializer.
 *
 * Prevents module-load crashes when STRIPE_SECRET_KEY is missing:
 * the client is created on first use, not at module import time,
 * so CORS preflight and unrelated errors don't manifest as
 * FUNCTION_INVOCATION_FAILED 500s.
 *
 * Usage:
 *   const getStripe = require('./_stripe');
 *   const session = await getStripe().checkout.sessions.create({...});
 */

let _stripe;

module.exports = function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = require('stripe')(key);
  }
  return _stripe;
};
