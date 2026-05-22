# 💳 Stripe Go-Live Runbook — RB Perform

> **Pour qui ?** Pour toi Rayan, **EXACTEMENT** les étapes pour passer de Stripe Test à Stripe Live.
> **Durée estimée :** 1h30-2h (compte Stripe déjà activé).
> **Stratégie devises :** EUR-only au départ (USD/GBP s'ajoutent en 30min plus tard si besoin).
> **À avoir sous la main :** ton login Stripe Dashboard, ton login Vercel, ton login Supabase Studio.

---

## ⚠️ AVANT DE COMMENCER

### Pré-requis obligatoires

- [ ] Compte Stripe activé en mode Live (KYC validé) ✅ tu as confirmé
- [ ] IBAN ajouté pour recevoir les paiements
- [ ] Login Vercel actif (tu es déjà connecté via CLI)
- [ ] Login Supabase Studio actif
- [ ] Une vraie carte bancaire pour tester un paiement réel à la fin (puis refund)

### Bascule du toggle Test/Live dans Stripe

En haut à droite du Stripe Dashboard, il y a un toggle :
```
[Test mode] ← actuellement
[Live mode] ← à activer pour ce runbook
```

**👉 Bascule sur Live mode dès maintenant.** Toutes les étapes Stripe ci-dessous se font en Live mode.

---

## PHASE 1 — Créer 4 Products + 4 Prices sur Stripe (30 min)

### Objectif
Créer dans Stripe Live mode les 4 produits SaaS (Founding, Starter, Pro, Elite) avec un prix EUR chacun. Récupérer les 4 Price IDs au format `price_xxx`.

### Étape 1.1 — Créer le Product "Founding Coach Program"

1. Stripe Dashboard → **Products** (menu latéral) → **+ Add product**
2. Remplir :
   - **Name** : `Founding Coach Program`
   - **Description** : `Programme Founding RB Perform — 30 places à 199€/mois bloqué à vie. Accès complet : dashboard MRR, anti-churn IA, paiements 0% commission, facturation conforme.`
   - **Image** : upload `/Users/rayan/fitcoach_updated/public/icon-512.png` (le logo PWA)
   - **Tax behavior** : `Exclusive` (TVA en sus, conforme B2B)
   - **Statement descriptor** : `RB PERFORM` (max 22 chars, c'est ce qui apparaît sur le relevé bancaire client)
3. **Pricing** (en bas du form) :
   - **Pricing model** : `Standard pricing`
   - **Price** : `199.00`
   - **Currency** : `EUR`
   - **Billing period** : `Monthly` (cocher "Recurring")
4. Clique **Add product** (en bas à droite)
5. Une fois créé, dans la page produit, **clique sur le prix** que tu viens de créer
6. **Copie le Price ID** qui ressemble à `price_1QxxxxxxxxxxxxxFounding` (format `price_1...` long)
7. **Note-le dans un fichier temporaire** :

```
STRIPE_PRICE_FOUNDING=price_1Q...
```

### Étape 1.2 — Créer le Product "Starter"

Pareil que 1.1, avec :
- **Name** : `Starter`
- **Description** : `Plan Starter RB Perform — 199€/mois. Accès complet plateforme.`
- **Price** : `199.00 EUR / Monthly`
- **Note le Price ID** :

```
STRIPE_PRICE_STARTER=price_1Q...
```

### Étape 1.3 — Créer le Product "Pro"

- **Name** : `Pro`
- **Description** : `Plan Pro RB Perform — 299€/mois. Accès complet plateforme + support prioritaire.`
- **Price** : `299.00 EUR / Monthly`
- **Note le Price ID** :

```
STRIPE_PRICE_PRO=price_1Q...
```

### Étape 1.4 — Créer le Product "Elite"

- **Name** : `Elite`
- **Description** : `Plan Elite RB Perform — 499€/mois. Accès complet + onboarding personnalisé + accompagnement strategique mensuel.`
- **Price** : `499.00 EUR / Monthly`
- **Note le Price ID** :

```
STRIPE_PRICE_ELITE=price_1Q...
```

### ✅ Checkpoint Phase 1

À ce stade tu dois avoir un fichier temporaire avec :
```
STRIPE_PRICE_FOUNDING=price_1Q...
STRIPE_PRICE_STARTER=price_1Q...
STRIPE_PRICE_PRO=price_1Q...
STRIPE_PRICE_ELITE=price_1Q...
```

**Garde ce fichier ouvert**, on s'en servira en Phase 3.

---

## PHASE 2 — Configurer le Webhook Stripe (15 min)

### Objectif
Créer un endpoint webhook dans Stripe qui notifiera Vercel à chaque event de paiement. Récupérer le webhook signing secret (`whsec_live_xxx`).

### Étape 2.1 — Créer le webhook

1. Stripe Dashboard → **Developers** (menu en bas à gauche) → **Webhooks**
2. Clique **+ Add endpoint** (top right)
3. Remplir :
   - **Endpoint URL** : `https://rbperform.app/api/webhook-stripe`
   - **Description** : `RB Perform — Webhook coach subscriptions`
   - **Version API** : laisse la version par défaut (la plus récente)
4. **Events à écouter** — clique "Select events" et coche EXACTEMENT ces 7 events :

```
✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_failed
✅ charge.refunded
✅ charge.dispute.created
```

(Les events `charge.dispute.funds_withdrawn` et `charge.dispute.closed` sont gérés mais optionnels — si tu les ajoutes c'est bonus.)

5. Clique **Add endpoint** (en bas)

### Étape 2.2 — Récupérer le Signing Secret

1. Sur la page du webhook que tu viens de créer
2. Section **Signing secret** (en haut)
3. Clique **Click to reveal** → un secret au format `whsec_live_xxx` apparaît
4. **Copie-le dans ton fichier temporaire** :

```
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

### ✅ Checkpoint Phase 2

Fichier temporaire à jour :
```
STRIPE_PRICE_FOUNDING=price_1Q...
STRIPE_PRICE_STARTER=price_1Q...
STRIPE_PRICE_PRO=price_1Q...
STRIPE_PRICE_ELITE=price_1Q...
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

---

## PHASE 3 — Récupérer les API Keys Live (5 min)

### Étape 3.1 — Stripe Secret Key + Publishable Key

1. Stripe Dashboard → **Developers** → **API keys**
2. Section **Standard keys** (en haut)
3. **Publishable key** : commence par `pk_live_xxx` → clique pour copier
4. **Secret key** : clique **Reveal live key** → commence par `sk_live_xxx` → copie

**⚠️ La Secret key ne s'affiche qu'UNE FOIS.** Note-la immédiatement.

5. Ajoute au fichier temporaire :

```
STRIPE_SECRET_KEY=sk_live_...
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
```

### ✅ Checkpoint Phase 3

Tu dois avoir **7 lignes** dans ton fichier temporaire maintenant :

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_PRICE_FOUNDING=price_1Q...
STRIPE_PRICE_STARTER=price_1Q...
STRIPE_PRICE_PRO=price_1Q...
STRIPE_PRICE_ELITE=price_1Q...
```

---

## PHASE 4 — Configurer Vercel env vars (15 min)

### Étape 4.1 — Ajouter les env vars

1. Va sur **https://vercel.com/dashboard**
2. Sélectionne ton projet **rb-perform** (ou le nom Vercel exact)
3. **Settings** (top nav) → **Environment Variables** (menu latéral)
4. Pour chaque ligne du fichier temporaire :
   - **Key** : nom exact (ex: `STRIPE_SECRET_KEY`)
   - **Value** : la valeur copy-paste depuis ton fichier
   - **Environments** : ✅ Production ✅ Preview ✅ Development (les 3 cochés)
   - Clique **Save**

⚠️ **Important** : sois précis sur les noms — `STRIPE_SECRET_KEY` (pas `STRIPE_SECRET` ni `STRIPE_API_KEY`). Le code dépend des noms exacts.

### Étape 4.2 — Vérification visuelle

Tu dois voir 7 nouvelles entrées dans la liste :
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `REACT_APP_STRIPE_PUBLIC_KEY`
- ✅ `STRIPE_PRICE_FOUNDING`
- ✅ `STRIPE_PRICE_STARTER`
- ✅ `STRIPE_PRICE_PRO`
- ✅ `STRIPE_PRICE_ELITE`

### Étape 4.3 — Redeploy pour appliquer

Les env vars ne sont prises en compte qu'au prochain deploy.

```bash
cd /Users/rayan/fitcoach_updated
npx vercel deploy --prod --yes
```

OU via UI Vercel : **Deployments** → dernier deploy → 3 points (...) → **Redeploy** → décocher "Use existing Build Cache" → **Redeploy**.

### ✅ Checkpoint Phase 4

Vercel a re-buildé. Tu peux passer à la phase suivante.

---

## PHASE 5 — Configurer Supabase Edge Function (10 min)

### Pourquoi
Il y a un 2e webhook handler (`supabase/functions/stripe-webhook/index.ts`) qui tourne en parallèle (redondance). Il a besoin des mêmes secrets.

### Étape 5.1 — Ajouter les secrets

1. Va sur **https://supabase.com/dashboard**
2. Sélectionne ton projet **RB Perform** (pwkajyrpldhlybavmopd)
3. Menu latéral : **Edge Functions** → **stripe-webhook**
4. Onglet **Settings** (ou directement section **Secrets** en haut)
5. Ajouter 2 secrets :
   - `STRIPE_SECRET_KEY` = `sk_live_...` (même valeur que Vercel)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_live_...` (même valeur que Vercel)

### Étape 5.2 — Re-deploy de la function

Supabase re-déploie automatiquement la function après ajout des secrets (visible dans l'historique deploys).

### ✅ Checkpoint Phase 5

Les secrets Supabase sont à jour. La function tourne avec les bonnes clés.

---

## PHASE 6 — Pre-flight check (5 min)

### Étape 6.1 — Lancer le script de validation

Un script local valide que tout est correctement configuré :

```bash
cd /Users/rayan/fitcoach_updated
node scripts/stripe-preflight.mjs
```

Le script :
- Lit les env vars Vercel via `vercel env pull`
- Vérifie le format de chaque variable (`sk_live_`, `whsec_live_`, `price_`)
- Ping l'API Stripe avec la clé pour valider qu'elle marche
- Récupère les 4 Products + Prices créés et vérifie qu'ils matchent les env vars
- Output : rapport coloré ✅ ou ❌ par check

**Si tout est vert → continue Phase 7.**
**Si rouge sur 1 ligne → relis le message d'erreur, corrige, relance.**

---

## PHASE 7 — Test end-to-end avec vraie carte (20 min)

### Étape 7.1 — Test des endpoints (sans paiement réel)

```bash
node scripts/stripe-test-checkout.mjs
```

Ce script teste les 3 endpoints checkout en prod et te retourne les URLs Stripe Checkout générées. Ouvre une URL dans Safari pour vérifier que la page Stripe s'affiche correctement (logo, prix 199€, formulaire propre).

### Étape 7.2 — Vrai paiement de test

1. Va sur **https://rbperform.app/founding**
2. Clique CTA "Rejoindre"
3. Tu arrives sur Stripe Checkout
4. **Utilise ta vraie carte bancaire perso** (montant 199€ — sera remboursé en étape 7.5)
5. **Email** : utilise une adresse que tu contrôles (ex: rayan+stripetest@gmail.com)
6. Complète le paiement

### Étape 7.3 — Vérifications post-paiement

À faire dans les 60 secondes après le paiement :

**A) Stripe Dashboard → Payments** :
- ✅ Tu dois voir le paiement de 199€ EUR
- ✅ Status = Succeeded

**B) Stripe Dashboard → Webhooks → ton webhook → "Recent deliveries"** :
- ✅ `checkout.session.completed` reçu, response 200
- ✅ `customer.subscription.created` reçu, response 200

**C) Supabase Studio → Table Editor → coaches** :
- ✅ Nouvelle ligne avec ton email
- ✅ `subscription_plan` = `founding`
- ✅ `stripe_customer_id` rempli (`cus_xxx`)
- ✅ `locked_price` = `199`
- ✅ `is_active` = true

**D) Boîte email** (l'adresse utilisée pour le test) :
- ✅ Email de bienvenue RB Perform reçu (via Zoho SMTP)
- ✅ Contient un magic link pour set le password

**E) `/api/webhook-stripe` logs dans Vercel** :
```bash
vercel logs https://rbperform.app --since 5m | grep -i stripe
```
- ✅ Pas d'erreur Stripe ou Supabase

