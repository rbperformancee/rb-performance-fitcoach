-- 058_habits.sql
-- Habit tracker quotidien : le coach assigne 3-5 habitudes custom au client
-- (ex: "8h sommeil", "2L eau", "10 min étirement"). Le client coche chaque
-- jour, l'app track le streak. Engagement les jours OFF (pas de séance).
--
-- Aligné Ekklo "habit tracker" (Pro plan). Différenciateur engagement.
--
-- Tables :
--   habits          : 1 ligne par habitude assignée à un client
--   habit_logs      : 1 ligne par (habit_id, date) quand le client coche
--
-- Le coach créé/edit l'habitude, le client peut SEULEMENT cocher (INSERT
-- habit_logs). Coach peut éditer/désactiver une habitude à tout moment.
--
-- RLS pattern email-based (cf. 030/034).

BEGIN;

-- =========================================================
-- HABITS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Nom court (max 40 char) ex: "8h sommeil", "2L eau"
  name text NOT NULL,
  -- Emoji-like icon (2-letter code) ex: "ZZ" (sommeil), "H2O" (eau), "ST" (stretch)
  icon text,
  -- Couleur d'accent (hex) pour l'UI
  color text DEFAULT '#02d1ba',
  -- Ordre d'affichage (le coach peut réordonner)
  ordre int NOT NULL DEFAULT 0,
  -- Désactivable sans delete (préserve l'historique)
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habits_client_idx
  ON public.habits (client_id, ordre) WHERE active = true;

-- =========================================================
-- HABIT_LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  -- Le client_id est dénormalisé pour simplifier les queries coach + RLS
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);
CREATE INDEX IF NOT EXISTS habit_logs_client_date_idx
  ON public.habit_logs (client_id, date DESC);
CREATE INDEX IF NOT EXISTS habit_logs_habit_idx
  ON public.habit_logs (habit_id, date DESC);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.habits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- HABITS : coach CRUD complet, client SELECT only sur ses propres habits
DROP POLICY IF EXISTS habits_coach_all ON public.habits;
CREATE POLICY habits_coach_all ON public.habits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      JOIN public.clients cl ON cl.coach_id = c.id
      WHERE cl.id = habits.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaches c
      JOIN public.clients cl ON cl.coach_id = c.id
      WHERE cl.id = habits.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  );

DROP POLICY IF EXISTS habits_client_read ON public.habits;
CREATE POLICY habits_client_read ON public.habits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = habits.client_id
        AND LOWER(cl.email) = LOWER(auth.jwt()->>'email')
    )
  );

-- HABIT_LOGS : client INSERT/DELETE sur les siens, coach SELECT
DROP POLICY IF EXISTS habit_logs_client_write ON public.habit_logs;
CREATE POLICY habit_logs_client_write ON public.habit_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = habit_logs.client_id
        AND LOWER(cl.email) = LOWER(auth.jwt()->>'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = habit_logs.client_id
        AND LOWER(cl.email) = LOWER(auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS habit_logs_coach_read ON public.habit_logs;
CREATE POLICY habit_logs_coach_read ON public.habit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      JOIN public.clients cl ON cl.coach_id = c.id
      WHERE cl.id = habit_logs.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  );

-- Realtime publication pour synchro live coach
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.habits';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

COMMIT;
