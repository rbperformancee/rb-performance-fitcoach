-- 092_session_completions_programme_id.sql
-- File d'attente de blocs (clients 12 mois) : un coach prépare 3 blocs de
-- 4 semaines à l'avance, chacun un `programmes` séparé avec un published_at
-- échelonné. Le bloc « actif » = celui dont published_at est le plus récent
-- parmi ceux <= maintenant.
--
-- Problème : session_completions n'est scopé que par (client_id, week_idx,
-- session_idx). Le bloc 2 commence aussi à la semaine 0 → ses validations
-- se confondraient avec celles du bloc 1. On ajoute programme_id pour
-- distinguer les blocs. NULL = lignes legacy (ancien programme unique).

ALTER TABLE public.session_completions ADD COLUMN IF NOT EXISTS programme_id uuid;
