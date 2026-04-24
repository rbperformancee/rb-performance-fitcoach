# RB Perform — Incident Response Runbook

**Dernière mise à jour :** 2026-04-25

Guide opérationnel pour diagnostiquer + résoudre un incident prod. Organisé par symptôme observable depuis l'extérieur.

---

## 📡 Canaux de détection

1. **Sentry** — captures automatiques (frontend + 16 endpoints + 7 crons). Tags: `endpoint`, `stage`, `plan`.
2. **Vercel logs** — `vercel logs --prod --follow` + grep sur les prefixes structurés.
3. **Status page** — https://rbperform.app/status (polling 30 s, public).
4. **Health endpoint** — https://rbperform.app/api/health?deep=1 (JSON pour UptimeRobot / BetterStack).
5. **Stripe Dashboard** — Developers → Events, filtrer sur les `delivery_failed`.

---

## 🚨 Symptôme 1 — "Kevin a payé mais n'a pas reçu d'email"

### Diagnostic rapide (2 min)

```bash
# 1. Le webhook a-t-il été appelé ?
vercel logs --prod --follow | grep "\[webhook\]"

# 2. Chercher l'email de Kevin dans les logs
vercel logs --prod --since 30m | grep -E "Welcome email|WEBHOOK_"

# 3. Vérifier la ligne coaches en base
# → Via Supabase SQL Editor :
# SELECT email, plan, stripe_customer_id, is_active, created_at
# FROM coaches
# WHERE email = 'kevin@...';
```

### Causes possibles

| Signal log | Cause | Résolution |
|---|---|---|
| `WEBHOOK_SIG_INVALID` | Clé `STRIPE_WEBHOOK_SECRET` désynchronisée | Aller sur Stripe → Webhooks → `captivating-voyage` → Afficher clé, la coller dans Vercel env |
| `WEBHOOK_AUTH_FAILED` | Supabase admin.createUser a refusé | Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est la bonne (Dashboard → Settings → API) |
| `WEBHOOK_COACH_UPSERT_FAILED` | RLS ou schema mismatch sur table `coaches` | Vérifier que la ligne existe, checker les colonnes requises |
| `WEBHOOK_RESEND_FAILED` status 401 | Clé Resend invalidée | Regénérer sur resend.com, updater `RESEND_API_KEY` en prod |
| `WEBHOOK_RESEND_FAILED` status 422 | Domaine non vérifié ou email invalide | Vérifier domaine rbperform.com dans Resend dashboard |
| Aucun log `[webhook]` | Stripe tape dans le vide (URL mal configurée) | Stripe Dashboard → Webhooks → vérifier URL = `https://rbperform.app/api/webhook-stripe` (typo "strip" sans "e" fait 404) |

### Workaround pendant le fix

Le magic-link de Supabase est **loggé en clair** dans les logs Vercel :

```bash
vercel logs --prod --since 1h | grep "Password setup link for kevin@"
```

→ Copier le lien, envoyer manuellement par WhatsApp / email.

---

## 🚨 Symptôme 2 — "Landing + founding répondent 500"

### Diagnostic

```bash
curl -I https://rbperform.app/
curl -I https://rbperform.app/founding
```

### Causes

- **Déploiement en erreur** → `vercel ls` ; si dernier statut `Error`, voir build logs.
- **Edge config / env var** manquante dans le dernier deploy.
- **Rollback nécessaire** → `vercel rollback` ou Dashboard → Deployments → redéployer un ancien commit `Ready`.

---

## 🚨 Symptôme 3 — "Waitlist signup form ne capture plus les emails"

### Diagnostic

```bash
# Logs récents
vercel logs --prod --since 1h | grep -E "WAITLIST_|FOUNDING_WAITLIST_"
```

### Patterns attendus

- `[WAITLIST_LOST] db_write_failed` → Supabase write cassé (RLS, schema). Vérifier table `waitlist` existe, upsert OK.
- `[WAITLIST_EMAIL_FAILED]` → Zoho SMTP down. Vérifier `ZOHO_SMTP_PASS` toujours valide.
- `[WAITLIST_NO_TRANSPORT]` → `ZOHO_SMTP_PASS` absent en prod.
- `[WAITLIST_UNCAUGHT]` → erreur inattendue, voir stack dans Sentry.

