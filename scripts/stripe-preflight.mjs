#!/usr/bin/env node
// Pre-flight check Stripe — vérifie en prod si on est vraiment en LIVE mode.
// Usage : node scripts/stripe-preflight.mjs
//
// Le script :
// 1. Lit /api/_health-stripe?secret=$CRON_SECRET (endpoint à créer si besoin)
// 2. OU directement teste les endpoints /api/checkout-founding etc.
// 3. Output : ✅ / ❌ par check + diagnostic

const PROD = 'https://rbperform.app';
const COLORS = { reset:'\x1b[0m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m', cyan:'\x1b[36m', bold:'\x1b[1m' };
const c = (color, str) => `${COLORS[color]}${str}${COLORS.reset}`;

const results = [];
function check(label, pass, detail = '') {
  results.push({ label, pass, detail });
  const icon = pass ? c('green', '✅') : c('red', '❌');
  console.log(`${icon} ${label}${detail ? c('cyan', ' — ' + detail) : ''}`);
}

console.log(c('bold', '\n💳 Stripe Pre-flight Check — RB Perform\n'));
console.log(c('cyan', `Target: ${PROD}\n`));

// === Check 1 : robots.txt accessible ===
try {
  const r = await fetch(`${PROD}/robots.txt`);
  check('robots.txt accessible (200)', r.ok, `status ${r.status}`);
} catch (e) { check('robots.txt accessible', false, e.message); }

// === Check 2 : Page founding répond ===
try {
  const r = await fetch(`${PROD}/founding`);
  const html = await r.text();
  const isTest = html.includes('pk_test_');
  const isLive = html.includes('pk_live_');
  check('/founding accessible', r.ok, `status ${r.status}`);
  if (isTest) check('PK Stripe mode', false, c('yellow', 'pk_test_ détecté (TEST mode)'));
  else if (isLive) check('PK Stripe mode', true, c('green', 'pk_live_ détecté (LIVE mode)'));
  else check('PK Stripe mode', false, 'aucune clé publishable détectée dans /founding (vérifier que le JS la charge bien)');
} catch (e) { check('/founding accessible', false, e.message); }

// === Check 3 : /api/checkout-founding répond proprement ===
try {
  const r = await fetch(`${PROD}/api/checkout-founding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'preflight-test@rbperform.app', currency: 'EUR' }),
  });
  const json = await r.json().catch(() => ({}));

  if (r.ok && json.url && json.url.startsWith('https://checkout.stripe.com')) {
    const isTestUrl = json.url.includes('/c/pay/cs_test_');
    const isLiveUrl = json.url.includes('/c/pay/cs_live_');
    check('/api/checkout-founding crée une session', true, `URL: ${json.url.slice(0, 50)}...`);
    if (isTestUrl) check('Session Stripe mode', false, c('yellow', 'cs_test_ détecté (TEST mode)'));
    else if (isLiveUrl) check('Session Stripe mode', true, c('green', 'cs_live_ détecté (LIVE mode)'));
    else check('Session Stripe mode', false, 'format URL inattendu');
  } else if (json.error) {
    check('/api/checkout-founding crée une session', false, `Error: ${json.error}`);
    if (json.error.toLowerCase().includes('price')) {
      console.log(c('yellow', '   → Probable cause : STRIPE_PRICE_FOUNDING vide ou invalide en Vercel'));
    } else if (json.error.toLowerCase().includes('key')) {
      console.log(c('yellow', '   → Probable cause : STRIPE_SECRET_KEY vide ou invalide en Vercel'));
    }
  } else {
    check('/api/checkout-founding crée une session', false, `status ${r.status}`);
  }
} catch (e) { check('/api/checkout-founding crée une session', false, e.message); }

// === Check 4 : Webhook endpoint accessible (POST sans signature = 400 attendu, c'est OK) ===
try {
  const r = await fetch(`${PROD}/api/webhook-stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true }),
  });
  // Sans signature, le webhook doit refuser proprement (400 ou 401), PAS 500
  if (r.status === 400 || r.status === 401) {
    check('/api/webhook-stripe répond (signature check actif)', true, `status ${r.status} attendu sans signature`);
  } else if (r.status === 500) {
    check('/api/webhook-stripe répond', false, c('yellow', `500 = STRIPE_WEBHOOK_SECRET probablement vide en Vercel`));
  } else if (r.ok) {
    check('/api/webhook-stripe répond', false, c('yellow', `${r.status} = signature pas vérifiée → faille de sécurité`));
  } else {
    check('/api/webhook-stripe répond', true, `status ${r.status}`);
  }
} catch (e) { check('/api/webhook-stripe répond', false, e.message); }

// === Check 5 : llms.txt et robots.txt opt-IN bots IA ===
try {
  const r = await fetch(`${PROD}/llms.txt`);
  check('/llms.txt accessible (GEO)', r.ok, `status ${r.status}`);
} catch (e) { check('/llms.txt accessible', false, e.message); }

// === Récap final ===
console.log();
const passed = results.filter(r => r.pass).length;
const total = results.length;
const allGreen = passed === total;
console.log(c('bold', `Résultat : ${passed}/${total} checks OK\n`));

if (allGreen) {
  console.log(c('green', '🚀 PRE-FLIGHT VALIDÉ.'));
  console.log('   Tu peux passer à la Phase 7 (test paiement réel) du STRIPE-GOLIVE-RUNBOOK.\n');
  process.exit(0);
} else {
  console.log(c('red', '❌ PRE-FLIGHT INCOMPLET.'));
  console.log('   Corrige les checks rouges ci-dessus avant de tester un paiement réel.');
  console.log('   Référence : STRIPE-GOLIVE-RUNBOOK.md, section Troubleshooting.\n');
  process.exit(1);
}
