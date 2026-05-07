-- 044_recipes_v2.sql
-- =====================================================
-- S2.6 : evolutions du domaine recettes
--   1. typical_weight_g sur aliments_local
--      -> pour convertir "1 banane / 2 oeufs" en grammes auto
--   2. Update RPC match_aliment pour retourner typical_weight_g
--   3. Nouvelle table recipe_plans
--      -> 1 PDF multi-recettes = 1 plan parent + N recettes enfant
--   4. parent_plan_id sur recipes
-- =====================================================

BEGIN;

-- =====================================================
-- 1. typical_weight_g sur aliments_local
-- =====================================================
ALTER TABLE public.aliments_local
  ADD COLUMN IF NOT EXISTS typical_weight_g numeric;

COMMENT ON COLUMN public.aliments_local.typical_weight_g IS
  'Poids moyen d''une piece (ex: 1 banane = 120g, 1 oeuf = 50g). NULL si l''aliment ne se compte pas en pieces.';

-- =====================================================
-- 2. RPC match_aliment v2 (retourne typical_weight_g)
-- =====================================================
DROP FUNCTION IF EXISTS public.match_aliment(vector, float, int);

CREATE OR REPLACE FUNCTION public.match_aliment(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  name text,
  calories numeric,
  proteines numeric,
  glucides numeric,
  lipides numeric,
  fibres numeric,
  typical_weight_g numeric,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.id, a.name,
    a.calories, a.proteines, a.glucides, a.lipides, a.fibres,
    a.typical_weight_g,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.aliments_local a
  WHERE a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =====================================================
-- 3. Table recipe_plans (parent multi-recettes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recipe_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  title text,
  pdf_url text,
  page_count int,
  recipes_extracted int NOT NULL DEFAULT 0,
  parsing_status text NOT NULL DEFAULT 'pending'
    CHECK (parsing_status IN ('pending', 'parsing', 'completed', 'failed')),
  parsing_error text,
  parsing_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_plans_coach_idx
  ON public.recipe_plans (coach_id, created_at DESC);

DROP TRIGGER IF EXISTS recipe_plans_updated_at ON public.recipe_plans;
CREATE TRIGGER recipe_plans_updated_at
  BEFORE UPDATE ON public.recipe_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_recipes_updated_at();

ALTER TABLE public.recipe_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_plans_coach_rw" ON public.recipe_plans;
CREATE POLICY "recipe_plans_coach_rw" ON public.recipe_plans
  FOR ALL TO authenticated
  USING (coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email')))
  WITH CHECK (coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email')));

DROP POLICY IF EXISTS "recipe_plans_client_read" ON public.recipe_plans;
CREATE POLICY "recipe_plans_client_read" ON public.recipe_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients cl
      WHERE LOWER(cl.email) = LOWER(auth.jwt()->>'email')
        AND cl.coach_id = recipe_plans.coach_id
    )
  );

-- =====================================================
-- 4. parent_plan_id sur recipes
-- =====================================================
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS parent_plan_id uuid REFERENCES public.recipe_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recipes_parent_plan_idx
  ON public.recipes (parent_plan_id) WHERE parent_plan_id IS NOT NULL;

COMMIT;
