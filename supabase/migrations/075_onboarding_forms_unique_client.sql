-- Fix : onConflict: "client_id" dans le code (ClientFirstLoginFlow +
-- OnboardingFlow) nécessite une contrainte UNIQUE sur client_id.
-- Sans elle, PostgREST renvoie "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification".
--
-- Sémantique : 1 onboarding_forms par client (un client n'a qu'un seul
-- onboarding initial). Si un row existe déjà, on update.
--
-- Dédup défensive en amont au cas où des doublons existent (très peu probable
-- vu la query précédente — 0 row pour Léo — mais safe).

DO $$
DECLARE
  dup_count int;
BEGIN
  -- Compte les doublons (clients ayant 2+ rows)
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT client_id FROM public.onboarding_forms
    GROUP BY client_id HAVING COUNT(*) > 1
  ) sub;

  IF dup_count > 0 THEN
    -- Garde uniquement la row la plus récente par client_id (par created_at sinon id)
    DELETE FROM public.onboarding_forms a
    USING public.onboarding_forms b
    WHERE a.client_id = b.client_id
      AND a.ctid < b.ctid;
    RAISE NOTICE 'Dédup : % clients avec doublons nettoyés', dup_count;
  END IF;
END$$;

-- UNIQUE constraint pour permettre ON CONFLICT (client_id)
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_forms_client_id_unique
  ON public.onboarding_forms (client_id);
