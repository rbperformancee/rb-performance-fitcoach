-- 067_schema_drift_fix.sql
-- Schema drift sweep avant launch (May 26 2026).
-- Bugs trouvés :
--
--   1. coaches.coaching_name référencé par PublicCoachProfile, ClientApp,
--      JoinPage mais n'existe pas → tous les fallback name affichent NULL
--      ou cassent silencieusement.
--      → Fix : ADD coaching_name SYNC sur brand_name via trigger
--
--   2. coaches.plan référencé par MonCompte.jsx ligne 278 (display plan
--      label) mais le vrai col est subscription_plan.
--      → Fix code seulement (l'autre fix code force déjà subscription_plan)
--
--   3. client_measurements table référencée par ClientHome, ClientSuivi,
--      cron-demo-reset mais la table n'existe pas.
--      → Fix code seulement : remplacer par weight_logs (existe déjà)
--
-- Cette migration ne couvre que (1). (2) et (3) sont fix dans le commit code.

BEGIN;

-- 1. coaching_name : alias en lecture sur brand_name pour rétro-compat
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS coaching_name text;

-- Backfill depuis brand_name (ou full_name si brand_name vide)
UPDATE public.coaches
  SET coaching_name = COALESCE(brand_name, full_name)
  WHERE coaching_name IS NULL;

-- Trigger pour garder coaching_name synchro avec brand_name à chaque update
CREATE OR REPLACE FUNCTION public.sync_coaching_name() RETURNS trigger AS $$
BEGIN
  IF NEW.brand_name IS DISTINCT FROM OLD.brand_name THEN
    NEW.coaching_name := COALESCE(NEW.brand_name, NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coaching_name_sync ON public.coaches;
CREATE TRIGGER coaching_name_sync
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.sync_coaching_name();

COMMIT;
