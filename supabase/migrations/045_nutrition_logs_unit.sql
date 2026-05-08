-- 045_nutrition_logs_unit.sql
-- Ajoute la colonne `unit` à nutrition_logs pour distinguer les liquides (ml)
-- des solides (g). Avant cette migration, tout était implicitement en grammes,
-- ce qui affichait "330g" pour un Coca au lieu de "330ml".
--
-- La colonne `quantite_g` n'est PAS renommée (trop d'usages dans le code) :
-- elle stocke la quantité numérique, et `unit` dit ce que cette quantité
-- représente. Default 'g' rétro-compatible.

BEGIN;

ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'g';

-- Check constraint en CONSTRAINT séparé pour éviter le ALTER si elle existe déjà.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nutrition_logs_unit_check'
  ) THEN
    ALTER TABLE public.nutrition_logs
      ADD CONSTRAINT nutrition_logs_unit_check
      CHECK (unit IN ('g', 'ml'));
  END IF;
END$$;

COMMENT ON COLUMN public.nutrition_logs.unit IS
  'Unité de la quantité (g pour solide, ml pour boisson). Default g pour rétro-compat.';

COMMIT;
