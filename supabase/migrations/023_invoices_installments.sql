-- =============================================
-- 023 : Ajout du paiement en plusieurs fois sur les factures
-- =============================================
-- installments_count  = nombre d'echeances (1 = comptant, 3 = 3x, etc.)
-- installment_amount  = montant par echeance (NULL si comptant)

BEGIN;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments_count  INTEGER DEFAULT 1;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installment_amount  NUMERIC(10,2);

-- Backfill : factures existantes = paiement comptant
UPDATE invoices
SET installments_count = 1
WHERE installments_count IS NULL;

COMMIT;
