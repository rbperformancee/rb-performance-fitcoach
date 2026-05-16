-- 081_coach_last_logins.sql
-- Le SuperAdminDashboard veut afficher la dernière connexion d'un coach.
-- auth.users.last_sign_in_at est maintenu par Supabase mais n'est pas
-- lisible via PostgREST. Cette fonction SECURITY DEFINER l'expose —
-- UNIQUEMENT aux super admins (gate interne), et seulement pour les
-- comptes coach.
--
-- Purement additif : ne modifie aucune table, policy ni fonction
-- existante. Un non-super-admin reçoit un résultat vide.

CREATE OR REPLACE FUNCTION public.coach_last_logins()
RETURNS TABLE (id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Gate super-admin : sinon résultat vide (jamais d'erreur).
  IF NOT EXISTS (
    SELECT 1 FROM public.super_admins sa
    WHERE sa.email = (auth.jwt() ->> 'email')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT u.id, u.last_sign_in_at
    FROM auth.users u
    JOIN public.coaches c ON c.id = u.id;
END;
$$;

-- N'autoriser l'exécution qu'aux utilisateurs authentifiés (le gate
-- interne filtre ensuite les non-admins). Jamais à anon.
REVOKE ALL ON FUNCTION public.coach_last_logins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_last_logins() TO authenticated;