### Étape 7.4 — Test login coach

1. Clique le magic link reçu par email
2. Set ton password
3. Tu dois arriver sur le dashboard coach `/app.html?view=dashboard`
4. ✅ Le pricing affiché = Founding 199€

### Étape 7.5 — Cleanup : Refund du test

⚠️ **À FAIRE OBLIGATOIREMENT** sinon tu auras un débit réel de 199€ sur ta carte.

1. Stripe Dashboard → **Payments** → trouve le paiement de 199€ de test
2. Clique le paiement → **Refund payment** (top right)
3. **Refund full amount** → confirme
4. ✅ Tu dois recevoir le refund sur ta carte sous 5-10 jours ouvrés

**Stripe Dashboard → Customers** : tu peux aussi supprimer le customer test si tu veux nettoyer.

**Supabase** : si tu veux nettoyer le coach test :
```sql
DELETE FROM coaches WHERE email = 'rayan+stripetest@gmail.com';
DELETE FROM auth.users WHERE email = 'rayan+stripetest@gmail.com';
```

### ✅ Checkpoint Phase 7

Si tu as ✅ partout : **TU ES EN LIVE.** Le prochain coach qui paie 199€ est un VRAI coach Founding.

---

## ⚠️ TROUBLESHOOTING

### Pas d'email bienvenue reçu
**Cause probable** : `ZOHO_SMTP_PASS` manque en Vercel.
**Fix** : Vercel Settings → Environment Variables → ajouter `ZOHO_SMTP_PASS` = mot de passe app Zoho. Redeploy.

