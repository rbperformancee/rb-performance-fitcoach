-- Reminders H-24 et H-2 pour les calls coaching + flow de confirmation
-- anti-no-show (inspiré spec Jonas Rorwick : "le show-up rate se joue
-- entre la prise de RDV et l'appel").
--
-- Avant : le mail de confirmation slot promettait "Reminders J-1 et H-2
-- envoyés auto par le cron" mais le cron n'existait PAS. Promesse cassée.
--
-- Schema additions :
-- - call_confirmed_at  : prospect a cliqué "Je confirme" dans le mail H-24
-- - call_confirm_token : token unique pour le bouton de confirmation
-- - reminder_h24_sent_at / reminder_h2_sent_at : anti-doublon cron

ALTER TABLE public.coaching_applications
  ADD COLUMN IF NOT EXISTS call_confirmed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_confirm_token     TEXT,
  ADD COLUMN IF NOT EXISTS reminder_h24_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_h2_sent_at    TIMESTAMPTZ;

-- Index unique sur le token (non-null only) pour lookup rapide depuis
-- l'URL de confirmation publique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coaching_applications_confirm_token
  ON public.coaching_applications (call_confirm_token)
  WHERE call_confirm_token IS NOT NULL;

-- Index sur (call_scheduled_at, call_outcome) pour le scan rapide du cron
-- qui cherche les calls dans la fenêtre H-24 / H-2 à venir.
CREATE INDEX IF NOT EXISTS idx_coaching_applications_call_scheduled_pending
  ON public.coaching_applications (call_scheduled_at)
  WHERE call_outcome IS NULL OR call_outcome = 'pending';

COMMENT ON COLUMN public.coaching_applications.call_confirmed_at IS
  'Timestamp où le prospect a cliqué sur le bouton "Je confirme" dans le mail H-24. Si NULL = pas encore confirmé. Anti-no-show.';

COMMENT ON COLUMN public.coaching_applications.call_confirm_token IS
  'Token unique random (32 chars) qui sert d''auth au mini-endpoint public /api/coaching-call-confirm?token=xxx. Généré au moment de l''envoi du mail H-24.';

COMMENT ON COLUMN public.coaching_applications.reminder_h24_sent_at IS
  'Anti-doublon cron : si renseigné, le mail H-24 a déjà été envoyé.';

COMMENT ON COLUMN public.coaching_applications.reminder_h2_sent_at IS
  'Anti-doublon cron : si renseigné, le mail H-2 a déjà été envoyé.';
