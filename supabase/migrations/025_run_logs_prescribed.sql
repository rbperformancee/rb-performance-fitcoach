-- =============================================
-- 025 : run_logs etendus pour les runs prescrits par le coach
-- =============================================
-- Quand un client log un run, on garde aussi la cible prescrite
-- (depuis le programme) pour comparer reel vs prescrit.
--
-- Si tous les target_* sont NULL = run libre (comme avant).
-- Si rempli = run prescrit qui a ete fait.

BEGIN;

ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS programme_id        UUID REFERENCES programmes(id) ON DELETE SET NULL;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS programme_week      INTEGER;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS programme_session   INTEGER;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS programme_run_index INTEGER;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS target_label        TEXT;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS target_distance     TEXT;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS target_duration     TEXT;
ALTER TABLE run_logs ADD COLUMN IF NOT EXISTS target_bpm          TEXT;

-- Index pour rapidement detecter si un run prescrit a ete fait
CREATE INDEX IF NOT EXISTS idx_run_logs_prog_run
  ON run_logs(client_id, programme_id, programme_week, programme_session, programme_run_index)
  WHERE programme_id IS NOT NULL;

COMMIT;
