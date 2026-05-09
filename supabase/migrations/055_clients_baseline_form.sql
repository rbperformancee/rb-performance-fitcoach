-- 055_clients_baseline_form.sql
-- Flag de présentation du formulaire "charges actuelles" (baseline 1RM)
-- au client lors de sa 1ère connexion. Après skip OU submit, le timestamp
-- est posé pour éviter de re-spammer le formulaire à chaque login.
--
-- Le baseline lui-même est stocké dans exercise_logs avec ex_key '_baseline_*'
-- (voir BaselineMaxesForm.jsx). On garde le flag SÉPARÉ pour pouvoir
-- distinguer "skipped" d'un absent (cas où l'utilisateur n'a juste pas
-- encore fini sa 1ère session).

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS baseline_form_shown_at timestamptz;

COMMENT ON COLUMN public.clients.baseline_form_shown_at IS
  'Timestamp d''apparition du formulaire baseline 1RM (squat/bench/dl) au client. NULL = jamais montré → afficher au prochain login.';

COMMIT;
