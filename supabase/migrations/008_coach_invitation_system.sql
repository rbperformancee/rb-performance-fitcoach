-- =============================================
-- 008 : Systeme d'invitation client (code + slug + payment link)
-- =============================================

-- Colonnes pour le code/slug/lien de paiement/subject coach
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS coach_code char(6);
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS coach_slug text;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS activity text;       -- activite pratiquee
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS city text;           -- ville

-- Unique index pour garantir l'unicite
CREATE UNIQUE INDEX IF NOT EXISTS idx_coaches_coach_code ON coaches(coach_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coaches_coach_slug ON coaches(coach_slug);

-- Fonction pour generer un code 6 chiffres unique
CREATE OR REPLACE FUNCTION generate_coach_code()
RETURNS char(6) AS $$
DECLARE
  new_code char(6);
  attempts int := 0;
BEGIN
  LOOP
    new_code := LPAD(floor(random() * 1000000)::text, 6, '0');
    IF NOT EXISTS (SELECT 1 FROM coaches WHERE coach_code = new_code) THEN
      RETURN new_code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique coach_code after 50 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour generer un slug unique a partir du brand_name ou email
CREATE OR REPLACE FUNCTION generate_coach_slug(raw_name text, fallback_email text)
RETURNS text AS $$
DECLARE
  base text;
  slug text;
  counter int := 0;
BEGIN
  -- Base : brand_name si dispo, sinon email prefix
  base := COALESCE(NULLIF(trim(raw_name), ''), split_part(fallback_email, '@', 1));
  -- Normalisation : lowercase, retire accents, remplace non-alphanum par -
  base := lower(base);
  base := translate(base, 'àáâäãåèéêëìíîïòóôöõùúûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  IF length(base) = 0 THEN base := 'coach'; END IF;

  slug := base;
  WHILE EXISTS (SELECT 1 FROM coaches WHERE coach_slug = slug) LOOP
    counter := counter + 1;
    slug := base || '-' || counter;
  END LOOP;
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger : a chaque insert/update, s'assurer que coach_code et coach_slug sont set
CREATE OR REPLACE FUNCTION ensure_coach_code_and_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.coach_code IS NULL THEN
    NEW.coach_code := generate_coach_code();
  END IF;
  IF NEW.coach_slug IS NULL THEN
    NEW.coach_slug := generate_coach_slug(NEW.brand_name, NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coach_code_slug ON coaches;
CREATE TRIGGER trg_coach_code_slug
  BEFORE INSERT OR UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION ensure_coach_code_and_slug();

-- Backfill pour les coachs existants
UPDATE coaches
SET coach_code = generate_coach_code()
WHERE coach_code IS NULL;

UPDATE coaches
SET coach_slug = generate_coach_slug(brand_name, email)
WHERE coach_slug IS NULL;

-- Table d'invitations (tracking opt.) — pour stats et audit
CREATE TABLE IF NOT EXISTS coach_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_email text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  method text, -- 'code', 'link', 'manual'
  code_used char(6),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_coach ON coach_invitations(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_email ON coach_invitations(client_email);
