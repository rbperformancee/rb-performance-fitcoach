-- Migration 108 — Hygiene push subscriptions
--
-- Apple Push Service invalide silencieusement les subscriptions au bout
-- de 2-4 semaines (token zombie : Apple repond 'sent ok' mais ne livre
-- rien). Pour eviter d'attendre que l'athlete se rende compte, on
-- automatise via cron :
--   - 14-21j  : email warning "tap to re-enable"
--   - >21j    : DELETE auto + email final
--
-- warned_at evite d'envoyer le warning email plus d'une fois par
-- subscription, sinon le client serait spamme tous les jours pendant
-- 7 jours. Null = pas encore averti, timestamp = date du dernier warn.

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS warned_at TIMESTAMPTZ NULL;

-- Index pour acceleration du cron qui filtre par age + warned_at
CREATE INDEX IF NOT EXISTS idx_push_subs_created_warned
ON push_subscriptions (created_at, warned_at)
WHERE endpoint LIKE 'https://web.push.apple.com/%';

COMMENT ON COLUMN push_subscriptions.warned_at IS
  'Date du dernier email warning envoye (anti-spam pour cron-push-hygiene)';
