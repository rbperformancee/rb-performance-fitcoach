-- 086_bilan_physique.sql
-- Bilan physique enrichi.
--
-- 1. weekly_checkins : photos de progression (jsonb [{pose,url}]) +
--    annotation coach (commentaire, statut, date de revue).
-- 2. clients.checkin_measurements_enabled : le coach décide si on demande
--    les mensurations dans le bilan hebdo. OFF par défaut — pour beaucoup
--    de clients le poids + les photos (miroir) suffisent.
-- 3. Policy UPDATE coach sur weekly_checkins (annotation des bilans).

ALTER TABLE public.weekly_checkins ADD COLUMN IF NOT EXISTS photos jsonb;
--@SPLIT@
ALTER TABLE public.weekly_checkins ADD COLUMN IF NOT EXISTS coach_comment text;
--@SPLIT@
ALTER TABLE public.weekly_checkins ADD COLUMN IF NOT EXISTS coach_status text;
--@SPLIT@
ALTER TABLE public.weekly_checkins ADD COLUMN IF NOT EXISTS coach_reviewed_at timestamptz;
--@SPLIT@
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS checkin_measurements_enabled boolean NOT NULL DEFAULT false;
--@SPLIT@
DROP POLICY IF EXISTS weekly_checkins_coach_update ON public.weekly_checkins;
--@SPLIT@
CREATE POLICY weekly_checkins_coach_update ON public.weekly_checkins
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.coaches c
    JOIN public.clients cl ON cl.coach_id = c.id
    WHERE cl.id = weekly_checkins.client_id
      AND ((auth.uid())::text = (c.id)::text
        OR lower(auth.jwt() ->> 'email') = lower(c.email))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coaches c
    JOIN public.clients cl ON cl.coach_id = c.id
    WHERE cl.id = weekly_checkins.client_id
      AND ((auth.uid())::text = (c.id)::text
        OR lower(auth.jwt() ->> 'email') = lower(c.email))));
