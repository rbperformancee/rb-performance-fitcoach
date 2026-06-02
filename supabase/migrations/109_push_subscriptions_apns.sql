-- Migration 109 — APNs token support sur push_subscriptions
--
-- Contexte : on commence à shipper l'app iOS native (Capacitor) en
-- parallèle de la PWA. Sur natif, le push passe par Apple Push Notification
-- service (APNs) et pas par Web Push (VAPID). Le token APNs n'est PAS une
-- URL `https://web.push.apple.com/...` — c'est un identifiant device
-- opaque, 64+ chars hex, qu'on poste à l'API APNs avec un JWT.
--
-- Stratégie zero-régression :
--   - Les rows existantes (web push) gardent endpoint + subscription, le
--     nouveau apns_token est NULL → comportement identique.
--   - Les rows natives ont apns_token rempli, endpoint et subscription NULL.
--   - Le sender backend choisit le canal selon ce qui est présent.
--
-- Roadmap : APP_STORE_ROADMAP.md (Wave 5).

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS apns_token TEXT NULL;

--@SPLIT@

-- Endpoint était NOT NULL historiquement (003 ou plus tôt). Pour permettre
-- les rows APNs-only, on relâche la contrainte. Idempotent : si déjà
-- nullable, no-op silencieux côté Postgres.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN endpoint DROP NOT NULL;

--@SPLIT@

-- CHECK : une row doit avoir AU MOINS un canal (web endpoint OU apns_token).
-- Une row sans aucun des deux serait orpheline et ne servirait à rien.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subs_channel_check') THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subs_channel_check
      CHECK (endpoint IS NOT NULL OR apns_token IS NOT NULL);
  END IF;
END $$;

--@SPLIT@

-- Unicité (client_id, apns_token) côté athlète — permet l'upsert depuis le
-- hook native sans dupliquer si le même device se réenregistre.
-- Index partial : PostgreSQL ignore les NULL, donc seules les vraies rows
-- APNs y entrent.
CREATE UNIQUE INDEX IF NOT EXISTS push_subs_client_apns_unique
  ON public.push_subscriptions (client_id, apns_token)
  WHERE apns_token IS NOT NULL AND client_id IS NOT NULL;

--@SPLIT@

-- Idem côté coach pour rester symétrique avec l'arch existante (utile si
-- on ship un jour le coach iOS — pour l'instant le coach reste web only).
CREATE UNIQUE INDEX IF NOT EXISTS push_subs_coach_apns_unique
  ON public.push_subscriptions (coach_id, apns_token)
  WHERE apns_token IS NOT NULL AND coach_id IS NOT NULL;

--@SPLIT@

-- Index pour le cron sender : il va chercher les rows par owner ET filtrer
-- celles qui ont un token APNs (à envoyer en plus du web push).
CREATE INDEX IF NOT EXISTS idx_push_subs_apns_lookup
  ON public.push_subscriptions (client_id)
  WHERE apns_token IS NOT NULL;

--@SPLIT@

COMMENT ON COLUMN public.push_subscriptions.apns_token IS
  'Token APNs (Apple Push Notification service) du device iOS natif. NULL pour les subs Web Push (PWA).';
