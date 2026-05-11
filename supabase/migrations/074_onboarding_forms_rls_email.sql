-- Fix RLS onboarding_forms : pattern email + uid (au lieu de uid seul).
--
-- Policy actuelle (migration 034) : `auth.uid()::text = client_id::text`.
-- Casse pour les clients invités via /join dont clients.id a été généré
-- AVANT la création de leur auth.users (donc clients.id ≠ auth.uid).
-- Pour Léo : son ClientFirstLoginFlow → upsert onboarding_forms → 42501
-- "violates row-level security policy".
--
-- Fix : pattern (uid match OR email match), même style que weight_logs (030)
-- et clients (005). Marche pour TOUS les clients (id-linked ET email-linked).

DROP POLICY IF EXISTS onboarding_forms_client ON public.onboarding_forms;
CREATE POLICY onboarding_forms_client ON public.onboarding_forms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = onboarding_forms.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = onboarding_forms.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  );
