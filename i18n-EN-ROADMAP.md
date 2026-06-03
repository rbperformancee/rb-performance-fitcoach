# i18n EN — Roadmap pour vendre à un coach anglophone

État au 3 juin 2026 après session intensive.

## ✅ DONE — Coach EN peut faire son funnel complet

### Découverte (landing)
- ✅ `public/landing.html` — 282 keys bilingues (250 ajoutées cette session)
- ✅ `public/founding.html` — 41 keys bilingues (pré-existant)
- ✅ Toggle FR/EN button top-right des 2 pages
- ✅ `landing-script.js` I18N dict complet

### App athlète iOS
- ✅ 100% bilingue (WeightChart, MovePage, TrainingPage, FuelPage, Profile)
- ✅ Date format locale-aware via `formatDate()` helper
- ✅ 5 EN screenshots App Store 1320×2868

### App coach (web)
- ✅ Date format locale-aware sur 12 fichiers UI
- ✅ Modal delete programme (10 keys)
- ✅ `coach/Onboarding.jsx` — 50 keys (7 steps + erreurs + specialités)
- ✅ `ProgrammeBuilder.jsx` — 38 keys (toolbar + 3 modals critiques)
- ✅ `CoachDashboard.jsx` — 30 keys (daily-view : historique, comparator, calls, sessions)
- ✅ `checkinPeriod.js` — labels fréquences bilingues

### Infrastructure
- ✅ `lib/i18n.js` — `useT()`, `getLocale()`, `setLocale()`, `getDateLocale()`, `formatDate()`, `t()` static
- ✅ Pattern fallback `t(key, FR_fallback)` — zéro régression FR

---

## ⏳ TODO — Reste à faire pour 100% bilingue

### Phase 3b — Coach Dashboard deep (~5h)
- [ ] CoachDashboard.jsx — ~100 strings restantes (logs détaillés, modals secondaires)
- [ ] Programme history detail view, payment modals, slot management
- [ ] Toasts d'erreur Supabase wrapped

### Phase 3c — ProgrammeBuilder content (~4h)
- [ ] Muscle group names (Pectoraux/Épaules/Triceps/Quadriceps/etc.) — décider : i18n ou garder FR comme content
- [ ] Exercise template descriptions ("Pectoraux, épaules, triceps.", etc.)
- [ ] Tooltips secondaires + analytics labels deep

### Phase 3d — Coach polish (~10h)
- [ ] `coach/Settings.jsx` (~60 strings) — branding, plans, billing config
- [ ] `coach/LogPaymentModal.jsx` (~54 strings)
- [ ] `coach/InvoiceModal.jsx` (~22)
- [ ] `coach/MenuGenerator.jsx` (~48)
- [ ] `coach/BulkInviteCSV.jsx`, `BulkWeightImportCSV.jsx` (~50 combined)
- [ ] `coach/DataExportSection.jsx` (~31)
- [ ] `coach/MonCompte.jsx` (~20)
- [ ] `coach/BilanPhysique.jsx` (~21)
- [ ] 14 autres petits composants

### Phase 4 — Compliance (À FAIRE PROPREMENT)
- [ ] PDFs : `invoicePDF.js`, `receiptPDF.js`, `transformationPDF.js`, `exportPDF.js`
  - ⚠️ Garder FR pour clients FR (compliance SARL FR)
  - 🆕 Ajouter version EN pour clients EN — nécessite refacto template
- [ ] Pages légales `LegalPages.jsx`, `PrivacyPolicy.jsx`
  - ⚠️ Droit français → garder FR pour SARL FR
  - 🆕 Créer version EN avec disclaimers UK/US si on cible ces marchés
- [ ] CGU / CGV translation
- [ ] Cookie consent banner (`cookie-consent.js`)

### Phase 5 — SEO international (futur)
- [ ] Pages comparison FR-only (15 fichiers `coach-sportif-{city}.html`)
- [ ] Comparison pages `rb-perform-vs-*.html`
- [ ] Blog FR
- [ ] hreflang tags pour Google
- [ ] Stratégie SEO EN distincte

### Phase 6 — Backend (sécondaire)
- [ ] Email templates (Zoho Mail) — magic link, invitation, weekly digest
- [ ] APNs push notifications copy
- [ ] Webhook responses
- [ ] Stripe Checkout multi-currency (EUR/GBP/USD)

---

## 📊 Stats session 3 juin 2026

| Action | Count |
|---|---|
| Keys i18n ajoutées (FR + EN) | ~370 par locale |
| Fichiers touchés | 18 |
| Commits | 8 |
| Strings UI passées de FR-only à bilingue | ~400 |
| Couverture coach UI avant session | ~30% |
| Couverture coach UI après session | ~55-60% |

## 🎬 Verdict actuel

**Un coach anglophone peut maintenant** :
1. ✅ Découvrir le produit via landing.html EN
2. ✅ Comprendre l'offre Founding via founding.html EN
3. ✅ S'inscrire à la waitlist (form bilingue)
4. ✅ Voir tarifs + features en anglais
5. ✅ Passer l'onboarding coach en anglais (50 keys couvertes)
6. ✅ Utiliser le dashboard daily-view en anglais
7. ✅ Créer un programme via le builder en anglais (top-level UI)
8. ⚠️ Settings / Billing : encore FR (~60 strings)
9. ⚠️ Modals secondaires CoachDashboard : encore FR (~100 strings)
10. ⚠️ Facture PDF : reste FR (compliance SARL FR — by design)

**Funnel-critical = 90% complet**. Polish utility = 50% complet.

## 🚀 Si tu veux finir Phase 3 plus tard

Pattern utilisé : `t("key", "FR_fallback")` — copie le FR existant comme fallback, ajoute la traduction EN dans `src/lib/i18n/en.js` (et FR fallback dans `fr.js`). Le `t()` retourne le fallback si key absente du dict actif (mode graceful).

Pour batch-i18n un nouveau fichier coach :
1. Identifier les strings via `grep -nE '>([A-ZÀ-Ÿ][a-zà-ÿé][^<{]+)<' file.jsx`
2. Créer un dict Python `TRANSLATIONS = [(key, fr, en), ...]`
3. Script de batch replace (cf `/tmp/i18n-cd.py` modèle)
4. Build + verify
5. Append keys aux dicts via le script
