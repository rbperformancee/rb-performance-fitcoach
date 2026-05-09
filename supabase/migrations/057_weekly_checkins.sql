-- 057_weekly_checkins.sql
-- Bilan hebdomadaire structuré du client : poids + mensurations + ressenti.
-- Permet au coach d'avoir des données structurées vs juste un chat — c'est
-- ce qu'Ekklo appelle "recurring questionnaires".
--
-- Cron `cron-weekly-checkin-prompt` envoie une push notif chaque dimanche
-- soir au client → deep link vers le formulaire (30s à remplir).
--
-- UNIQUE (client_id, week_start) : un bilan par semaine. Si le client
-- soumet 2x, on UPSERT (le coach voit toujours la dernière version).
--
-- RLS pattern email-based identique aux autres tables coach (cf. 030).

BEGIN;

CREATE TABLE IF NOT EXISTS public.weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Lundi de la semaine concernée (ISO week start). Le client peut soumettre
  -- jusqu'au mardi suivant pour la semaine précédente sans frustration.
  week_start date NOT NULL,
  -- Mesures (toutes optionnelles — le client remplit ce qu'il veut)
  weight numeric(5,2),
  waist_cm numeric(5,1),
  hips_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  thigh_cm numeric(5,1),
  -- Ressenti hebdo 1-5 (1=très mauvais, 5=excellent)
  energy_level int CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 5)),
  sleep_quality int CHECK (sleep_quality IS NULL OR (sleep_quality >= 1 AND sleep_quality <= 5)),
  stress_level int CHECK (stress_level IS NULL OR (stress_level >= 1 AND stress_level <= 5)),
  motivation_level int CHECK (motivation_level IS NULL OR (motivation_level >= 1 AND motivation_level <= 5)),
  -- Note libre du client au coach
  note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_checkins_client_idx
  ON public.weekly_checkins (client_id, week_start DESC);

ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

-- Client : CRUD sur ses propres checkins
DROP POLICY IF EXISTS weekly_checkins_client_all ON public.weekly_checkins;
CREATE POLICY weekly_checkins_client_all ON public.weekly_checkins
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = weekly_checkins.client_id
        AND LOWER(cl.email) = LOWER(auth.jwt()->>'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = weekly_checkins.client_id
        AND LOWER(cl.email) = LOWER(auth.jwt()->>'email')
    )
  );

-- Coach : SELECT sur les checkins de ses clients
DROP POLICY IF EXISTS weekly_checkins_coach_read ON public.weekly_checkins;
CREATE POLICY weekly_checkins_coach_read ON public.weekly_checkins
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      JOIN public.clients cl ON cl.coach_id = c.id
      WHERE cl.id = weekly_checkins.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  );

-- Realtime publication pour que le coach voit les bilans live
-- (pattern migration 050)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_checkins';
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- déjà publié
    END;
  END IF;
END$$;

COMMIT;
