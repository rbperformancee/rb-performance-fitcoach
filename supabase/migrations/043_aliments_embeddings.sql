-- 043_aliments_embeddings.sql
-- =====================================================
-- pgvector + aliments_local table for semantic ingredient
-- matching during recipe parsing (S2 of premium recipes).
--
-- Workflow :
--   1. LOCAL_FOODS (456 entrees CIQUAL client-side) sont seedees
--      en Postgres via scripts/seed-aliments-embeddings.mjs
--   2. Chaque ingredient extrait par le parser LLM est embeddee
--      (openai/text-embedding-3-small, 1536 dims)
--   3. Recherche cosine via match_aliment() RPC
--   4. Score de confiance retourne au coach pour validation manuelle
--      si < 0.8

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.aliments_local (
  id text PRIMARY KEY,
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  calories numeric,
  proteines numeric,
  glucides numeric,
  lipides numeric,
  fibres numeric,
  sodium numeric,
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  embedding vector(1536),
  embedding_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- HNSW index pour cosine similarity (recherche premium rapide)
CREATE INDEX IF NOT EXISTS aliments_local_embedding_idx
  ON public.aliments_local
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS aliments_local_keywords_idx
  ON public.aliments_local USING GIN (keywords);

CREATE INDEX IF NOT EXISTS aliments_local_name_trgm_idx
  ON public.aliments_local USING GIN (name gin_trgm_ops);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_aliments_local_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS aliments_local_updated_at ON public.aliments_local;
CREATE TRIGGER aliments_local_updated_at
  BEFORE UPDATE ON public.aliments_local
  FOR EACH ROW EXECUTE FUNCTION public.update_aliments_local_updated_at();

-- RPC : recherche cosine + filtre seuil
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
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.id, a.name,
    a.calories, a.proteines, a.glucides, a.lipides, a.fibres,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.aliments_local a
  WHERE a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RLS : lecture publique (food DB), ecriture service-role uniquement
ALTER TABLE public.aliments_local ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aliments_local_read_all" ON public.aliments_local;
CREATE POLICY "aliments_local_read_all" ON public.aliments_local
  FOR SELECT TO authenticated, anon USING (true);

-- (Pas de policy INSERT/UPDATE/DELETE : service-role uniquement via seed script)

COMMIT;
