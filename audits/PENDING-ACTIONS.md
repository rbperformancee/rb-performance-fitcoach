# Actions manuelles à faire — pour Rayan

Suivi de ce que tu dois faire toi (hors code), basé sur les audits ULTRA et les fixes pushés.

Coche au fur et à mesure. Mis à jour automatiquement par chaque commit qui ferme un point.

---

## 🔴 Bloquant launch (à faire AVANT le 26 mai)

### Suite aux fixes sécurité (commits `6bfc8da5` + `e4691ef5`)

- [ ] **Vercel Dashboard** → Settings → Environment Variables → DELETE :
  - `REACT_APP_DEMO_EMAIL`
  - `REACT_APP_DEMO_PASSWORD`
- [ ] **Supabase Studio** → Authentication → Users → `demo@rbperform.app` → "Send password recovery" puis change le mot de passe (l'ancien `RBPerform2025!` reste accessible via les CDN cache)
- [ ] **Vercel** → Deployments → trois points → "Redeploy" SANS cache (pour reconstruire le bundle sans la var demo password)

### Recommandé (sécurité solide mais marche aussi sans)

- [ ] **Vercel env** → ajouter `UNSUB_SECRET` = `$(openssl rand -hex 32)` (fallback sur SUPABASE_SERVICE_ROLE_KEY si non set, donc pas urgent — utile si tu rotates le service role plus tard)

---

## 🟠 Décisions stratégiques (impact 10M CA)

### Avant le launch

- [ ] **DÉCISION ICP** — tuer la Méthode RB Perform OU la garder ? L'audit business l'identifie comme manque #1. Si tu kills :
  - Désactiver la rewrite `/candidature` dans `vercel.json`
  - Retirer section 03.D du `legal.html`
  - Archiver `CoachingApplicationLanding.jsx`
  - Une seule offre, une seule story.

### Première semaine

- [ ] **Email lancement dim 4 mai** : script `send-launch-email.js` prêt avec 80 leads. Tester sur ton propre email d'abord (`--dry-run` ou hardcode 1 destinataire), puis lancer dimanche 20h.
- [ ] **Stripe products** : confirmer que les price_id Founding (199€) + Pro/Elite sont bien configurés en prod (pas en test mode).
- [ ] **DNS / domaine** : tout en place, SSL OK, pas de redirect cassé.

---

## 🟡 Post-launch (semaines 2-4)

### Crédibilité fondateur (recommandation business)

- [ ] **LinkedIn fondateur** live + 5 posts founder's journey
- [ ] **3 vidéos témoignage** des 5 Founders (incentive : 1 mois gratuit)
- [ ] **CQP ALS** validé (prévu juin 2026 → mettre à jour bio vitrine + legal.html dès validation)

### Acquisition machine

- [ ] **Analytics** : installer PostHog ou Plausible (sinon tu pilotes à l'aveugle)
- [ ] **1er article SEO** : "Trainerize vs RB Perform — 0% commission change tout"
- [ ] **Sitemap submitted** à Google Search Console

### Compliance ongoing

- [ ] **DMARC durcissement** post-launch (calendrier J+7 / J+14 / J+30 — déjà mémo)
- [ ] **Politique cookies** : vérifier que le banner `cookie-consent.js` bloque réellement les cookies non-essentiels tant que pas accepté

---

## 🟢 Tracking continu

### Suivi paiements (feature livrée commit `6d84084b`)

- [ ] **Migration 039** déjà passée : `client_payments` + RLS ✅
- [ ] **Migration `public_cta_url`** déjà passée ✅
- [ ] Première facturation : tester le flow A (InvoiceModal "marquer encaissée") + B (bouton manuel fiche client) + C (assignation programme)

### Vidéos exos (feature livrée commit `a4c0b9a3`)

- [ ] Filmer + uploader **tes vidéos perso** pour les 17 exos restants (`docs/MISSING-VIDEOS.md`) — le launch peut partir sans, fallback OK
- [ ] Re-vérifier que les fallback URLs externes (creators tiers) sont toujours UP dans 2 semaines

### Vitrine (feature livrée commit `269d439e`)

- [ ] **Migration 010** + colonne `public_cta_url` passées ✅
- [ ] Photo Rayan visible sur `/coach/rayan` (uploadée via UPDATE SQL)
- [ ] Tester preview sociale sur https://opengraph.xyz/url/...

---

## ❌ Items à clarifier avec Rayan (questions ouvertes)

- [ ] **« Stripe 3 » badge** mystérieux : screenshot demandé pour identifier la source
- [ ] **TypeScript ou JSDoc** pour la migration progressive ?
- [ ] **Refacto CoachDashboard.jsx** (3946 lignes) maintenant ou après launch ?
- [ ] **Funding** : bootstrap ou levée pré-seed à 50 clients ?
- [ ] **Hire next** : Sales/Content (recommandé) ou Dev (non recommandé) ?

---

## ⚙ Reste de l'audit sécurité (MOYENS, à traiter ce mois)

- [x] `/api/gdpr-export` étendu à 18 tables coach + 24 tables client (commit `<pending>`)
- [x] `/api/gdpr-delete` créé avec confirmation typée + email post-suppression
- [ ] **MIGRATION 040** à passer dans Supabase Studio :
  ```sql
  -- contenu de supabase/migrations/040_gdpr_deletions.sql
  ```
- [x] Webhook Stripe whitelist `plan` par priceId (price escalation bloquée) ✅
- [x] HTML injection dans email admin waitlist patchée via escHtml ✅
- [ ] **ACTION FONDATEUR** — vérifier les env vars Stripe en prod :
  - `STRIPE_PRICE_FOUNDING` (199€ EUR)
  - `STRIPE_PRICE_FOUNDING_USD` / `_GBP` (multi-currency)
  - `STRIPE_PRICE_PRO` / `_USD` / `_GBP` (si plan Pro live)
  - `STRIPE_PRICE_ELITE` / `_USD` / `_GBP` (si plan Elite live)
  Sans ces vars, le webhook refuse les paiements (sécurité). À configurer dans Vercel env.
- [ ] `cold-outreach.js` permissif sur preview deployments
- [ ] Vue `coaches_public` à créer pour limiter colonnes exposées en anon
- [ ] Mode demo écrivable côté serveur — verrouiller en read-only
- [ ] CSP `unsafe-inline` à durcir
- [ ] X-Powered-By non strippé (cosmétique)
- [ ] 2FA non disponible (post-launch)

---

**Format** : ce fichier est mis à jour à chaque session de fix. Ne le modifie pas à la main — dis-moi quel point tu coches et je le passe à `[x]`.
