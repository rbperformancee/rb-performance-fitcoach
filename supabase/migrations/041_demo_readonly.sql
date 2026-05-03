-- 041_demo_readonly.sql
-- Verrouille les comptes demo en lecture seule au niveau Postgres (RLS).
--
-- Avant : un attaquant qui s'auto-logge via /demo (compte demo@rbperform.app)
-- ou /demo-client (lucas.demo@rbperform.app) peut faire des INSERT/UPDATE/
-- DELETE qui polluent la base démo pour TOUS les visiteurs suivants. Comme
-- les démos sont publiques, c'est exploitable en boucle (vandalisme,
-- injection de contenu, déformation des stats affichées).
--
-- Maintenant : une fonction `auth.is_demo_user()` retourne TRUE si le JWT
-- email est dans la liste demo. Toutes les policies write des tables
-- sensibles ajoutent un AND NOT auth.is_demo_user() pour bloquer.

BEGIN;

-- =========================================================
-- 1. Fonction helper : auth.is_demo_user()
-- =========================================================
CREATE OR REPLACE FUNCTION auth.is_demo_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() ->> 'email') IN (
    'demo@rbperform.app',
    'lucas.demo@rbperform.app'
  );
$$;

COMMENT ON FUNCTION auth.is_demo_user() IS
  'Renvoie TRUE si le JWT courant correspond à un compte demo (read-only).';

-- =========================================================
-- 2. Tables write-protégées (INSERT/UPDATE/DELETE bloqués pour demo)
-- =========================================================

-- Tables coach-side : ne pas laisser un demo coach modifier sa configuration
-- ou créer/supprimer des programmes/clients (qui pollueraient la démo).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clients', 'programmes', 'coach_notes', 'coach_plans',
    'coach_programme_templates', 'coach_reminders', 'coach_monthly_goals',
    'coach_testimonials', 'coach_invitations', 'coach_messages_flash',
    'invoices', 'client_payments', 'sentinel_cards', 'coaches'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT auth.is_demo_user())',
        'demo_readonly_insert_' || t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT auth.is_demo_user()) WITH CHECK (NOT auth.is_demo_user())',
        'demo_readonly_update_' || t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT auth.is_demo_user())',
        'demo_readonly_delete_' || t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- Tables client-side : même blocage pour les démos client
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'weight_logs', 'exercise_logs', 'nutrition_logs', 'nutrition_goals',
    'run_logs', 'daily_tracking', 'session_completions', 'session_live',
    'session_logs', 'session_rpe', 'weekly_checkins', 'supplement_logs',
    'client_supplements', 'client_goals', 'client_badges',
    'transformation_sessions', 'onboarding_forms', 'programme_overrides',
    'messages', 'push_subscriptions', 'activity_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT auth.is_demo_user())',
        'demo_readonly_insert_' || t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT auth.is_demo_user()) WITH CHECK (NOT auth.is_demo_user())',
        'demo_readonly_update_' || t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT auth.is_demo_user())',
        'demo_readonly_delete_' || t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- Note importante : les policies AS RESTRICTIVE sont AND-ée avec les autres
-- policies (FOR ALL, etc.). Donc même si un coach demo a une policy permissive
-- sur ses propres rows, le RESTRICTIVE bloque les écritures. C'est le bon
-- pattern Postgres pour ce genre de overlay sécurité.

COMMIT;
