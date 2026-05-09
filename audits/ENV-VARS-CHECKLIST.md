# Env Vars Checklist (Vercel Production)

Audit complet des `process.env.*` référencés dans le code. À vérifier dans Vercel **Project Settings → Environment Variables → Production**.

## 🔴 CRITIQUES (l'app crash sans)

| Var | Usage | Côté |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | Connexion DB depuis le bundle JS | Frontend |
| `REACT_APP_SUPABASE_ANON_KEY` | Clé publique RLS-safe | Frontend |
| `SUPABASE_URL` | Backend API routes | Backend (api/) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role pour bypass RLS dans crons | Backend |
| `CRON_SECRET` | Auth Bearer tous les crons Vercel | Backend |

## 🟡 FEATURES (cassées sans, mais l'app marche)

### Emails (Resend)
- `RESEND_API_KEY` — welcome drip, weekly recap, coach digest, send-invite
- `EMAIL_FROM` — `RB Perform <noreply@rbperform.app>` (default safe)

### Push notifications
- `REACT_APP_VAPID_PUBLIC_KEY` — abonnement push côté client (sinon usePushNotifications throw)
- VAPID PRIVATE côté Supabase Edge Function `send-push` (à vérifier dans Supabase secrets, pas Vercel)

### Stripe (paiements coach SaaS)
- `STRIPE_SECRET_KEY` — backend
- `STRIPE_WEBHOOK_SECRET` — vérification signature
- `STRIPE_PRICE_PRO` (+ `_GBP`, `_USD`)
- `STRIPE_PRICE_ELITE` (+ `_GBP`, `_USD`)
- `STRIPE_PRICE_FOUNDING` (+ `_GBP`, `_USD`)

### Sentinel IA (Pro/Elite)
- `MISTRAL_API_KEY` — optionnel, fallback data-driven si absent
- `MISTRAL_DAILY_BUDGET_USD` — default 50, kill-switch coût
- `MISTRAL_ALERT_EMAIL` — notif si budget atteint

## 🟢 OPTIONNELS (telemetry, legacy)

- `REACT_APP_SENTRY_DSN` — erreurs frontend
- `SENTRY_DSN` — erreurs backend
- `REACT_APP_RELEASE` — version tracking Sentry
- `UNSUB_SECRET` — signing des liens d'unsubscribe email
- `EDAMAM_APP_ID` / `EDAMAM_APP_KEY` — nutrition recipes (probablement obsolète)
- `ZOHO_SMTP_USER` / `ZOHO_SMTP_PASS` — legacy email (Resend l'a remplacé)
- `RECIPE_ADMIN_EMAILS` — allowlist admin recettes
- `NEXT_PUBLIC_SITE_URL` — fallback siteUrl côté front

## ⚙️ Auto-injectées par Vercel (rien à faire)

- `VERCEL_ENV`, `VERCEL_REGION`, `VERCEL_GIT_COMMIT_SHA`, `NODE_ENV`

## Vérification rapide

Pour chaque var critique, dans le terminal Vercel CLI :

```bash
vercel env ls production | grep -E "SUPABASE|RESEND|CRON_SECRET|STRIPE_SECRET|VAPID"
```

Si une manque → `vercel env add NAME production`.
