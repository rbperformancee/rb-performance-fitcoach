# Multi-currency + Tax compliance — Setup runbook

Wave 5.8 — Stripe checkout supporte EUR (default), USD, GBP avec
calcul TVA/sales tax automatique pour vendre B2B en UE et US.

## Architecture

```
Visiteur US (IP US)
    │
    ▼
GET /api/geo  ◄── Vercel header "x-vercel-ip-country: US"
    │
    └─► { country: "US", currency: "USD", symbol: "$",
          prices: { founding: "$229", starter: "$229", pro: "$349", elite: "$579" } }

Frontend affiche prix en USD, stocke `currency: 'USD'` dans le storage local

CTA "Rejoindre" cliquee
    │
    ▼
POST /api/checkout-founding  body: { currency: "USD" }
    │
    ├─► resolvePriceId("USD") → STRIPE_PRICE_FOUNDING_USD
    │   (ou fallback EUR si USD non configure)
    │
    └─► Stripe Checkout Session creee avec :
        - automatic_tax: { enabled: true }     ← TVA/sales tax auto
        - tax_id_collection: { enabled: true } ← VAT ID B2B (reverse charge)
        - billing_address_collection: required ← needed pour automatic_tax
```

## Etape 1 — Stripe Dashboard : Tax origin

Stripe doit savoir d'ou tu vends pour calculer la bonne taxe.

1. Dashboard → Tax → Settings
2. **Origin address** : adresse francaise (auto-entrepreneur ou SIRET)
3. **Default tax behavior** : "Inclusive" (prix TTC) ou "Exclusive" (prix HT)
   — Pour B2C français : "Inclusive" (199€ TTC)
   — Pour B2B EU : "Exclusive" (199€ HT, TVA ajoutee si applicable)
4. **Tax registrations** :
   - France (SIRET) → automatique
   - Si tu vends en US → enregistrer dans les states ou tu depasses le seuil nexus
   - Si tu vends en UK → enregistrer si tu depasses £85k/an

## Etape 2 — Creer les Multi-currency Prices

Pour chaque produit (Founding, Starter, Pro, Elite), creer 3 Prices —
un par devise principale.

### Founding Coach Program (199€/mois)

```
Dashboard → Products → "Founding Coach Program" → + Add another price
```

| Currency | Amount | Type      | Recurring |
|----------|--------|-----------|-----------|
| EUR      | 199    | Recurring | Monthly   |
| USD      | 229    | Recurring | Monthly   |
| GBP      | 179    | Recurring | Monthly   |

Copier les Price IDs (`price_...`) et les ajouter aux env vars Vercel.

### Standard plans

| Plan    | EUR  | USD  | GBP  |
|---------|------|------|------|
| Starter | 199€ | $229 | £179 |
| Pro     | 299€ | $349 | £269 |
| Elite   | 499€ | $579 | £449 |

(Conversions indicatives basees sur taux commercial premium —
ajuster selon ton positionnement marche US/UK.)

## Etape 3 — Env vars Vercel

```bash
# Required (EUR base)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_FOUNDING=price_...      # 199€/mois
STRIPE_PRICE_STARTER=price_...          # 199€/mois
STRIPE_PRICE_PRO=price_...              # 299€/mois
STRIPE_PRICE_ELITE=price_...            # 499€/mois

# Optional (USD)
STRIPE_PRICE_FOUNDING_USD=price_...
STRIPE_PRICE_STARTER_USD=price_...
STRIPE_PRICE_PRO_USD=price_...
STRIPE_PRICE_ELITE_USD=price_...

# Optional (GBP)
STRIPE_PRICE_FOUNDING_GBP=price_...
STRIPE_PRICE_STARTER_GBP=price_...
STRIPE_PRICE_PRO_GBP=price_...
STRIPE_PRICE_ELITE_GBP=price_...
```

Si une devise n'a pas son Price ID configure, le checkout fallback
sur EUR (jamais d'erreur 500 a cause d'une env manquante).

## Etape 4 — Frontend integration

### Pages statiques (landing.html, founding.html)

Ajouter au bas du `<body>` :

```html
<script>
fetch('/api/geo').then(r => r.json()).then(({currency, symbol, prices}) => {
  // Stocker pour le checkout
  try { localStorage.setItem('rb_currency', currency); } catch {}
  // Update les elements avec data-price="key"
  document.querySelectorAll('[data-price]').forEach(el => {
    const key = el.dataset.price;
    if (prices[key]) el.textContent = prices[key];
  });
}).catch(() => {});
</script>
```

Et tagger les prix HTML :

```html
<span data-price="founding">199€</span>
<span data-price="pro">299€</span>
```

### React app

```js
// Au moment du checkout
const currency = localStorage.getItem('rb_currency') || 'EUR';
const r = await fetch('/api/checkout-founding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency }),
});
const { url } = await r.json();
window.location.href = url;
```

## Etape 5 — Test local

```bash
# Stripe CLI
stripe listen --forward-to localhost:3000/api/webhook-stripe

# Tester checkout USD
curl -X POST http://localhost:3000/api/checkout-founding \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD"}'

# Tester /api/geo (simuler header)
curl http://localhost:3000/api/geo \
  -H "x-vercel-ip-country: US"
```

## Etape 6 — Verification post-deploy

1. **Tax compliance** :
   - Acheter avec une carte FR → TVA 20% ajoutee
   - Acheter avec une carte US (zip 94103) → sales tax CA si registered
   - B2B EU avec VAT ID (FR12345678901) → reverse charge applique (0% TVA)

2. **Multi-currency** :
   - Visiteur US : `/api/geo` retourne USD, prix en $
   - Visiteur GB : `/api/geo` retourne GBP, prix en £
   - Visiteur DE : `/api/geo` retourne EUR

3. **Checkout** :
   - Subscription metadata contient `currency: "USD"` (pour analytics)
   - Le webhook traite la souscription quelle que soit la devise

## Notes legales

- **France** : seuil franchise TVA 36 800€/an services. Au-dessus →
  declaration TVA mensuelle obligatoire.
- **EU OSS (One Stop Shop)** : vendre B2C dans plusieurs pays UE >
  10 000€/an → declaration trimestrielle OSS obligatoire.
- **US** : sales tax nexus dans chaque state ou tu depasses le seuil
  (souvent $100k ou 200 transactions/an). Stripe Tax track ca pour toi.

Ces obligations sont gerees automatiquement par `automatic_tax: enabled`.
Stripe genere les rapports fiscaux dans Dashboard → Tax → Reports.
