-- 006_coach_weekly_report.sql
-- Colonnes pour le digest hebdomadaire coach (api/cron-coach-weekly-digest.js)
--
-- - weekly_report_enabled : toggle opt-in/out dans Settings coach (actif par defaut)
-- - last_business_score  : score de la semaine precedente, pour calculer le delta

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS weekly_report_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS last_business_score int;

COMMENT ON COLUMN public.coaches.weekly_report_enabled IS
  'Si FALSE, le coach ne recoit pas le digest hebdo email (opt-out depuis Settings).';
COMMENT ON COLUMN public.coaches.last_business_score IS
  'Snapshot du score business lors du dernier envoi de digest. Sert a calculer le delta hebdo.';
