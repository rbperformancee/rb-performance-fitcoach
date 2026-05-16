-- 080_super_admin_dashboard_rls.sql
-- Le SuperAdminDashboard ("Cockpit CEO") lit coaches/clients/programmes/logs
-- via le client supabase-js → soumis au RLS. Or il n'existait AUCUNE policy
-- super-admin sur ces tables : le super admin ne voyait que sa propre fiche
-- coach + les coachs à profil public. Symptôme : un coach créé hors Stripe
-- (ex. Kévin, Pioneer #1) n'apparaît jamais dans le cockpit.
--
-- Fix : policy SELECT super-admin sur les 9 tables lues par le dashboard.
-- Purement additif (les policies RLS sont en OR) → n'enlève aucun accès,
-- ne concerne que les emails présents dans super_admins.
-- Pattern aligné sur les policies existantes (payments_admin_read, etc.).

BEGIN;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'coaches', 'clients', 'programmes', 'session_logs', 'weight_logs',
    'run_logs', 'exercise_logs', 'nutrition_logs', 'push_subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_super_admin_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      || 'USING (EXISTS (SELECT 1 FROM public.super_admins sa '
      || 'WHERE sa.email = (auth.jwt() ->> ''email'')))',
      t || '_super_admin_read', t
    );
  END LOOP;
END $$;

COMMIT;
