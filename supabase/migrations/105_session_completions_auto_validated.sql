-- 105_session_completions_auto_validated.sql
-- 24 mai 2026 — Auto-validation des séances oubliées.
--
-- Cf. cas observé Enzo Perez 24/05/26 : 6 exos PUSH loggés sur 1h10 mais
-- aucune session_log/completion validée car le client a oublié de cliquer
-- "Terminer la séance". Le coach ne voit pas la séance comme faite alors
-- qu'elle l'est dans les faits.
--
-- Solution combo (cf. discussion 24/05/26) :
--   1. Côté client : auto-INSERT au unmount TrainingPage si ≥3 exos loggés
--      ET pas de completion (cf. src/components/TrainingPage.jsx)
--   2. Côté serveur : cron 21h UTC quotidien (cron-auto-validate-sessions)
--      → filet de sécurité si le client-side a foiré (PWA crash, network)
--
-- Le flag auto_validated distingue les vrais "fait+validé manuellement" des
-- auto-validations système. Côté coach UI : badge gris "auto" si true.

ALTER TABLE public.session_completions
  ADD COLUMN IF NOT EXISTS auto_validated BOOLEAN NOT NULL DEFAULT false;

--@SPLIT@

COMMENT ON COLUMN public.session_completions.auto_validated IS
  'true = inséré par auto-validation (côté client unmount ou cron serveur), pas par clic "Terminer la séance" du client. Affiché en badge gris discret côté coach.';
