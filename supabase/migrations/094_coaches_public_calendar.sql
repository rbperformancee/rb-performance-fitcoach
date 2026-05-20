-- 094 — Vitrine coach premium : URL de booking (Cal.com / Calendly / Tally)
-- Permet au coach d'ajouter une CTA secondaire "Réserver un appel découverte"
-- sur sa page publique /c/[slug], en complément du formulaire /candidature.

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS public_calendar_url text;

COMMENT ON COLUMN public.coaches.public_calendar_url IS
  'URL de booking externe (Cal.com, Calendly, Tally…). Affichée comme CTA secondaire sur la vitrine publique si renseignée.';