### Webhook retourne 500
**Causes possibles** :
- `STRIPE_WEBHOOK_SECRET` ne correspond pas au webhook créé en Phase 2 → vérifier, re-coller
- `STRIPE_PRICE_*` mal renseignés → vérifier que les valeurs matchent EXACTEMENT les Price IDs Stripe

**Diagnostic** :
```bash
vercel logs https://rbperform.app --since 10m | grep webhook
```

### Webhook retourne 200 mais coach pas créé
**Cause probable** : `priceId` du webhook ne match aucun `STRIPE_PRICE_*` env var → whitelist refuse + alerte critique à Rayan via Sentry.
**Fix** : vérifier que l'env var `STRIPE_PRICE_FOUNDING` contient le Price ID Founding **exact** (copy-paste depuis Stripe Dashboard sans espace).

### Stripe Checkout affiche "Test mode" en haut
**Cause** : `STRIPE_SECRET_KEY` est encore `sk_test_xxx` (oubli de update).
**Fix** : vérifier en Vercel que la valeur commence par `sk_live_`.

### "Payment method not supported in your country"
**Cause** : compte Stripe pas activé pour les paiements de cette zone.
**Fix** : Stripe Dashboard → Settings → Payment methods → activer Carte (toutes les zones supportées).

---

## 🚀 POST GO-LIVE

