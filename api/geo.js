/**
 * GET /api/geo
 *
 * Detecte le pays + devise du visiteur via les headers Vercel
 * (`x-vercel-ip-country`). Utilise par les pages pricing pour afficher
 * le prix dans la devise locale et passer la bonne `currency` a /api/checkout.
 *
 * Wave 5.8 / 8 — multi-currency support.
 *
 * Reponse :
 *   {
 *     country: "US",        // ISO 3166-1 alpha-2 (ou "" si inconnu)
 *     currency: "USD",      // EUR par defaut (UE + pays sans mapping)
 *     symbol: "$",
 *     prices: {
 *       founding: "$229",
 *       starter: "$229",
 *       pro: "$349",
 *       elite: "$579"
 *     }
 *   }
 *
 * Cache : 1h CDN, 5 min browser. Geolocation IP est stable.
 */

// Pays UE + EFTA (Suisse, Norvege, Islande...) → EUR
// Sinon, mapping explicite par devise. Default EUR.
const COUNTRY_CURRENCY = {
  // USD
  US: 'USD',
  // GBP
  GB: 'GBP',
  // EUR (UE + EEE)
  AT: 'EUR', BE: 'EUR', BG: 'EUR', CY: 'EUR', CZ: 'EUR',
  DE: 'EUR', DK: 'EUR', EE: 'EUR', ES: 'EUR', FI: 'EUR',
  FR: 'EUR', GR: 'EUR', HR: 'EUR', HU: 'EUR', IE: 'EUR',
  IS: 'EUR', IT: 'EUR', LI: 'EUR', LT: 'EUR', LU: 'EUR',
  LV: 'EUR', MT: 'EUR', NL: 'EUR', NO: 'EUR', PL: 'EUR',
  PT: 'EUR', RO: 'EUR', SE: 'EUR', SI: 'EUR', SK: 'EUR',
  CH: 'EUR', // Suisse paie souvent en EUR
};

const CURRENCY_SYMBOL = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

// Prix afficher par devise. Doit matcher les Stripe Prices configurees
// dans le Dashboard (sinon decalage entre landing et checkout).
// Ces valeurs sont indicatives — la conversion EUR→USD/GBP suit le taux
// commercial premium (pas le taux interbancaire). Voir MULTI-CURRENCY.md.
const PRICES = {
  EUR: { founding: '199€',  starter: '199€', pro: '299€', elite: '499€' },
  USD: { founding: '$229', starter: '$229', pro: '$349', elite: '$579' },
  GBP: { founding: '£179', starter: '£179', pro: '£269', elite: '£449' },
};

module.exports = async (req, res) => {
  // Cache 1h CDN, 5min browser — geolocation IP est stable
  res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=300');
  res.setHeader('Vary', 'X-Vercel-IP-Country');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  // Permet l'appel cross-origin depuis les pages statiques (landing, founding)
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Vercel injecte automatiquement x-vercel-ip-country pour chaque request
  const country = (req.headers['x-vercel-ip-country'] || '').toUpperCase();
  const currency = COUNTRY_CURRENCY[country] || 'EUR';
  const symbol = CURRENCY_SYMBOL[currency];

  return res.status(200).json({
    country,
    currency,
    symbol,
    prices: PRICES[currency],
  });
};
