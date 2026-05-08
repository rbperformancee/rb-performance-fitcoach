-- 046_exercise_logs_sets.sql
-- Avant : exercise_logs stockait UNE ligne par (client, ex_key, date) avec
-- weight = moyenne des séries et reps = reps de la dernière série. Le coach
-- ne pouvait donc voir qu'une seule "série agrégée" — perte massive
-- d'information (pyramide, drop set, échec) qui rend le coaching aveugle.
--
-- Après : on ajoute une colonne `sets` jsonb qui stocke le détail réel,
-- format : [{ "weight": 80, "reps": 10 }, { "weight": 85, "reps": 8 }, ...]
-- Le coach peut afficher chaque série individuellement dans la modale détail.
--
-- Rétro-compat : `weight` et `reps` (texte) restent renseignés (moyenne + last)
-- pour les vieux clients qui ne push pas encore le tableau. Les anciennes
-- lignes ont sets=NULL et le front fallback sur l'affichage agrégé.

BEGIN;

ALTER TABLE public.exercise_logs
  ADD COLUMN IF NOT EXISTS sets jsonb;

COMMENT ON COLUMN public.exercise_logs.sets IS
  'Détail set par set : [{weight: number, reps: number|string}]. NULL pour les anciennes lignes pré-046 — le front fallback sur weight/reps agrégés.';

COMMIT;