### UX notes

Le frontend affiche TOUJOURS un message de succès, même sur échec DB/email. Les leads **perdus** sont visibles uniquement dans les logs + Sentry.

---

## 🚨 Symptôme 4 — "/api/health?deep=1 retourne `down`"

### Diagnostic

```bash
curl -s https://rbperform.app/api/health?deep=1 | jq
```

| `checks.supabase` | Action |
|---|---|
| `fail` | Supabase totalement injoignable → Supabase status page, incident Supabase |
| `http_5xx` | Supabase a un incident serveur → attendre, Status Supabase |
| `http_401/404/etc` | Normal (pas une panne, juste unauth) — le probe doit être à jour |

---

## 🚨 Symptôme 5 — "Stripe Customer Portal renvoie `billing_portal_configuration_not_found`"

### Cause

Le portail Customer n'est pas activé côté Stripe Dashboard.

### Fix

https://dashboard.stripe.com → Settings → Billing → Customer portal → **Activate**. Choisir :
- Cancel subscription : immediately or end of period (RB Perform = end of period)
- Update payment method : ✅
- Invoice history : ✅
- Pas de plan change (not supported yet)

---

## 🚨 Symptôme 6 — "Crons ne tournent plus"

### Diagnostic

```bash
# Vercel cron last runs
vercel logs --prod --since 24h | grep -iE "\[CRON_|cron-relance|sentinel-"
```

### Causes

- **`CRON_SECRET`** manquant en env prod → tous les crons répondent 401 et skip.
- **Quota Vercel Hobby** dépassé (Hobby = 2 crons max). Vérifier plan Vercel.
- Dernier déploiement a cassé le cron → vérifier logs Sentry `cron-<name>`.

### Forcer un run manuel (testing)

```bash
curl -s "https://rbperform.app/api/cron-relance" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 🚨 Symptôme 7 — Alertes Sentry volumétriques (spam d'événements)

### Diagnostic

Sentry Dashboard → filtrer par `endpoint` tag. Identifier l'endpoint qui fire en boucle.

### Résolution

- Si c'est un bug → fix + deploy.
- Si c'est un bot qui hammer → vérifier que `secureRequest` est bien en place sur l'endpoint. Augmenter le rate limit si les limites sont trop permissives.
- Si c'est une erreur inoffensive (ex: `AbortError`) → ajouter à la liste `IGNORE` dans `src/lib/sentry.js`.

---

## 🛠 Procédure déploiement d'urgence

```bash
# 1. Identifier le dernier deploy Ready
vercel ls --yes | head -5

# 2. Rollback vers un deploy spécifique
vercel rollback https://rb-perfor-XXXX.vercel.app

# 3. Ou force un rebuild propre (si cache corrompu)
vercel --prod --force --yes
```

---

## 📋 Env vars critiques (prod)

Vérifier périodiquement via `vercel env ls production` :

| Var | Usage | Symptôme si absent |
|---|---|---|
| `STRIPE_SECRET_KEY` | checkout + webhook + billing-portal | FUNCTION_INVOCATION_FAILED (mais lazy-init maintenant → JSON error propre) |
| `STRIPE_WEBHOOK_SECRET` | Valide signatures Stripe | 500 sur webhook |
| `SUPABASE_SERVICE_ROLE_KEY` | Writes admin (crons + webhook) | 401/500 |
| `SUPABASE_URL` | Tout | 500 |
| `RESEND_API_KEY` | Welcome email + digest | Email non envoyé, log `Resend failed` |
| `ZOHO_SMTP_PASS` | Waitlist + send-welcome | Email non envoyé |
| `CRON_SECRET` | Auth des 7 crons | Tous les crons retournent 401 |
| `REACT_APP_SENTRY_DSN` | Captures frontend + backend | Pas d'alerting |

---

## 📞 Contacts escalade

- **Stripe support** : dashboard.stripe.com → Help (premium avec compte payant)
- **Supabase support** : dashboard.supabase.com → Support
- **Vercel support** : vercel.com/help
- **Resend support** : resend.com/support

---

**Ce runbook est vivant.** Ajouter un nouveau symptôme dès qu'un incident réel révèle un gap.
