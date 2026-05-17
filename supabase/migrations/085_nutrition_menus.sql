-- 085_nutrition_menus.sql
-- Menu type v2 : le coach génère un menu (MenuGenerator) et l'envoie à
-- l'athlète, qui le voit dans sa page Fuel.
--
-- 1 menu actif par client (client_id UNIQUE). payload jsonb = snapshot du
-- menu généré : repas + recette + portions + macros + cible.
-- RLS calqué sur nutrition_day_types / nutrition_goals (le client + son coach).

CREATE TABLE IF NOT EXISTS public.nutrition_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
--@SPLIT@
ALTER TABLE public.nutrition_menus ENABLE ROW LEVEL SECURITY;
--@SPLIT@
CREATE POLICY nutrition_menus_client ON public.nutrition_menus
  FOR ALL
  USING (lower(auth.jwt() ->> 'email') IN (
    SELECT lower(c.email) FROM public.clients c WHERE c.id = nutrition_menus.client_id))
  WITH CHECK (lower(auth.jwt() ->> 'email') IN (
    SELECT lower(c.email) FROM public.clients c WHERE c.id = nutrition_menus.client_id));
--@SPLIT@
CREATE POLICY nutrition_menus_coach ON public.nutrition_menus
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.coaches co
    JOIN public.clients cl ON cl.coach_id = co.id
    WHERE lower(co.email) = lower(auth.jwt() ->> 'email')
      AND cl.id = nutrition_menus.client_id))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coaches co
    JOIN public.clients cl ON cl.coach_id = co.id
    WHERE lower(co.email) = lower(auth.jwt() ->> 'email')
      AND cl.id = nutrition_menus.client_id));
