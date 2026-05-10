-- notif_sent_at : timestamp où on a notifié le client de la dispo du programme
-- NULL = pas encore notifié (la cron peut le picker)
-- Non-NULL = déjà fait (évite les doublons)

ALTER TABLE programmes ADD COLUMN IF NOT EXISTS notif_sent_at TIMESTAMPTZ;

-- Backfill : tous les programmes is_active=true existants sont considérés
-- "déjà notifiés au moment de leur upload" — pas besoin de re-notifier
-- les vieux programmes au prochain run cron
UPDATE programmes
   SET notif_sent_at = uploaded_at
 WHERE is_active = TRUE
   AND notif_sent_at IS NULL
   AND published_at IS NOT NULL;

-- Index pour la query cron (pickup rapide des "à notifier")
CREATE INDEX IF NOT EXISTS idx_programmes_notif_pending
  ON programmes (published_at)
  WHERE is_active = TRUE AND notif_sent_at IS NULL;
