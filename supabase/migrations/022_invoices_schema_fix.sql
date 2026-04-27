-- =============================================
-- 022 : Fix schema invoices (collision 008 vs 018)
-- =============================================
-- Bug : 008_payments_stripe.sql cree public.invoices avec un schema A
-- (number, amount_cents, ...). 018_invoices.sql essaie de creer la
-- meme table avec un schema B (invoice_number, amount, duration_months,
-- client_name, ...) mais le IF NOT EXISTS la skip. Resultat : la table
-- prod a probablement le schema 008 et le code InvoiceModal.jsx insere
-- des colonnes inexistantes -> erreur 'column does not exist'.
--
-- Fix : ALTER TABLE ADD COLUMN IF NOT EXISTS pour toutes les colonnes
-- attendues par le code, quel que soit le schema en place.

BEGIN;

-- Colonnes attendues par InvoiceModal.jsx (schema 018)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number   TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_name      TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email     TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount           NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS duration_months  INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS price_per_month  NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tva_applicable   BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tva_rate         NUMERIC(4,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tva_amount       NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_ttc        NUMERIC(10,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes            TEXT;

-- Si la table avait le schema 008 (number, amount_cents) on backfill
-- les colonnes 018 a partir des valeurs existantes.
UPDATE invoices
SET invoice_number = number
WHERE invoice_number IS NULL
  AND number IS NOT NULL;

UPDATE invoices
SET amount = amount_cents / 100.0
WHERE amount IS NULL
  AND amount_cents IS NOT NULL;

UPDATE invoices
SET total_ttc = amount_cents / 100.0
WHERE total_ttc IS NULL
  AND amount_cents IS NOT NULL;

UPDATE invoices
SET client_name = COALESCE(client_name, '')
WHERE client_name IS NULL;

-- next_invoice_number() existait dans 018 ; on garantit qu'elle est presente
CREATE OR REPLACE FUNCTION next_invoice_number(cid UUID)
RETURNS TEXT AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO cnt FROM invoices WHERE coach_id = cid;
  RETURN 'FAC-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(cnt::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- RLS policy : harmoniser sur le pattern coaches.email = auth.jwt()->>'email'
-- (c'est ce qui marche pour ton auth — auth.uid() != coach_id en general)
DROP POLICY IF EXISTS coach_own_invoices ON invoices;
DROP POLICY IF EXISTS invoices_coach_all ON invoices;
CREATE POLICY invoices_coach_own ON invoices
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = invoices.coach_id
              AND coaches.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = invoices.coach_id
              AND coaches.email = auth.jwt()->>'email')
  );

COMMIT;

-- Verification :
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'invoices'
-- ORDER BY ordinal_position;
