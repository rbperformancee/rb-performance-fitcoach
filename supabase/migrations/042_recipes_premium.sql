-- 042_recipes_premium.sql
-- =====================================================
-- Premium recipe feature
-- =====================================================
-- Coach upload PDF -> LLM Vision parsing -> ingredient
-- matching against food DB -> coach review -> client adds
-- recipe to meal -> N rows injected in nutrition_logs.
--
-- 6 nouvelles tables :
--   recipes                  : metadata + workflow status
--   recipe_ingredients       : liste structuree avec match food DB
--   recipe_assignments       : coach prescrit recette a client
--   client_recipe_favorites  : favoris cote client
--   recipe_meal_logs         : log "client a ajoute recette X"
--   recipe_audit             : trail des mutations
--
-- Bucket Storage : recipes (prive, signed URLs)
-- RLS : coach read/write own, scope=global lisible par tous,
--       client lit recettes de SON coach + global publiees.
-- Overlay demo (RESTRICTIVE) : meme pattern que 041.

BEGIN;

-- =====================================================
-- 1. recipes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'coach' CHECK (scope IN ('coach', 'global')),
  parent_recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,

  title text NOT NULL,
  slug text,
  description text,
  photo_url text,

  pdf_url text,
  source_origin text,

  servings int NOT NULL DEFAULT 1 CHECK (servings > 0),
  prep_time_min int,
  cook_time_min int,
  difficulty text CHECK (difficulty IN ('facile', 'moyen', 'difficile')),

  meal_types text[] NOT NULL DEFAULT '{}'::text[],
  tags text[] NOT NULL DEFAULT '{}'::text[],
  dietary_flags text[] NOT NULL DEFAULT '{}'::text[],

  macros_per_serving jsonb,
  instructions text,
  notes_coach text,

  parsing_status text NOT NULL DEFAULT 'manual'
    CHECK (parsing_status IN ('pending', 'parsing', 'needs_review', 'published', 'failed', 'manual')),
  parsing_error text,
  parsing_metadata jsonb,
  published_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT recipes_scope_coach_check CHECK (
    (scope = 'coach' AND coach_id IS NOT NULL)
    OR (scope = 'global' AND coach_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS recipes_coach_idx
  ON public.recipes (coach_id, parsing_status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS recipes_scope_idx
  ON public.recipes (scope, parsing_status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS recipes_parent_idx
  ON public.recipes (parent_recipe_id);
CREATE INDEX IF NOT EXISTS recipes_tags_idx
  ON public.recipes USING GIN (tags);
CREATE INDEX IF NOT EXISTS recipes_meal_types_idx
  ON public.recipes USING GIN (meal_types);
CREATE INDEX IF NOT EXISTS recipes_dietary_idx
  ON public.recipes USING GIN (dietary_flags);

-- =====================================================
-- 2. recipe_ingredients
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,

  raw_text text,
  ingredient_name text NOT NULL,
  quantity numeric,
  unit text,

  food_match_source text
    CHECK (food_match_source IN ('local_ciqual', 'edamam', 'openfoodfacts', 'unmatched')),
  food_match_id text,
  food_match_name text,
  match_confidence numeric CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 1)),

  calories numeric,
  proteines numeric,
  glucides numeric,
  lipides numeric,
  fibres numeric,
  sodium numeric,

  coach_overridden boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx
  ON public.recipe_ingredients (recipe_id, position);
CREATE INDEX IF NOT EXISTS recipe_ingredients_low_conf_idx
  ON public.recipe_ingredients (recipe_id)
  WHERE match_confidence IS NOT NULL AND match_confidence < 0.8;

-- =====================================================
-- 3. recipe_assignments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recipe_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  date date,
  meal_type text,
  servings_target numeric NOT NULL DEFAULT 1 CHECK (servings_target > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_assignments_client_idx
  ON public.recipe_assignments (client_id, date);
CREATE INDEX IF NOT EXISTS recipe_assignments_coach_idx
  ON public.recipe_assignments (coach_id, created_at DESC);

-- =====================================================
-- 4. client_recipe_favorites
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_recipe_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS client_recipe_favorites_client_idx
  ON public.client_recipe_favorites (client_id);

-- =====================================================
-- 5. recipe_meal_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recipe_meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  date date NOT NULL,
  meal_type text NOT NULL,
  servings_count numeric NOT NULL DEFAULT 1 CHECK (servings_count > 0),

  recipe_title_snapshot text,
  total_calories numeric,
  total_proteines numeric,
  total_glucides numeric,
  total_lipides numeric,

  nutrition_log_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],

  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS recipe_meal_logs_client_idx
  ON public.recipe_meal_logs (client_id, date);

-- =====================================================
-- 6. recipe_audit
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recipe_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
  actor_email text,
  action text NOT NULL,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_audit_recipe_idx
  ON public.recipe_audit (recipe_id, created_at DESC);

-- =====================================================
-- Triggers updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_recipes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS recipes_updated_at ON public.recipes;
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_recipes_updated_at();

DROP TRIGGER IF EXISTS recipe_ingredients_updated_at ON public.recipe_ingredients;
CREATE TRIGGER recipe_ingredients_updated_at
  BEFORE UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_recipes_updated_at();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.recipes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_recipe_favorites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_meal_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_audit             ENABLE ROW LEVEL SECURITY;

-- ----- recipes -----
DROP POLICY IF EXISTS "recipes_coach_rw" ON public.recipes;
CREATE POLICY "recipes_coach_rw" ON public.recipes
  FOR ALL TO authenticated
  USING (
    coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email'))
  )
  WITH CHECK (
    coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "recipes_global_read" ON public.recipes;
CREATE POLICY "recipes_global_read" ON public.recipes
  FOR SELECT TO authenticated
  USING (
    scope = 'global'
    AND deleted_at IS NULL
    AND parsing_status = 'published'
  );

DROP POLICY IF EXISTS "recipes_client_read_own_coach" ON public.recipes;
CREATE POLICY "recipes_client_read_own_coach" ON public.recipes
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND parsing_status = 'published'
    AND scope = 'coach'
    AND EXISTS (
      SELECT 1 FROM clients cl
      WHERE LOWER(cl.email) = LOWER(auth.jwt()->>'email')
        AND cl.coach_id = recipes.coach_id
    )
  );

-- ----- recipe_ingredients -----
DROP POLICY IF EXISTS "recipe_ingredients_coach_rw" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_coach_rw" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email'))
    )
  );

