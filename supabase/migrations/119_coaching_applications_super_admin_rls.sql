-- 119 — Ajoute la policy RLS super_admin sur coaching_applications.
--
-- AVANT cette migration, coaching_applications avait UNIQUEMENT du service_role
-- (cf migration 036 commentaire "service role uniquement"). Conséquence :
-- depuis le CRM (CRMSection.jsx), Rayan ne pouvait ni SELECT ni UPDATE
-- les candidatures, même en étant super_admin. Le SELECT renvoyait
-- silencieusement un array vide.
--
-- Cette migration aligne coaching_applications sur le pattern des tables
-- crm_* (migration 115) : super_admin (email ∈ super_admins) a tous les
-- droits, les autres restent bloqués par RLS.
--
-- Le service_role bypass RLS de toute façon → /api/coaching-application
-- (inserts publics depuis la landing) continue de fonctionner identique.

CREATE POLICY coaching_applications_super_admin
  ON public.coaching_applications
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

COMMENT ON POLICY coaching_applications_super_admin ON public.coaching_applications IS
  'Super admin (Rayan) full access depuis le CRM. Service role bypass RLS donc inserts publics OK.';
