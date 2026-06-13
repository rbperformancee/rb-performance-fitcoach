-- Migration 114 — Ajoute objectif_principal sur coaching_applications
--
-- Contexte : court funnel candidature (13/06) — étape 1 raccourcie à 7 champs
-- dont un radio "Objectif principal" (prise_masse / seche / perf / recompo / autre).
-- Permet à Rayan de qualifier vite avant d'ouvrir le profil détaillé.

ALTER TABLE public.coaching_applications
  ADD COLUMN IF NOT EXISTS objectif_principal TEXT NULL;

COMMENT ON COLUMN public.coaching_applications.objectif_principal IS
  'Radio quick-select à l''étape 1 du court funnel : prise_masse | seche | perf | recompo | autre.';
