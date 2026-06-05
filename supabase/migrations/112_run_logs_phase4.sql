-- 112_run_logs_phase4.sql
-- Phase 4 Run Tracker : HR moyen/max, météo au start, intervals complétés.
--
-- Toutes les colonnes sont nullable — runs existants (Phase 1-3) restent
-- valides. Le coach voit les nouvelles métriques quand elles sont remplies.

ALTER TABLE public.run_logs ADD COLUMN IF NOT EXISTS bpm_avg integer;
ALTER TABLE public.run_logs ADD COLUMN IF NOT EXISTS bpm_max integer;
ALTER TABLE public.run_logs ADD COLUMN IF NOT EXISTS weather jsonb;
ALTER TABLE public.run_logs ADD COLUMN IF NOT EXISTS intervals_completed integer;
ALTER TABLE public.run_logs ADD COLUMN IF NOT EXISTS intervals_total integer;
