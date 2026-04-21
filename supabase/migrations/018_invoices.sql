-- 018_invoices.sql
-- Systeme de facturation premium pour coachs

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  description TEXT NOT NULL DEFAULT 'Programme coaching',
  amount NUMERIC(10,2) NOT NULL,
  duration_months INTEGER DEFAULT 1,
  price_per_month NUMERIC(10,2),
  tva_applicable BOOLEAN DEFAULT false,
  tva_rate NUMERIC(4,2) DEFAULT 0,
  tva_amount NUMERIC(10,2) DEFAULT 0,
  total_ttc NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_own_invoices" ON invoices FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Compteur auto pour le numero de facture
CREATE OR REPLACE FUNCTION next_invoice_number(cid UUID)
RETURNS TEXT AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO cnt FROM invoices WHERE coach_id = cid;
  RETURN 'FAC-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(cnt::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
