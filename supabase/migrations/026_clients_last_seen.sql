-- =============================================
-- 026 : Tracking de la derniere connexion client
-- =============================================
-- Permet au coach de detecter qu'un client est passe sur l'app
-- meme s'il n'a logue aucune action (juste consulte son programme).

BEGIN;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_last_seen ON clients(last_seen_at DESC NULLS LAST);

COMMIT;
