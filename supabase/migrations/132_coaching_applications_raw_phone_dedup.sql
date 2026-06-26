-- Phone-based dedup pour coaching_applications.
-- Avant : dedup uniquement par email (CandidatureLevel2.jsx, ebook_grant_access).
-- Bug : un prospect qui candidate 2x avec un nouvel email (changé Instagram bio,
-- etc.) crée 2 rows distinctes → 2 entrées dans le CRM, relances doublées,
-- historique scindé. Feature inspirée de FunnelOps (audit Jonas blueprint).
--
-- Stratégie :
-- 1. Colonne `raw_phone TEXT` (téléphone normalisé : digits only, "+33614…" → "33614…")
-- 2. Index conditionnel (where raw_phone IS NOT NULL) pour lookup rapide
-- 3. Trigger BEFORE INSERT/UPDATE qui normalise telephone → raw_phone
-- 4. Pas d'unique strict (un candidat peut légitimement recandidater
--    après reject) — la dedup est faite côté lecture (CRM merge view)
--    + côté insert quand candidature est créée (logique métier).

ALTER TABLE public.coaching_applications
  ADD COLUMN IF NOT EXISTS raw_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_coaching_applications_raw_phone
  ON public.coaching_applications (raw_phone)
  WHERE raw_phone IS NOT NULL;

-- Fonction de normalisation phone : strip tout sauf digits (le "+" devient
-- vide → "33614" au lieu de "+33614"). Cohérent avec spec Jonas et permet
-- match cross-format (06.14, +33 6 14, 0033614 → tous = "33614" ou "0614").
-- On garde la version sans pays si l'utilisateur tape juste "0614…" pour
-- éviter les faux match.
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p IS NULL OR length(trim(p)) = 0 THEN
    RETURN NULL;
  END IF;
  digits := regexp_replace(p, '[^0-9]', '', 'g');
  -- Format FR : si commence par 33 et len=11 (3361423xxxx) → garde tel quel
  -- Si commence par 0 et len=10 (06xxxxxxxx) → normalise vers 33xxxxxxxxx
  IF length(digits) = 10 AND substring(digits FROM 1 FOR 1) = '0' THEN
    digits := '33' || substring(digits FROM 2);
  END IF;
  -- Si vide après strip → NULL
  IF length(digits) < 8 THEN
    RETURN NULL;
  END IF;
  RETURN digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger : à chaque INSERT/UPDATE qui touche telephone, recompute raw_phone.
CREATE OR REPLACE FUNCTION public.coaching_applications_normalize_phone()
RETURNS TRIGGER AS $$
BEGIN
  NEW.raw_phone := public.normalize_phone(NEW.telephone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coaching_applications_normalize_phone ON public.coaching_applications;
CREATE TRIGGER trg_coaching_applications_normalize_phone
  BEFORE INSERT OR UPDATE OF telephone ON public.coaching_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.coaching_applications_normalize_phone();

-- Backfill : remplit raw_phone pour les rows existantes.
UPDATE public.coaching_applications
SET raw_phone = public.normalize_phone(telephone)
WHERE telephone IS NOT NULL AND raw_phone IS NULL;

COMMENT ON COLUMN public.coaching_applications.raw_phone IS
  'Téléphone normalisé (digits only, format FR convertit "06xxx" → "33xxx"). Calculé auto via trigger trg_coaching_applications_normalize_phone à chaque insert/update. Sert au dedup CRM : si 2 rows partagent le même raw_phone, c''est probablement le même prospect.';
