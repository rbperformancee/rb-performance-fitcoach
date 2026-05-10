-- Brouillon / Publier / Planifier
--
-- published_at NULL              = brouillon (visible coach uniquement)
-- published_at <= NOW()          = en cours (visible client)
-- published_at > NOW()           = planifié (pas encore visible client)
--
-- Le client side filtre published_at <= NOW() AND IS NOT NULL.
-- L'ancien programme reste visible jusqu'à la bascule.

ALTER TABLE programmes ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill : tous les programmes is_active=true existants sont considérés
-- "publiés au moment de leur upload" pour préserver l'affichage côté client.
UPDATE programmes
   SET published_at = uploaded_at
 WHERE is_active = TRUE
   AND published_at IS NULL;

-- Index pour la query côté client (active + published_at filter)
CREATE INDEX IF NOT EXISTS idx_programmes_client_published
  ON programmes (client_id, is_active, published_at DESC)
  WHERE is_active = TRUE;
