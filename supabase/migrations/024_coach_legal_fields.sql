-- =============================================
-- 024 : Champs legaux du coach pour facturation conforme
-- =============================================
-- Mentions obligatoires sur facture francaise (CGI Art. 242 nonies A) :
--   - Forme juridique (Auto-entrepreneur, EI, EURL, SASU, SAS, SARL...)
--   - RCS (numero + ville d'immatriculation) si societe commercante
--   - Capital social si societe
--   - Numero TVA intracommunautaire si TVA applicable

BEGIN;

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS legal_form     TEXT;   -- 'auto-entrepreneur' | 'EI' | 'EURL' | 'SASU' | 'SAS' | 'SARL' | 'autre'
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS rcs_city       TEXT;   -- 'Paris', 'Lyon', etc.
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS rcs_number     TEXT;   -- ex: '123 456 789' (9 chiffres SIREN)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS vat_number     TEXT;   -- ex: 'FR12345678901'
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS capital_social NUMERIC(12,2);  -- en EUR

COMMIT;
