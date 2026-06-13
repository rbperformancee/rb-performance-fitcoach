-- Migration 113 — Fix subscription NOT NULL bloquant les inserts APNs
--
-- La 109 a dropé NOT NULL sur endpoint mais pas sur subscription, ce qui
-- bloque tous les inserts natifs (apns_token sans web push subscription).
-- Symptôme : message d'erreur "vérifie tes permissions" alors que iOS
-- livre bien le token (vibration AppDelegate OK).

ALTER TABLE public.push_subscriptions
  ALTER COLUMN subscription DROP NOT NULL;
