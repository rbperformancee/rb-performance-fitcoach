-- 051_coaches_preferred_template.sql
-- Plusieurs colonnes manquantes sur coaches qui faisaient échouer
-- silencieusement l'onboarding :
--
-- 1. first_name / last_name : écrits par Onboarding step 1 (saveIdentity)
--    depuis le départ mais jamais ajoutés en migration → step 1 throw.
--    Pré-existait avant cette session — bug silencieux.
-- 2. specialties text[] : pareil, écrit par step 1.
-- 3. preferred_template : ajouté par le nouveau step 4 (templates PPL/FB/PL/HY).

BEGIN;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS first_name          text,
  ADD COLUMN IF NOT EXISTS last_name           text,
  ADD COLUMN IF NOT EXISTS specialties         text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_template  text;

COMMENT ON COLUMN public.coaches.preferred_template IS
  'Template programme choisi pendant l''onboarding : ppl | fullbody | powerlift | hybrid. NULL si skipped.';
COMMENT ON COLUMN public.coaches.specialties IS
  'Liste des spécialités sélectionnées pendant l''onboarding (Musculation, Force, etc.). Affichée sur la vitrine publique du coach.';

COMMIT;
