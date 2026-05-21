-- 100 — Fix les RLS résiduelles + RPC coach_last_logins
--
-- Suite à l'audit du 21/05/26, 3 tables avaient encore des RLS utilisant
-- `coach_id = auth.uid()` ce qui ne marche pas dans ce projet (coaches.id
-- ≠ auth.users.id, le pont passe par email). On utilise les helpers
-- `is_my_coach()` créés dans la migration 099.
--
-- Tables concernées : programme_templates, template_weeks, template_sessions
-- (utilisées par le Programme Builder côté coach).
--
-- Aussi : RPC coach_last_logins (utilisé par SuperAdminDashboard) qui faisait
-- un JOIN coaches c ON c.id = u.id — résultat toujours vide. Fix via email.

-- ===== programme_templates =====
DROP POLICY IF EXISTS "tmpl_coach_all" ON public.programme_templates;
CREATE POLICY "tmpl_coach_all" ON public.programme_templates
  FOR ALL
  USING (public.is_my_coach(coach_id))
  WITH CHECK (public.is_my_coach(coach_id));

-- ===== template_weeks (FK via programme_templates.coach_id) =====
DROP POLICY IF EXISTS "tweek_coach_all" ON public.template_weeks;
CREATE POLICY "tweek_coach_all" ON public.template_weeks
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.programme_templates t
    WHERE t.id = template_weeks.template_id
    AND public.is_my_coach(t.coach_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programme_templates t
    WHERE t.id = template_weeks.template_id
    AND public.is_my_coach(t.coach_id)
  ));

-- ===== template_sessions (FK via template_weeks → programme_templates) =====
DROP POLICY IF EXISTS "tsess_coach_all" ON public.template_sessions;
CREATE POLICY "tsess_coach_all" ON public.template_sessions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.template_weeks w
    JOIN public.programme_templates t ON t.id = w.template_id
    WHERE w.id = template_sessions.week_id
    AND public.is_my_coach(t.coach_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.template_weeks w
    JOIN public.programme_templates t ON t.id = w.template_id
    WHERE w.id = template_sessions.week_id
    AND public.is_my_coach(t.coach_id)
  ));

-- ===== Fix RPC coach_last_logins =====
-- Le JOIN coaches.id = auth.users.id retourne toujours vide.
-- On joint via email à la place.
CREATE OR REPLACE FUNCTION public.coach_last_logins()
RETURNS TABLE (id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Garde super_admin uniquement
  IF NOT EXISTS (
    SELECT 1 FROM public.super_admins sa
    WHERE sa.email = (auth.jwt() ->> 'email')
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT c.id, u.last_sign_in_at
    FROM auth.users u
    JOIN public.coaches c ON c.email = u.email;
END;
$$;
