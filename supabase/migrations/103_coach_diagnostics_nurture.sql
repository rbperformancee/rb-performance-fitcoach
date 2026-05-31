-- 103_coach_diagnostics_nurture.sql
-- 23 mai 2026 — Tracking idempotence séquence email nurture post-diagnostic.
--
-- Le cron api/cron-diagnostic-nurture.js envoie un rappel J+3 (et J+7 plus tard)
-- aux leads qui ont fait le diagnostic mais n'ont pas converti. On track ici
-- pour ne jamais envoyer 2 fois le même mail à la même personne.
--
-- Pourquoi pas dans auth.users.app_metadata comme cron-launch-reminder ?
-- → Les leads diagnostic n'ont PAS de compte auth (lead magnet pré-signup).
--   Donc on doit tracker dans coach_diagnostics lui-même.

ALTER TABLE public.coach_diagnostics
  ADD COLUMN IF NOT EXISTS nurture_j3_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nurture_j7_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_to_founding BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_at         TIMESTAMPTZ;

--@SPLIT@

COMMENT ON COLUMN public.coach_diagnostics.nurture_j3_sent_at IS
  'Timestamp du mail nurture J+3 envoyé. NULL = jamais envoyé. Anti-double-envoi.';

--@SPLIT@

COMMENT ON COLUMN public.coach_diagnostics.nurture_j7_sent_at IS
  'Timestamp du mail nurture J+7 envoyé. NULL = jamais envoyé. (V2, non implémenté V1.)';

--@SPLIT@

COMMENT ON COLUMN public.coach_diagnostics.converted_to_founding IS
  'True si l''email du lead apparaît dans coaches.subscription_plan=founding APRÈS son diagnostic. MAJ par cron.';

--@SPLIT@

-- Index pour la query du cron (cherche les leads à nurturer J+3)
CREATE INDEX IF NOT EXISTS coach_diagnostics_nurture_j3_idx
  ON public.coach_diagnostics (created_at)
  WHERE nurture_j3_sent_at IS NULL;
