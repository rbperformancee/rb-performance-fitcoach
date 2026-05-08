-- 050_realtime_publication.sql
-- Active Supabase Realtime sur les tables nécessaires pour les flux live
-- du dashboard coach (subscriptions postgres_changes côté client React).
--
-- Sans cette publication, le canal supabase.channel().on(...) se subscribe
-- mais ne reçoit JAMAIS d'events → silently fail. Le coach ne voit pas
-- son client agir en direct.
--
-- Tables ciblées :
-- - coach_activity_log : alimente la timeline + le top dashboard
-- - session_logs       : nouvelle séance validée
-- - exercise_logs      : nouveau set logué
-- - weight_logs        : nouvelle pesée
-- - messages           : chat coach-client
-- - coach_notes        : notes internes
-- - programmes         : upload programme
--
-- ALTER PUBLICATION ... ADD TABLE est idempotent via le DO block (pg_publication_tables).

BEGIN;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'coach_activity_log',
    'session_logs',
    'exercise_logs',
    'weight_logs',
    'messages',
    'coach_notes',
    'programmes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END$$;

COMMIT;
