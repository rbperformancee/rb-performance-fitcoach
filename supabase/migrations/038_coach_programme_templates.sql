-- =========================================================
-- Coach Programme Templates
-- =========================================================
-- Permet à chaque coach de sauvegarder ses programmes en templates
-- réutilisables. Visible uniquement par le coach proprietaire.
-- Le builder affiche les 5 templates par défaut + les templates perso
-- dans la modal de sélection au mount.

CREATE TABLE IF NOT EXISTS public.coach_programme_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  html_content text NOT NULL,
  weeks_count int,
  sessions_count int,
  exercises_count int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_templates_coach_idx
  ON public.coach_programme_templates(coach_id, created_at DESC);

ALTER TABLE public.coach_programme_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach reads own templates" ON public.coach_programme_templates;
CREATE POLICY "Coach reads own templates" ON public.coach_programme_templates
  FOR SELECT USING (coach_id IN (SELECT id FROM coaches WHERE email = auth.email()));

DROP POLICY IF EXISTS "Coach inserts own templates" ON public.coach_programme_templates;
CREATE POLICY "Coach inserts own templates" ON public.coach_programme_templates
  FOR INSERT WITH CHECK (coach_id IN (SELECT id FROM coaches WHERE email = auth.email()));

DROP POLICY IF EXISTS "Coach updates own templates" ON public.coach_programme_templates;
CREATE POLICY "Coach updates own templates" ON public.coach_programme_templates
  FOR UPDATE USING (coach_id IN (SELECT id FROM coaches WHERE email = auth.email()));

DROP POLICY IF EXISTS "Coach deletes own templates" ON public.coach_programme_templates;
CREATE POLICY "Coach deletes own templates" ON public.coach_programme_templates
  FOR DELETE USING (coach_id IN (SELECT id FROM coaches WHERE email = auth.email()));

CREATE OR REPLACE FUNCTION update_coach_templates_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coach_templates_updated_at ON public.coach_programme_templates;
CREATE TRIGGER coach_templates_updated_at
  BEFORE UPDATE ON public.coach_programme_templates
  FOR EACH ROW EXECUTE FUNCTION update_coach_templates_updated_at();
