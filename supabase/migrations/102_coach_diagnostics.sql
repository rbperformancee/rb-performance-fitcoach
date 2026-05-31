-- 102_coach_diagnostics.sql
-- 23 mai 2026 — Diagnostic Coach (lead magnet pré-signup)
--
-- Stocke un résultat de diagnostic anonyme (avant signup coach) avec scoring 5 piliers.
-- Source de vérité du contenu : api/diagnostic-submit.js (scoring) + public/diagnostic.html (form).
-- Pas de RLS SELECT/INSERT publique : tout passe par service_role côté API.
--
-- 5 piliers (cf. spec Rayan 23/05/26) :
--   P1 Prévisibilité du revenu  · P2 Rétention · P3 Robustesse base client
--   P4 Cash/encaissement        · P5 Pilotage
-- Scoring : a=10 / b=5 / c=0 par question (2 Q par pilier) → pilier /20 → global /100
-- weak_pillar = pilier le plus bas (tiebreak ordre survie : P1 > P2 > P4 > P3 > P5)

CREATE TABLE IF NOT EXISTS public.coach_diagnostics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  first_name        text,
  answers           jsonb NOT NULL,
  scores            jsonb NOT NULL,
  global_score      integer NOT NULL CHECK (global_score >= 0 AND global_score <= 100),
  weak_pillar       text NOT NULL,
  band              text NOT NULL,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_term          text,
  utm_content       text,
  referrer          text,
  user_agent        text,
  ip_country        text,
  consent_marketing boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

--@SPLIT@

CREATE INDEX IF NOT EXISTS coach_diagnostics_email_idx
  ON public.coach_diagnostics (email);

--@SPLIT@

CREATE INDEX IF NOT EXISTS coach_diagnostics_created_at_idx
  ON public.coach_diagnostics (created_at DESC);

--@SPLIT@

CREATE INDEX IF NOT EXISTS coach_diagnostics_weak_pillar_idx
  ON public.coach_diagnostics (weak_pillar);

--@SPLIT@

ALTER TABLE public.coach_diagnostics ENABLE ROW LEVEL SECURITY;

--@SPLIT@

COMMENT ON TABLE public.coach_diagnostics IS
  'Résultats du Diagnostic Coach (lead magnet pré-signup). R/W via service_role uniquement.';
