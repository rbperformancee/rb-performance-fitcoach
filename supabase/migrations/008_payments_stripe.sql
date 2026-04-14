-- 008_payments_stripe.sql
-- Architecture paiements Stripe compatible App Store (pas de CB dans l'app
-- native). L'abonnement coach se souscrit UNIQUEMENT via le web.
-- Les paiements coach → client passent par Stripe Payment Links partages
-- par messagerie (le client paie dans son navigateur, pas dans l'app).
--
-- Principe Netflix/Spotify: desactiver l'achat dans l'app iOS pour eviter
-- la commission Apple. Apple l'autorise tant qu'on ne redirige pas vers
-- le web depuis l'app.

BEGIN;

-- =========================================================
-- ABONNEMENT COACH (Stripe Checkout subscriptions)
-- =========================================================
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_account_id  text,   -- Stripe Connect
  ADD COLUMN IF NOT EXISTS subscription_plan  text NOT NULL DEFAULT 'free',
    -- 'free' | 'starter' | 'pro' | 'elite'
  ADD COLUMN IF NOT EXISTS subscription_status text,
    -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz;

COMMENT ON COLUMN public.coaches.stripe_customer_id IS
  'Stripe Customer pour les subscriptions coach (abonnement RB Perform).';
COMMENT ON COLUMN public.coaches.stripe_account_id IS
  'Stripe Connect Account pour que le coach recoive des paiements clients.';
COMMENT ON COLUMN public.coaches.subscription_plan IS
  'Plan actuel: free/starter/pro/elite. MAJ via webhook stripe.';

CREATE INDEX IF NOT EXISTS coaches_sub_plan_idx ON public.coaches (subscription_plan) WHERE subscription_status = 'active';

-- =========================================================
-- FACTURES (generees par le coach pour ses clients)
-- Lecture seule dans l'app native, generation via API.
-- =========================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  number text NOT NULL,                         -- ex: "F-2026-00042"
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  description text,
  status text NOT NULL DEFAULT 'draft',         -- draft/sent/paid/void
  pdf_url text,                                 -- URL storage Supabase du PDF
  stripe_payment_link_id text,                  -- lien si paye via Stripe
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_coach_idx  ON public.invoices (coach_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS invoices_client_idx ON public.invoices (client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_uq ON public.invoices (coach_id, number);

-- =========================================================
-- PAYMENT LINKS (coach → client, partages par messagerie)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  stripe_link_id text NOT NULL,                 -- id Stripe pour retrieve/expire
  url text NOT NULL,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  description text,
  type text NOT NULL DEFAULT 'coaching',        -- coaching/programme/other
  active boolean NOT NULL DEFAULT true,
  opened_count int NOT NULL DEFAULT 0,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plinks_coach_idx  ON public.payment_links (coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plinks_client_idx ON public.payment_links (client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS plinks_stripe_uq ON public.payment_links (stripe_link_id);

-- =========================================================
-- STRIPE EVENTS (idempotence webhook)
-- Chaque event_id Stripe n'est traite qu'une fois.
-- =========================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,                -- evt_xxx de Stripe
  type text NOT NULL,
  payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  processed_ok boolean NOT NULL DEFAULT true,
  error text
);
CREATE INDEX IF NOT EXISTS stripe_events_type_idx ON public.stripe_events (type, processed_at DESC);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events  ENABLE ROW LEVEL SECURITY;

-- Coach ne voit/gere que ses propres factures et liens
CREATE POLICY invoices_coach_all ON public.invoices
  FOR ALL TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY plinks_coach_all ON public.payment_links
  FOR ALL TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- stripe_events = admin only (pas de policy donc RLS bloque tout
-- sauf via service role key cote serveur/Edge Function)

COMMIT;
