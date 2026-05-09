-- 056_sessions_feedback_fields.sql
-- Extend sessions ET session_logs avec feedback structuré post-séance.
-- L'app capture déjà rpe_moyen sur sessions (cf. 011), on ajoute :
--   - mood text : ressenti (great|good|ok|tough|bad)
--   - injury text : zone douloureuse (null si rien)
--   - feedback_note text : note libre du client
--
-- Le coach lit depuis session_logs (TrainingPage.handleBilan + lecture
-- CoachDashboard ligne ~1691). SessionTracker (newer flow) écrit dans
-- sessions. Les deux tables doivent porter les fields pour que le coach
-- voie le feedback peu importe le flow client utilisé.
--
-- Pourquoi : différenciateur "data perf" — le coach voit en un coup d'œil
-- si une séance était trop dure ou si le client s'est blessé.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS partout, skip si table absente.

BEGIN;

DO $$
BEGIN
  -- sessions (table 011)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sessions'
  ) THEN
    ALTER TABLE public.sessions
      ADD COLUMN IF NOT EXISTS mood text
        CHECK (mood IS NULL OR mood IN ('great','good','ok','tough','bad'));
    ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS injury text;
    ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS feedback_note text;
  ELSE
    RAISE NOTICE 'Table public.sessions absente — skip volet sessions.';
  END IF;

  -- session_logs (table legacy, pas créée par migration explicite mais
  -- présente sur toutes les instances depuis la migration 005). Toujours
  -- exister vérifié quand même par robustesse.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'session_logs'
  ) THEN
    ALTER TABLE public.session_logs
      ADD COLUMN IF NOT EXISTS rpe int
        CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));
    ALTER TABLE public.session_logs
      ADD COLUMN IF NOT EXISTS mood text
        CHECK (mood IS NULL OR mood IN ('great','good','ok','tough','bad'));
    ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS injury text;
    ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS feedback_note text;
  ELSE
    RAISE NOTICE 'Table public.session_logs absente — skip volet session_logs.';
  END IF;
END$$;

COMMIT;
