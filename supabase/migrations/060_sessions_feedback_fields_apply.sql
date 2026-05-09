-- 060_sessions_feedback_fields_apply.sql
-- Re-applique le volet sessions de la migration 056 maintenant que la
-- table public.sessions existe (créée par 059_live_sessions.sql).
-- 056 avait skippé "Table public.sessions absente" car 011_live_sessions
-- n'avait pas été appliqué (conflit avec 011_crm_tags_pipeline).

BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS mood text
    CHECK (mood IS NULL OR mood IN ('great','good','ok','tough','bad'));
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS injury text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS feedback_note text;

COMMIT;
