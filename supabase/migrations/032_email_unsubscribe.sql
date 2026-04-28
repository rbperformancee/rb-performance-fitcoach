-- Migration 032 — Email unsubscribe (RFC 8058 / Gmail Feb 2024 requirement)
--
-- Ajoute les colonnes unsub_* sur coaches et clients pour gerer
-- les opt-out granulaires demandes par /api/unsubscribe.
--
-- Tous les emails non-transactionnels DOIVENT verifier ces flags
-- avant l'envoi (cron-coach-weekly-digest, cron-founder-checkin).
--
-- Apply: supabase db push, ou via Supabase Studio SQL Editor.

-- ===== coaches =====
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS unsub_all BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsub_weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsub_founder_checkin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsub_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsub_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN coaches.unsub_all IS 'Global opt-out — bloque tous les emails non-transactionnels';
COMMENT ON COLUMN coaches.unsub_weekly_digest IS 'Opt-out du digest hebdomadaire coach';
COMMENT ON COLUMN coaches.unsub_founder_checkin IS 'Opt-out du checkin founder periodique';
COMMENT ON COLUMN coaches.unsub_marketing IS 'Opt-out marketing (annonces, beta, news)';

-- Trigger pour timestamp auto-update
CREATE OR REPLACE FUNCTION update_unsub_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.unsub_all IS DISTINCT FROM NEW.unsub_all
   OR OLD.unsub_weekly_digest IS DISTINCT FROM NEW.unsub_weekly_digest
   OR OLD.unsub_founder_checkin IS DISTINCT FROM NEW.unsub_founder_checkin
   OR OLD.unsub_marketing IS DISTINCT FROM NEW.unsub_marketing) THEN
    NEW.unsub_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coaches_unsub_timestamp ON coaches;
CREATE TRIGGER coaches_unsub_timestamp
BEFORE UPDATE ON coaches
FOR EACH ROW EXECUTE FUNCTION update_unsub_timestamp();

-- ===== clients =====
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS unsub_all BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsub_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsub_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN clients.unsub_all IS 'Global opt-out — bloque tous les emails non-transactionnels';
COMMENT ON COLUMN clients.unsub_marketing IS 'Opt-out marketing/news client';

DROP TRIGGER IF EXISTS clients_unsub_timestamp ON clients;
CREATE TRIGGER clients_unsub_timestamp
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_unsub_timestamp();

-- ===== Index pour cron filtering =====
-- Les crons font souvent: WHERE unsub_all=false AND unsub_<type>=false
-- Index partiel pour eviter de scanner les unsub.
CREATE INDEX IF NOT EXISTS idx_coaches_unsub_all_false
  ON coaches (id) WHERE unsub_all = FALSE;

CREATE INDEX IF NOT EXISTS idx_clients_unsub_all_false
  ON clients (id) WHERE unsub_all = FALSE;

-- ===== RLS — l'API unsubscribe utilise service_role donc bypass RLS =====
-- Pas besoin de modifier les policies existantes. /api/unsubscribe.js
-- utilise SUPABASE_SERVICE_ROLE_KEY qui bypass RLS.

-- ===== Verification =====
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('coaches','clients') AND column_name LIKE 'unsub_%'
-- ORDER BY table_name, column_name;
