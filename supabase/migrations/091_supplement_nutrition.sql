-- 091_supplement_nutrition.sql
-- Compléments « intelligents » : un complément qui porte des macros (whey,
-- gainer, barre protéinée…) alimente automatiquement la nutrition du jour
-- quand le client le coche « pris ». Les vrais compléments (créatine,
-- vitamines…) restent une simple checklist d'observance.
--
-- client_supplements : macros par portion + flag counts_nutrition.
-- nutrition_logs.supplement_id : lien vers le complément source → permet de
-- retirer la ligne nutrition quand le client décoche.

ALTER TABLE public.client_supplements ADD COLUMN IF NOT EXISTS counts_nutrition boolean NOT NULL DEFAULT false;
--@SPLIT@
ALTER TABLE public.client_supplements ADD COLUMN IF NOT EXISTS serving_g numeric;
--@SPLIT@
ALTER TABLE public.client_supplements ADD COLUMN IF NOT EXISTS kcal numeric;
--@SPLIT@
ALTER TABLE public.client_supplements ADD COLUMN IF NOT EXISTS proteines numeric;
--@SPLIT@
ALTER TABLE public.client_supplements ADD COLUMN IF NOT EXISTS glucides numeric;
--@SPLIT@
ALTER TABLE public.client_supplements ADD COLUMN IF NOT EXISTS lipides numeric;
--@SPLIT@
ALTER TABLE public.nutrition_logs ADD COLUMN IF NOT EXISTS supplement_id uuid;
