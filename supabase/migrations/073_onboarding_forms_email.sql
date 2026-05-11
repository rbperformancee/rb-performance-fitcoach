-- Fix défensif : ajoute la colonne `email` à `onboarding_forms`.
--
-- Pourquoi : 2 paths code (ClientFirstLoginFlow + OnboardingFlow) ont
-- historiquement envoyé un champ `email` dans l'upsert. Les fixes côté
-- code ont été déployés mais le service worker de certains clients
-- continue à servir l'ancien bundle (cache-first immutable sur les
-- assets hashed). Tant que ces clients n'ont pas refresh leur PWA,
-- ils envoient `email` → 400 PostgREST "column not found".
--
-- Ajouter la colonne rend l'API tolérante : l'ancien et le nouveau
-- code passent tous les deux. Pas de breaking change ni de data perdue.

ALTER TABLE public.onboarding_forms
  ADD COLUMN IF NOT EXISTS email text;
