-- =========================================================
-- COACHING APPLICATIONS — budget qualification
-- =========================================================
-- Replace the binary "ack_invest yes/no" gate (rejection visible)
-- by a 4-tier budget picker + free-form anchor on current spend.
-- All candidatures are now stored regardless of budget : Rayan
-- triages in admin instead of bouncing prospects at submission.
--
-- budget_mensuel enum (text + CHECK serait + strict mais ALTER
-- TABLE doit rester additif et nullable pour ne pas casser les
-- rows existantes).
-- =========================================================

ALTER TABLE public.coaching_applications
  ADD COLUMN IF NOT EXISTS budget_mensuel text
;

ALTER TABLE public.coaching_applications
  ADD COLUMN IF NOT EXISTS depense_actuelle_perf text
;

COMMENT ON COLUMN public.coaching_applications.budget_mensuel IS 'Budget mensuel envisage : lt_100 | 100 | 150 (offre principale) | gt_200 | discuss'
;

COMMENT ON COLUMN public.coaching_applications.depense_actuelle_perf IS 'Investissement mensuel deja consenti pour la perf (salle + supplements + coach precedent). Sert ancrage avant la question budget.'
;