### Monitoring quotidien (semaine 1)

À regarder chaque jour pendant 7 jours :

1. **Stripe Dashboard → Payments** : nouveaux paiements OK ?
2. **Stripe Dashboard → Webhooks → Recent deliveries** : aucun en error ?
3. **Vercel Logs** : `vercel logs https://rbperform.app --since 24h | grep -iE "stripe|error"` — rien d'anormal ?
4. **Supabase coaches** : nouvelle ligne par paiement reçu ?

### Ajouter USD + GBP plus tard (30 min)

Quand un lead UK ou US arrive, ou quand on veut ouvrir le marché :

1. Refaire Phase 1 pour chaque Product :
   - Stripe Product → Add another price → 229.00 USD / Monthly → note `STRIPE_PRICE_FOUNDING_USD`
   - Same → 179.00 GBP / Monthly → note `STRIPE_PRICE_FOUNDING_GBP`
2. Refaire pareil pour Starter, Pro, Elite
3. Ajouter les 8 nouvelles env vars en Vercel
4. Redeploy
5. Test sur `https://rbperform.app/founding?currency=USD`

### Alerts à configurer

**Stripe Dashboard → Settings → Email notifications** :
- ✅ Successful payments
- ✅ Failed payments
- ✅ Customer disputes
- ✅ Refunds

