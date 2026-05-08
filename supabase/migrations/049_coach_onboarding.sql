-- 049_coach_onboarding.sql
-- Onboarding premium pour les nouveaux coachs après paiement Stripe.
-- Une fois complété, le timestamp onboarding_completed_at gate le modal.
-- Re-show possible via reset (Settings > Re-faire l'onboarding) en utility.

BEGIN;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'welcome';

COMMENT ON COLUMN public.coaches.onboarding_completed_at IS
  'Timestamp de complétion onboarding. NULL = onboarding pas fait → modal s''affiche au login.';
COMMENT ON COLUMN public.coaches.onboarding_step IS
  'Step actuel pour reprise : welcome | brand | push | programme | client | done.';

COMMIT;
