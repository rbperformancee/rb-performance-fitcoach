-- 047_client_payments_rls_fix.sql
-- BUG : la migration 039 a créé client_payments avec une policy RLS
--   USING (coach_id = auth.uid())
-- MAIS coaches.id est généré via gen_random_uuid() indépendamment de
-- auth.users.id (cf. migration 001). Donc coaches.id != auth.uid() pour
-- TOUS les coachs créés via la flow normale → INSERT et SELECT bloqués
-- silencieusement avec "row-level security policy violation".
--
-- Le pattern correct (utilisé partout depuis migration 034) est :
--   auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email
--
-- On drop et recrée la policy. Pareil pour la policy invoices qui a le
-- même bug (migration 018 ligne 26).

BEGIN;

-- ===== client_payments =====
DROP POLICY IF EXISTS payments_coach_all ON public.client_payments;
CREATE POLICY payments_coach_all ON public.client_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = client_payments.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = client_payments.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  );

-- ===== invoices (même bug, migration 018) =====
DROP POLICY IF EXISTS coach_own_invoices ON public.invoices;
CREATE POLICY coach_own_invoices ON public.invoices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = invoices.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = invoices.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  );

COMMIT;