Tu recevras chaque event par email — utile au début pour catch tout.

### Stripe Connect (Q3 2026)

Pour automatiser les paiements client → coach (au lieu que les coachs configurent leur Stripe perso), il faudra activer **Stripe Connect** :
- Compte Express ou Custom (à décider)
- KYC par coach
- Frais Stripe Connect : 0.25% + 0.25$/transaction
- Mention dans CGV à update

C'est un chantier dédié de ~2 semaines de dev — pas pour le go-live initial.

---

## 📋 Checklist complète (à imprimer / cocher au fur et à mesure)

### Pré-requis
- [ ] Compte Stripe activé en mode Live (KYC + IBAN)
- [ ] Login Vercel actif
- [ ] Login Supabase Studio actif
- [ ] Toggle Stripe basculé sur "Live mode"

### Phase 1 — Products + Prices Stripe
- [ ] Founding (199€/mois) — Price ID noté
- [ ] Starter (199€/mois) — Price ID noté
- [ ] Pro (299€/mois) — Price ID noté
- [ ] Elite (499€/mois) — Price ID noté

### Phase 2 — Webhook
- [ ] Webhook endpoint créé (URL : `/api/webhook-stripe`)
- [ ] 7 events sélectionnés
- [ ] Webhook signing secret noté

### Phase 3 — API Keys
- [ ] `sk_live_...` noté
- [ ] `pk_live_...` noté

### Phase 4 — Vercel
- [ ] 7 env vars ajoutées en Vercel (Production + Preview + Development)
- [ ] Redeploy fait
- [ ] Confirmé que le build s'est terminé sans erreur

### Phase 5 — Supabase
- [ ] `STRIPE_SECRET_KEY` ajouté dans Edge Function secrets
- [ ] `STRIPE_WEBHOOK_SECRET` ajouté dans Edge Function secrets
- [ ] Function re-déployée

### Phase 6 — Pre-flight
- [ ] `node scripts/stripe-preflight.mjs` → tout vert

### Phase 7 — Test réel
- [ ] Paiement test réel effectué (199€ vraie carte)
- [ ] Stripe Dashboard montre le paiement
- [ ] Webhook reçu (200) dans recent deliveries
- [ ] Ligne créée dans Supabase `coaches`
- [ ] Email bienvenue reçu
- [ ] Magic link fonctionne → login coach OK
- [ ] **Refund effectué** ✋ NE PAS OUBLIER

### Post go-live
- [ ] Alerts Stripe par email activées
- [ ] Monitoring J1, J2, J3, J7

---

## 🎯 Récap exécutif

| Étape | Durée | Statut |
|---|---|---|
| Phase 1 (Products + Prices) | 30 min | À faire |
| Phase 2 (Webhook) | 15 min | À faire |
| Phase 3 (API Keys) | 5 min | À faire |
| Phase 4 (Vercel env vars + redeploy) | 15 min | À faire |
| Phase 5 (Supabase secrets) | 10 min | À faire |
| Phase 6 (Pre-flight check) | 5 min | Auto |
| Phase 7 (Test réel + refund) | 20 min | À faire |
| **TOTAL** | **~1h40** | |

Une fois terminé : **tu encaisses des vrais paiements**. Les coachs Founding qui arrivent dans la prochaine heure paient pour de vrai → comptent dans les 30 places.

---

*Runbook généré le 22 mai 2026 par Claude (Opus 4.7) pour Rayan Bonte.*
*Source : `/Users/rayan/fitcoach_updated/STRIPE-GOLIVE-RUNBOOK.md`*
*Audit Stripe complet : commit `4f944d12` + agent Explore.*
