-- 101_coaches_stripe_subscription_columns.sql
-- 22 mai 2026 — fix go-live Stripe
--
-- Le webhook /api/webhook-stripe.js écrit ces colonnes lors d'un paiement,
-- mais elles n'existaient pas en prod (migration 020 jamais appliquée +
-- stripe_subscription_id jamais créé).
--
-- Symptômes constatés (paiement live test du 22/05/26 16:00) :
--   [WEBHOOK_COACH_UPSERT_FAILED] Could not find the 'stripe_subscription_id' column
--   [WEBHOOK_SUB_UPDATE_DB_WARN] Could not find the 'stripe_subscription_status' column
--
-- → Coach payant mais ligne `coaches` non créée. Email bienvenue parti
--   quand même (côté Auth) mais le coach ne pourra pas se loginer dans l'app.
--
-- Safe to re-run (IF NOT EXISTS).

-- ===== COLUMNS =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_issue              BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_issue_at           TIMESTAMPTZ;

COMMENT ON COLUMN public.coaches.stripe_subscription_id IS
  'Stripe Subscription ID (sub_xxx). Écrit par webhook checkout.session.completed.';

COMMENT ON COLUMN public.coaches.stripe_subscription_status IS
  'Mirror de Stripe Subscription.status (active, past_due, canceled, incomplete, trialing). MAJ par customer.subscription.updated.';

COMMENT ON COLUMN public.coaches.payment_issue IS
  'true si invoice.payment_failed reçu et pas encore résolu par subscription.updated active. Lu par cron-relance.';

COMMENT ON COLUMN public.coaches.payment_issue_at IS
  'Timestamp du dernier payment_failed. NULL = jamais.';

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS coaches_stripe_subscription_id_idx
  ON public.coaches (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS coaches_stripe_subscription_status_idx
  ON public.coaches (stripe_subscription_status)
  WHERE stripe_subscription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS coaches_payment_issue_idx
  ON public.coaches (payment_issue_at DESC)
  WHERE payment_issue = true;