DROP POLICY IF EXISTS "recipe_ingredients_read" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_read" ON public.recipe_ingredients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.deleted_at IS NULL
        AND r.parsing_status = 'published'
        AND (
          r.scope = 'global'
          OR EXISTS (
            SELECT 1 FROM clients cl
            WHERE LOWER(cl.email) = LOWER(auth.jwt()->>'email')
              AND cl.coach_id = r.coach_id
          )
        )
    )
  );

-- ----- recipe_assignments -----
DROP POLICY IF EXISTS "recipe_assignments_coach" ON public.recipe_assignments;
CREATE POLICY "recipe_assignments_coach" ON public.recipe_assignments
  FOR ALL TO authenticated
  USING (coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email')))
  WITH CHECK (coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email')));

DROP POLICY IF EXISTS "recipe_assignments_client_read" ON public.recipe_assignments;
CREATE POLICY "recipe_assignments_client_read" ON public.recipe_assignments
  FOR SELECT TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = recipe_assignments.client_id
    )
  );

-- ----- client_recipe_favorites -----
DROP POLICY IF EXISTS "client_recipe_favorites_client" ON public.client_recipe_favorites;
CREATE POLICY "client_recipe_favorites_client" ON public.client_recipe_favorites
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = client_recipe_favorites.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = client_recipe_favorites.client_id
    )
  );

DROP POLICY IF EXISTS "client_recipe_favorites_coach_read" ON public.client_recipe_favorites;
CREATE POLICY "client_recipe_favorites_coach_read" ON public.client_recipe_favorites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE LOWER(c.email) = LOWER(auth.jwt()->>'email')
        AND cl.id = client_recipe_favorites.client_id
    )
  );

-- ----- recipe_meal_logs -----
DROP POLICY IF EXISTS "recipe_meal_logs_client" ON public.recipe_meal_logs;
CREATE POLICY "recipe_meal_logs_client" ON public.recipe_meal_logs
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = recipe_meal_logs.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = recipe_meal_logs.client_id
    )
  );

DROP POLICY IF EXISTS "recipe_meal_logs_coach_read" ON public.recipe_meal_logs;
CREATE POLICY "recipe_meal_logs_coach_read" ON public.recipe_meal_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE LOWER(c.email) = LOWER(auth.jwt()->>'email')
        AND cl.id = recipe_meal_logs.client_id
    )
  );

-- ----- recipe_audit (insert via service role uniquement) -----
DROP POLICY IF EXISTS "recipe_audit_coach_read" ON public.recipe_audit;
CREATE POLICY "recipe_audit_coach_read" ON public.recipe_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_audit.recipe_id
        AND r.coach_id IN (SELECT id FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email'))
    )
  );

-- =====================================================
-- Demo readonly overlay : SKIPPED.
-- Sur Supabase hosted, le schema `auth` est owned par supabase_auth_admin,
-- donc on ne peut pas creer auth.is_demo_user() depuis le SQL Editor
-- (role postgres). 041_demo_readonly.sql doit etre applique via la CLI
-- avec les bons privileges. Une fois fait, ajouter l'overlay sur les 6
-- nouvelles tables dans une migration 044 dediee.
-- =====================================================

-- =====================================================
-- Storage : bucket recipes (prive, signed URLs)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipes', 'recipes', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'recipes auth read'
  ) THEN
    CREATE POLICY "recipes auth read" ON storage.objects
      FOR SELECT USING (bucket_id = 'recipes' AND auth.role() = 'authenticated');
  END IF;

  -- Convention de path : recipes/<coach_id>/<recipe_id>/<filename>
  -- Le coach ne peut ecrire que dans son propre dossier.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'recipes coach upload'
  ) THEN
    CREATE POLICY "recipes coach upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'recipes'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'recipes coach update'
  ) THEN
    CREATE POLICY "recipes coach update" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'recipes'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'recipes coach delete'
  ) THEN
    CREATE POLICY "recipes coach delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'recipes'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM coaches WHERE LOWER(email) = LOWER(auth.jwt()->>'email')
        )
      );
  END IF;
END $$;

COMMIT;
