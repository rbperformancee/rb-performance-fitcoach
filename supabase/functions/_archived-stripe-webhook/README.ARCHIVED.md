# ⚠️ ARCHIVED — Ne plus déployer

Cette Edge Function était un **doublon** du webhook principal Vercel `/api/webhook-stripe`.

## Pourquoi archivée

Le **22 mai 2026**, lors du go-live Stripe :
- L'Edge Function recevait `401 Unauthorized` sur chaque event
- Cause : `STRIPE_WEBHOOK_SECRET` côté Supabase n'était pas configuré correctement
  pour cet endpoint (chaque endpoint Stripe a son propre `whsec_*`)
- Symptôme : Stripe spam des retries 3 jours

## Décision

Suppression de l'endpoint dans Stripe Dashboard + archivage du code ici.

Le webhook Vercel `/api/webhook-stripe` couvre 100% des besoins :
- checkout.session.completed → création coach
- customer.subscription.updated/deleted → sync plan/status
- invoice.payment_failed → flag payment_issue
- charge.refunded / dispute.* → désactivation coach

## Si besoin de réactiver un jour

1. Renommer le dossier : `_archived-stripe-webhook` → `stripe-webhook`
2. Re-créer l'endpoint webhook dans Stripe Dashboard (whsec dédié)
3. Set `STRIPE_WEBHOOK_SECRET` dans Supabase Edge Function secrets avec le bon `whsec_*`
4. `npx supabase functions deploy stripe-webhook`
