-- 020_coach_payment_status.sql
-- Adds churn-signal columns populated by api/webhook-stripe.js when Stripe fires
-- invoice.payment_failed or customer.subscription.updated. The webhook tolerates
-- their absence (logs a warning + falls back to Sentry capture), so this migration
-- is purely an upgrade: running it turns graceful-degradation into first-class
-- persistence.
--
-- Apply via:
--   supabase db push       (if using the CLI)
--   OR: paste into Supabase SQL Editor
--
-- Safe to re-run (IF NOT EXISTS).

-- ===== COLUMNS =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS payment_issue            BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_issue_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

COMMENT ON COLUMN public.coaches.payment_issue IS
  'Flipped true by webhook-stripe on invoice.payment_failed; flipped back false on subscription.updated with status=active.';

COMMENT ON COLUMN public.coaches.payment_issue_at IS
  'Timestamp of the most recent payment_failed event. NULL means never.';

COMMENT ON COLUMN public.coaches.stripe_subscription_status IS
  'Mirrors Stripe Subscription.status (active, past_due, canceled, incomplete, etc.). Updated by customer.subscription.updated webhook.';

-- ===== INDEXES =====
-- A dashboard or admin query filtering "coaches at risk" will do:
--   SELECT * FROM coaches WHERE payment_issue = true;
-- Partial index keeps size tiny since only a fraction of coaches will ever be flagged.
CREATE INDEX IF NOT EXISTS coaches_payment_issue_idx
  ON public.coaches (payment_issue_at DESC)
  WHERE payment_issue = true;

CREATE INDEX IF NOT EXISTS coaches_stripe_subscription_status_idx
  ON public.coaches (stripe_subscription_status)
  WHERE stripe_subscription_status IS NOT NULL;

-- ===== RLS note =====
-- No RLS policy changes: these columns inherit whatever row-level policy
-- the `coaches` table already enforces. Coaches can read their own row;
-- the webhook runs with the service_role key and bypasses RLS.
