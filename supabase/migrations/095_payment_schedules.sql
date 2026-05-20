-- 095 — Payment schedules (échéances attendues)
--
-- Aujourd'hui : client_payments logue ce qui EST reçu, mais rien ne dit ce qui
-- DEVRAIT rentrer. Impossible de détecter un impayé, de calculer le MRR juste,
-- ou de voir "qui me doit combien".
--
-- Cette table contient les échéances attendues d'un client (1 ligne par échéance,
-- ex: 6 lignes pour un plan 6 mois payé en mensuel). Chaque échéance peut être
-- réconciliée avec un paiement reçu via payment_id.
--
-- Statuts :
--   pending — échéance future, pas encore due
--   paid    — payée (lien payment_id)
--   late    — due_date dépassée, non payée (calculé par trigger ou côté app)
--   waived  — coach a annulé l'échéance (geste commercial)

CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_id      uuid REFERENCES public.invoices(id) ON DELETE SET NULL,

  due_date        date NOT NULL,
  expected_amount numeric(10,2) NOT NULL CHECK (expected_amount >= 0),

  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'late', 'waived')),

  -- Réconciliation
  payment_id      uuid REFERENCES public.client_payments(id) ON DELETE SET NULL,
  paid_at         timestamptz,
  paid_amount     numeric(10,2),  -- peut différer de expected_amount (paiement partiel)

  -- Geste commercial
  waived_reason   text,
  waived_at       timestamptz,

  -- Ordre de l'échéance dans le plan (1..N)
  sequence_num    integer NOT NULL DEFAULT 1,
  total_sequence  integer NOT NULL DEFAULT 1,

  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_coach
  ON public.payment_schedules(coach_id);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_client
  ON public.payment_schedules(client_id);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_due
  ON public.payment_schedules(coach_id, due_date)
  WHERE status IN ('pending', 'late');

CREATE INDEX IF NOT EXISTS idx_payment_schedules_status
  ON public.payment_schedules(coach_id, status);

-- RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach manages own schedules" ON public.payment_schedules;
CREATE POLICY "coach manages own schedules" ON public.payment_schedules
  FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

COMMENT ON TABLE public.payment_schedules IS
  'Echeances attendues d''un plan client. 1 ligne par echeance (ex: 6 lignes pour un 6 mois mensuel).';
