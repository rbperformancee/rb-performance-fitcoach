-- 053_invitations_rls_fix.sql
-- Même bug que client_payments / invoices (cf. migration 047) : la policy
-- créée dans 013 utilise coach_id = auth.uid(), mais coaches.id !=
-- auth.uid() puisque coaches est une table à part entière avec son propre
-- gen_random_uuid(). Tous les INSERT/SELECT depuis le front coach étaient
-- bloqués silencieusement par RLS — le single-invite ne marchait que par
-- chance pour le seed initial où Rayan a un coach_id == auth.uid() legacy.
--
-- Fix : pattern email/uid utilisé partout depuis la 034.

BEGIN;

DROP POLICY IF EXISTS invitations_coach_all ON public.invitations;
CREATE POLICY invitations_coach_all ON public.invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = invitations.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = invitations.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  );

COMMIT;
