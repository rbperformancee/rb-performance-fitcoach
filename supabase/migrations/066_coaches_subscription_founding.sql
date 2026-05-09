-- 066_coaches_subscription_founding.sql
-- Fix schema drift : le code référence coaches.founding_coach et
-- coaches.subscription_plan partout (Sentinel gating, AIAnalyze, dashboard)
-- mais ces colonnes n'existent pas en prod → tous les coachs sont gated.
--
-- Visible symptôme : Sentinel affiche le teaser "Réservé au plan Pro" même
-- pour les founding coaches qui devraient avoir accès.
--
-- Plans :
--   free      : compte créé mais pas encore de paiement / fin d'essai
--   pro       : 39 EUR/mois — Sentinel access
--   elite     : 99 EUR/mois — Sentinel access + features futures
--   founding  : early adopters (5 premiers) — accès lifetime
--
-- founding_coach = true → bypass tous les gates Sentinel/Pro même si
-- subscription_plan='free'. Cohabite avec subscription_plan='founding'
-- pour la rétrocompat (le code check les deux conditions en OR).

BEGIN;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS subscription_plan text
    CHECK (subscription_plan IS NULL OR subscription_plan IN ('free','pro','elite','founding'));

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS founding_coach boolean NOT NULL DEFAULT false;

-- Default tous les comptes existants à 'free' (sauf si déjà autre)
UPDATE public.coaches
  SET subscription_plan = 'free'
  WHERE subscription_plan IS NULL;

-- Founder : Rayan (rb.performancee@gmail.com) est founding par construction
UPDATE public.coaches
  SET founding_coach = true,
      subscription_plan = 'founding'
  WHERE email = 'rb.performancee@gmail.com';

-- Demo coach aussi founding pour que le mode démo montre Sentinel
UPDATE public.coaches
  SET founding_coach = true,
      subscription_plan = 'founding'
  WHERE email = 'demo@rbperform.app';

COMMIT;
