-- 107 — Table ebook_purchases : idempotence webhook Stripe + compteur 30 places
--
-- Contexte (flow ebook self-serve, cf migration 106) :
--   Webhook Stripe sur rbperform.com → POST /api/internal/ebook-grant-access (ce repo)
--   Cette table garantit :
--     (1) Idempotence stricte : Stripe retry le webhook ? stripe_session_id en PK
--         garantit qu'on ne crée pas un 2e client/programme pour le même paiement.
--     (2) Compteur places : SELECT count(*) WHERE app_access_granted=true
--         pour décider si le 31e acheteur reçoit le bonus app ou la waitlist.
--
-- RLS : service_role uniquement. Aucun client ni coach ne lit cette table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ebook_purchases (
  stripe_session_id   text PRIMARY KEY,
  email               text NOT NULL,
  client_id           uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  programme_id        uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  app_access_granted  boolean NOT NULL DEFAULT false,
  raw_metadata        jsonb,         -- snapshot du metadata Stripe (debug)
  source              text NOT NULL DEFAULT 'rbperform.com',
  created_at          timestamptz NOT NULL DEFAULT now(),
  granted_at          timestamptz,   -- = created_at si granted, NULL sinon
  notes               text           -- ex: "waitlist_wave2", "coach_collision"
);

-- Index sur le compteur (granted=true) — accélère le check des 30 places
CREATE INDEX IF NOT EXISTS idx_ebook_purchases_granted
  ON public.ebook_purchases (app_access_granted)
  WHERE app_access_granted = true;

-- Index secondaire pour lookup par email (cas support / debug)
CREATE INDEX IF NOT EXISTS idx_ebook_purchases_email
  ON public.ebook_purchases (lower(email));

-- RLS : tout fermé sauf service_role (qui bypasse RLS via service_role_key)
ALTER TABLE public.ebook_purchases ENABLE ROW LEVEL SECURITY;

-- Pas de policy = aucun rôle ne peut lire/écrire en dehors du service_role.
-- (RLS sans policy = deny par défaut pour anon/authenticated.)

COMMENT ON TABLE public.ebook_purchases IS
  'Idempotence webhook Stripe ebook + compteur 30 places app. Service-role only.';
COMMENT ON COLUMN public.ebook_purchases.stripe_session_id IS
  'cs_xxxxx — PK garantit idempotence sur retry Stripe.';
COMMENT ON COLUMN public.ebook_purchases.app_access_granted IS
  'true si dans les 30 premières places ET pas de collision coach existant.';

COMMIT;
