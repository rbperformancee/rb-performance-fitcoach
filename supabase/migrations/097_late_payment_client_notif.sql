-- 097 — Opt-in: notifier le client en cas d'impayé > 7j
--
-- Par défaut OFF. Le coach garde le contrôle de la relance humaine.
-- Quand ON, le cron sentinel-late-payments envoie aussi un push au client
-- concerné par chaque échéance en retard (en plus du push coach).

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS notify_client_on_late_payment boolean NOT NULL DEFAULT false;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS late_payment_client_message text;

COMMENT ON COLUMN public.coaches.notify_client_on_late_payment IS
  'Si true, le cron sentinel-late-payments envoie un push au client en plus du coach.';

COMMENT ON COLUMN public.coaches.late_payment_client_message IS
  'Template message client (placeholders: {firstName}, {amount}, {days_late}). NULL = default app.';
