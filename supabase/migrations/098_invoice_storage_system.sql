-- 098 — Système complet de facturation : compteurs continus, stockage,
-- table receipts (acquits de paiement séparés), RLS, RPC atomiques.
--
-- Norme française :
--   - Numérotation des factures CONTINUE (sans saut, sans doublon) — art. 242
--     nonies A du CGI. Reset annuel autorisé si justifié, ici on garde un
--     compteur global par coach (le plus safe).
--   - Conservation 10 ans (art. L.123-22 C. com.).
--   - 1 facture émise par contrat + N reçus pour les échéances payées.

-- ===== Compteurs par coach =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS invoice_counter integer NOT NULL DEFAULT 0;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS receipt_counter integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.coaches.invoice_counter IS
  'Compteur continu des factures émises par ce coach. Incrémenté atomiquement via next_invoice_number().';

COMMENT ON COLUMN public.coaches.receipt_counter IS
  'Compteur continu des reçus émis par ce coach. Incrémenté atomiquement via next_receipt_number().';

-- ===== Invoices : ajout champs manquants =====
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS pdf_url text;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_schedule_id uuid REFERENCES public.payment_schedules(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS issued_at timestamptz NOT NULL DEFAULT now();

-- La contrainte status historique acceptait juste {draft, sent, paid}.
-- On ajoute 'issued' (facture émise = générée + stockée, distincte de
-- 'sent' qui implique un envoi explicite au client).
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'issued'::text, 'sent'::text, 'paid'::text]));

COMMENT ON COLUMN public.invoices.pdf_url IS
  'URL Supabase Storage du PDF de la facture (bucket coach-invoices, chemin coach_id/invoice_id.pdf).';

-- ===== Table receipts (acquits de paiement) =====
-- 1 reçu = 1 paiement encaissé pour 1 échéance ou un paiement unique.
-- Le reçu pointe vers la facture maître + le paiement physique.
CREATE TABLE IF NOT EXISTS public.receipts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_id        uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id        uuid REFERENCES public.client_payments(id) ON DELETE SET NULL,
  schedule_id       uuid REFERENCES public.payment_schedules(id) ON DELETE SET NULL,

  receipt_number    text NOT NULL,
  amount_eur        numeric(10,2) NOT NULL CHECK (amount_eur > 0),
  paid_at           timestamptz NOT NULL DEFAULT now(),
  payment_method    text,
  pdf_url           text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (coach_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_receipts_coach ON public.receipts(coach_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON public.receipts(client_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.receipts(invoice_id);

COMMENT ON TABLE public.receipts IS
  'Acquits de paiement (1 par encaissement). Liés à la facture maître + au paiement physique.';

-- ===== RLS — Invoices =====
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach manages own invoices" ON public.invoices;
CREATE POLICY "coach manages own invoices" ON public.invoices
  FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "client reads own invoices" ON public.invoices;
CREATE POLICY "client reads own invoices" ON public.invoices
  FOR SELECT
  USING (client_id = auth.uid());

-- ===== RLS — Receipts =====
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach manages own receipts" ON public.receipts;
CREATE POLICY "coach manages own receipts" ON public.receipts
  FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "client reads own receipts" ON public.receipts;
CREATE POLICY "client reads own receipts" ON public.receipts
  FOR SELECT
  USING (client_id = auth.uid());

-- ===== RPC atomiques de numérotation =====
-- L'atomicité est garantie par UPDATE … RETURNING dans une seule transaction.
-- Pas de race condition possible entre deux clics simultanés.

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_coach_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
BEGIN
  -- Vérif : le caller doit être ce coach
  IF auth.uid() IS DISTINCT FROM p_coach_id THEN
    RAISE EXCEPTION 'Forbidden: caller is not the coach owning this counter';
  END IF;

  UPDATE public.coaches
    SET invoice_counter = invoice_counter + 1
    WHERE id = p_coach_id
    RETURNING invoice_counter INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Coach not found';
  END IF;

  RETURN 'INV-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_receipt_number(p_coach_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_coach_id THEN
    RAISE EXCEPTION 'Forbidden: caller is not the coach owning this counter';
  END IF;

  UPDATE public.coaches
    SET receipt_counter = receipt_counter + 1
    WHERE id = p_coach_id
    RETURNING receipt_counter INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Coach not found';
  END IF;

  RETURN 'REC-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(uuid) TO authenticated;
