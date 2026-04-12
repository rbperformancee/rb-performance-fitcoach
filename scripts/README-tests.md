# RB Perform — Tests de sante (A to Z)

Script de verification complete qui teste l'application en 7 categories.

## Lancer les tests

```bash
# Test standard (prod + DB)
node scripts/health-check.js

# URL prod personnalisee
node scripts/health-check.js --prod-url=https://rb-perfor.vercel.app

# Mode verbose (detail des erreurs)
node scripts/health-check.js --verbose
```

## Ce qui est teste (7 sections)

### 1. AUTHENTIFICATION
- Endpoint Auth `/settings` repond (providers configures)
- Magic link OTP send fonctionne
- Super admin enregistre (login super-admin possible)
- Coach enregistre (login coach possible)
- Clients enregistres (login client possible)
- Endpoint logout accessible

### 2. BASE DE DONNEES
- Ping Supabase
- Les **19 tables critiques** existent et repondent :
  clients, programmes, coaches, super_admins, exercise_logs, session_logs,
  weight_logs, session_rpe, messages, coach_notes, push_subscriptions,
  bookings, coach_slots, nutrition_logs, daily_tracking, run_logs,
  nutrition_goals, client_badges, notification_logs
- RLS desactive sur les bonnes tables (clients, coaches en lecture anon)
- RLS actif sur notification_logs (protege)
- Lecture + ecriture + restore sur **daily_tracking** (eau_ml)
- Insert + delete sur **nutrition_logs**
- Lecture + update sur **programmes**

### 3. FLOW CLIENT
- Clients avec `onboarding_done=false` existent (OnboardingFlow s'affiche)
- Clients avec `onboarding_done=true` existent (App normale)
- Client sans programme actif → TrainLocked
- Client avec programme actif → TrainingPage (html_content present)
- Countdown programme (programme_start_date futur)
- Signature programme (programme_accepted_at)
- Persistance eau (`daily_tracking.eau_ml`)
- Persistance sommeil (`daily_tracking.sommeil_h`)
- Persistance poids (`weight_logs`)
- Persistance nutrition (`nutrition_logs`)
- Persistance seances (session_logs + exercise_logs)

### 4. FLOW COACH
- Dashboard coach charge les clients du coach (filtre coach_id)
- Panel client — donnees enrichies (logs + rpe + weights)
- Upload programme — schema valide (toutes colonnes accessibles)
- Suppression programme ne remet pas onboarding_done a false
- Date expiration abonnement (subscription_end_date)
- Coach notes incluent coach_id (multi-tenant)
- Bookings + coach_slots accessibles

### 5. SUPER ADMIN
- Dashboard CEO exclusif a `rb.performancee@gmail.com`
- Coach row existe pour super admin (toggle fonctionne)
- MRR calcule depuis les abonnements actifs
- ARR = MRR × 12
- Retention = actifs / total
- Toggle Coach/SuperAdmin (les 2 rows existent)

### 6. API ET SERVICES EXTERNES
- Supabase ping (< 500ms ideal)
- Stripe API reachable
- Stripe webhook Edge Function deployee
- Stripe public key configuree (mode TEST ou LIVE)
- Mistral `/api/voice-analyze` repond avec ingredients
- Mistral `/api/faq-assistant` repond
- Edamam `/api/food-search` repond
- Edge Functions deployees : send-push, send-welcome
- Push notifications — VAPID configuree dans sw.js
- Push subscriptions table accessible
- Cron `/api/cron-relance` (necessite SUPABASE_SERVICE_ROLE_KEY)
- Cron `/api/cron-weekly-recap`

### 7. PERFORMANCES
- Premiere page chargee en moins de 2s
- Bundle JS telecharge en moins de 3s
- Service worker actif (sw.js valide)
- manifest.json valide (nom + icons)
- CSS bundle accessible
- Icons PWA (192 + 512) accessibles

## Legende

- `✅` vert — test passe
- `❌` rouge — test echoue (action requise)
- `⚠` jaune — test skipe (normal : donnees insuffisantes ou RLS volontaire)

## Interpretation des erreurs communes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Legacy API keys are disabled` | Cle service_role Vercel au format JWT ancien | Regenerer la cle dans Supabase > Settings > API (format `sb_secret_*`), mettre a jour dans Vercel env vars |
| `HTTP 401/403` sur table | RLS actif sans policy | Desactiver RLS ou ajouter policy (cf migration 006) |
| `Table absente` | Migration SQL non executee | Executer la migration concernee dans Supabase SQL Editor |
| `HTTP 500` sur /api/voice-analyze | `MISTRAL_API_KEY` manquante ou expire | Renouveler la cle dans Vercel env vars |
| `HTTP 500` sur /api/food-search | `EDAMAM_APP_ID`/`EDAMAM_APP_KEY` manquants | Ajouter dans Vercel env vars |
| `Lent: 2500ms` sur premiere page | CDN Vercel froid ou latence | Verifier Vercel dashboard, redeployer |
| Aucun super admin configure | Table super_admins vide | Inserer row dans SQL : `INSERT INTO super_admins (email) VALUES ('...')` |

## Quand lancer ce script

- **Avant chaque deploy en prod** — eviter de casser l'existant
- **Apres une migration SQL** — verifier que l'app repond toujours
- **Quand un utilisateur signale un bug** — eliminer les causes systemiques
- **Apres avoir change les env vars Vercel** — verifier que les APIs repondent
- **En CI/CD** — ajouter `node scripts/health-check.js` qui exit 1 si fail

## Exit codes

- `0` — tous les tests passent
- `1` — au moins un test a echoue
- `2` — erreur fatale du script

## Limites

Ce script **ne teste pas** les UI flows (boutons, navigation, formulaires) — pour ca, il faudrait Playwright ou Cypress. Les tests data-level couvrent les prerequis necessaires pour que ces flows fonctionnent.

Il **ne teste pas non plus** le flow Stripe checkout end-to-end (signature requise) ni la reception effective de push notifications sur un device.
