-- 084_carb_cycling.sql
-- Carb cycling : un client peut avoir plusieurs "types de jour" nutrition
-- (ex. High-carb / Low-carb / Repos), chacun avec ses propres macros.
-- Un planning hebdo associe chaque jour de la semaine à un type de jour.
--
-- - nutrition_day_types : les types de jour d'un client (label + macros).
-- - nutrition_goals.carb_cycle_schedule : jsonb { "<weekday>": "<day_type_id>" }
--   où weekday = valeur JS Date.getDay() (0 = dimanche … 6 = samedi).
--   NULL = carb cycling désactivé → on garde l'objectif unique existant.
--
-- Purement additif : nutrition_goals (objectif unique) reste le fallback.
-- RLS calqué sur nutrition_goals (le client + son coach).

CREATE TABLE IF NOT EXISTS public.nutrition_day_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Jour',
  calories integer NOT NULL DEFAULT 2000,
  proteines integer NOT NULL DEFAULT 150,
  glucides integer NOT NULL DEFAULT 250,
  lipides integer NOT NULL DEFAULT 70,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
--@SPLIT@
ALTER TABLE public.nutrition_day_types ENABLE ROW LEVEL SECURITY;
--@SPLIT@
CREATE POLICY nutrition_day_types_client ON public.nutrition_day_types
  FOR ALL
  USING (lower(auth.jwt() ->> 'email') IN (
    SELECT lower(c.email) FROM public.clients c WHERE c.id = nutrition_day_types.client_id))
  WITH CHECK (lower(auth.jwt() ->> 'email') IN (
    SELECT lower(c.email) FROM public.clients c WHERE c.id = nutrition_day_types.client_id));
--@SPLIT@
CREATE POLICY nutrition_day_types_coach ON public.nutrition_day_types
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.coaches co
    JOIN public.clients cl ON cl.coach_id = co.id
    WHERE lower(co.email) = lower(auth.jwt() ->> 'email')
      AND cl.id = nutrition_day_types.client_id))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coaches co
    JOIN public.clients cl ON cl.coach_id = co.id
    WHERE lower(co.email) = lower(auth.jwt() ->> 'email')
      AND cl.id = nutrition_day_types.client_id));
--@SPLIT@
ALTER TABLE public.nutrition_goals ADD COLUMN IF NOT EXISTS carb_cycle_schedule jsonb;
