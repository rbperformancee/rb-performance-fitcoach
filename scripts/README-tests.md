# RB Perform — Tests de sante

Script de verification automatique de l'app de A a Z.

## Lancer les tests

```bash
# Test rapide (local + prod)
node scripts/health-check.js

# Avec URL de production custom
node scripts/health-check.js --prod-url=https://rb-perfor.vercel.app

# Mode verbose (detail des erreurs)
node scripts/health-check.js --verbose
```

## Ce qui est teste

Le script teste **8 categories** et affiche pour chacune un log colore :
- `✓` vert = OK
- `✗` rouge = echec
- `⚠` jaune = skip (normal, genre RLS bloque volontairement)

### 1. Supabase — Connectivite
- Ping REST API
- Ping Auth
- Cle ANON presente

### 2. Base de donnees — Tables
Verifie que les 19 tables critiques existent et repondent :
clients, programmes, coaches, super_admins, exercise_logs, session_logs, weight_logs, session_rpe, messages, coach_notes, push_subscriptions, bookings, coach_slots, nutrition_logs, daily_tracking, run_logs, nutrition_goals, client_badges, notification_logs.

### 3. Base de donnees — RLS
- `clients` et `coaches` lisibles en anon (OK apres rollback 006)
- `notification_logs` protege (RLS actif, service_role only)

### 4. Base de donnees — Lecture/Ecriture
- Recupere un client de test
- Lit programmes, daily_tracking, nutrition_logs, weight_logs
- Write + verify + restore sur daily_tracking (eau)

### 5. Super Admin
- rb.performancee@gmail.com est bien enregistre dans `super_admins`
- Row `coaches` existe pour lui
- MRR calculable depuis les abonnements actifs

### 6. APIs & Services externes
- Mistral `/api/voice-analyze`
- Edamam `/api/food-search`
- FAQ `/api/faq-assistant`
- Cron `/api/cron-relance` (manuel)
- Cron `/api/cron-weekly-recap` (manuel)
- Edge Functions Supabase : send-push, send-welcome, stripe-webhook

### 7. Performances
- index.html charge < 2s
- Bundle JS telecharge < 3s
- sw.js accessible (avec version cache)
- manifest.json valide

### 8. Stripe
- Cle publique presente (test ou live)
- API Stripe reachable

## Interpreter les resultats

### Tout vert
```
  12 OK   0 FAIL   0 SKIP   / 12 tests en 2.3s
```
L'app est en bonne sante, tous les systemes repondent.

### Des echecs
```
  10 OK   2 FAIL   0 SKIP

Echecs :
  • Cron relance — SUPABASE_SERVICE_ROLE_KEY manquant dans Vercel env
  • Mistral /api/voice-analyze — API error 500
```

Le script affiche la cause probable. Actions typiques :

| Erreur | Solution |
|--------|----------|
| `SUPABASE_SERVICE_ROLE_KEY manquant` | Ajouter la cle dans Vercel > Settings > Env Variables |
| `API error 500` sur Mistral | Cle `MISTRAL_API_KEY` invalide ou quota depasse |
| `HTTP 401` sur une table | RLS trop restrictif, a verifier |
| `Table absente` | Migration SQL pas executee |
| `Lent: 4500ms` sur bundle | Verifier Vercel CDN, probleme de cache |

### Des skips
Les skips sont normaux quand :
- Une table a RLS actif et pas de donnees visibles en anon (ex: `notification_logs`)
- Un bundle n'est pas detecte dans l'index.html

## Quand lancer le script

- **Avant chaque deploy en prod** : pour ne pas casser l'existant
- **Apres une migration SQL** : verifier que l'app repond toujours
- **Si un user signale un bug** : eliminer les causes systemiques
- **En CI/CD** : `npm run health-check` avec exit code 1 si fail

## Exit codes

- `0` : tous les tests passent
- `1` : un ou plusieurs tests ont echoue
- `2` : erreur fatale du script

## Limitations

Le script **ne teste pas** :
- Les flows UI (login form, onboarding ecran) — faudrait Playwright/Cypress
- Les notifications push reellement recues sur un device
- Le contenu d'un programme specifique
- Stripe webhook (signature requise — test manuel via Stripe CLI)

Pour ces tests-la, utiliser l'app manuellement ou ajouter un framework E2E.
