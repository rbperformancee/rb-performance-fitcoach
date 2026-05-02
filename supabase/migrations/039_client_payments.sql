-- 039_client_payments.sql
-- Système de tracking des paiements clients pour suivre le MRR par coach.
--
-- Contexte : RB Perform ne gère PAS l'encaissement (pas de Stripe Connect au launch).
-- Les coachs encaissent leurs clients directement (virement, Stripe perso, cash...).
-- Cette table permet aux coachs de logger manuellement chaque paiement reçu pour
-- calculer leur MRR, anticiper les renouvellements et exporter pour la compta.
--
-- Trigger côté UI : à chaque assignation de programme, si le client n'a aucun
-- paiement loggé OU si la période en cours est dépassée → modal "Paiement reçu ?"
-- (skippable). Sinon silence.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  -- Lien optionnel vers une facture émise par le coach. Permet le hook
  -- InvoiceModal "marquer comme payée" sans créer de doublon.
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount_eur numeric(10,2) NOT NULL CHECK (amount_eur > 0),
  payment_method text NOT NULL DEFAULT 'virement'
    CHECK (payment_method IN ('virement','cash','stripe_perso','paypal','autre')),
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  notes text,
  void boolean NOT NULL DEFAULT false,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

-- Garantit qu'une même facture n'a qu'un seul paiement non-void associé
-- (couche 1 : la BDD elle-même bloque le doublon par facture)
CREATE UNIQUE INDEX IF NOT EXISTS payments_invoice_unique
  ON public.client_payments (invoice_id)
  WHERE invoice_id IS NOT NULL AND void = false;

-- Index pour le trigger "période expirée" (lookup last payment per client)
CREATE INDEX IF NOT EXISTS idx_payments_client_period_end
  ON public.client_payments (client_id, period_end DESC)
  WHERE void = false;

-- Index pour les vues MRR du coach (last 30 days, current month)
CREATE INDEX IF NOT EXISTS idx_payments_coach_received
  ON public.client_payments (coach_id, received_date DESC)
  WHERE void = false;

-- ===== RLS =====
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

-- Le coach voit, crée, édite et supprime les paiements de SES clients uniquement.
-- Pas d'accès anon. Pas d'accès cross-coach.
DO $$ BEGIN
  CREATE POLICY payments_coach_all ON public.client_payments
    FOR ALL TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Super admin (Rayan) peut tout voir pour le support
DO $$ BEGIN
  CREATE POLICY payments_admin_read ON public.client_payments
    FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.super_admins WHERE email = (auth.jwt() ->> 'email'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.client_payments IS
  'Paiements reçus par les coachs de leurs clients. Logging manuel — RB Perform ne touche pas à l''argent. Sert à calculer le MRR coach et à déclencher les prompts de renouvellement.';

COMMIT;
