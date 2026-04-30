-- =========================================================
-- COACHING APPLICATIONS — high-ticket lead capture
-- =========================================================
-- Table pour stocker les candidatures provenant des stories
-- Instagram (lien /candidature). Reprend les 24 champs de
-- l'OnboardingFlow + meta tracking (source, status, UTM).
-- Le flow est public : pas besoin d'etre logue, pas de FK
-- vers auth.users ou clients.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.coaching_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email = identifiant unique (un meme prospect ne candidate
  -- qu'une fois ; UPSERT update les infos sur re-soumission)
  email text NOT NULL,

  -- Step 1 : identite + bio
  nom_prenom text,
  telephone text,
  age int,
  poids numeric,
  taille int,
  passe_sportif text,

  -- Step 2 : mode de vie
  metier text,
  sommeil text,
  pas_jour text,
  allergies text,
  repas text,
  jours_entrainement text,
  heures_seance text,
  diet_actuelle text,

  -- Step 3 : objectifs
  points_faibles text,
  objectifs_6semaines text,
  objectifs_3mois text,
  objectifs_6mois text,

  -- Step 4 : mindset
  motivation_score int,
  freins text,
  sacrifices text,
  vision_physique text,

  -- Step 5 : performance
  one_rm_bench numeric,
  one_rm_squat numeric,
  one_rm_traction numeric,

  -- Step 6 : motivation profonde
  motivation_principale text,
  risques_abandon text,
  autres_infos text,

  -- Meta
  source text DEFAULT 'instagram',         -- 'instagram', 'direct', etc.
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,

  -- Tracking coach (Rayan trie les candidatures)
  status text DEFAULT 'pending',           -- 'pending' | 'contacted' | 'accepted' | 'rejected'
  notes text,                              -- notes privees du coach apres l'appel
  contacted_at timestamptz,
  decided_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Email unique (UPSERT-friendly)
CREATE UNIQUE INDEX IF NOT EXISTS coaching_applications_email_idx
  ON public.coaching_applications (email);

-- Index pour le tri des candidatures par statut + score
CREATE INDEX IF NOT EXISTS coaching_applications_status_score_idx
  ON public.coaching_applications (status, motivation_score DESC, created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_coaching_applications_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coaching_applications_updated_at ON public.coaching_applications;
CREATE TRIGGER coaching_applications_updated_at
  BEFORE UPDATE ON public.coaching_applications
  FOR EACH ROW EXECUTE FUNCTION update_coaching_applications_updated_at();

-- =========================================================
-- RLS — service role uniquement (admin via dashboard)
-- =========================================================
ALTER TABLE public.coaching_applications ENABLE ROW LEVEL SECURITY;

-- Aucune policy pour authenticated → seul service_role peut INSERT
-- (via /api/coaching-application avec SUPABASE_SERVICE_ROLE_KEY).
-- Le coach Rayan accede via Supabase Dashboard SQL Editor.

COMMENT ON TABLE public.coaching_applications IS
  'Candidatures high-ticket coaching depuis stories IG /candidature. '
  'Email unique. Service role only (RLS bloque tout le reste).';
