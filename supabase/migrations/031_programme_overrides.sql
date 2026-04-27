-- =============================================
-- 031 : Overrides client sur le programme du coach
-- =============================================
-- Permet au client de :
--  - Reporter une seance (-> programmes.programme_start_date += 1 day)
--  - Marquer une journee de repos (idem + log)
--  - Remplacer un exercice (substitution custom name/reps/tempo/rest)
--  - Reordonner les exercices d'une seance (custom order)
--
-- Reporter/Repos = update direct sur programmes (pas de table dediee).
-- Remplacer/Reordonner = stockage par (client, programme, week, session)
-- dans la table ci-dessous.

BEGIN;

CREATE TABLE IF NOT EXISTS programme_overrides (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  programme_id  UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  week_index    INTEGER NOT NULL,    -- 0-based
  session_index INTEGER NOT NULL,    -- 0-based dans la semaine

  -- Substitutions par index original :
  -- { "0": { "name": "Bench haltere", "rawReps": "4X8", "tempo": "3010", "rest": "2 min", "vidUrl": null }, "2": {...} }
  exercise_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Nouveau ordre comme array d'index originaux : [2, 0, 3, 1]
  -- NULL = ordre par defaut du programme
  exercise_order JSONB,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (client_id, programme_id, week_index, session_index)
);

CREATE INDEX IF NOT EXISTS idx_programme_overrides_client_prog
  ON programme_overrides(client_id, programme_id);

ALTER TABLE programme_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY programme_overrides_client_all ON programme_overrides
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (SELECT LOWER(email) FROM clients WHERE clients.id = programme_overrides.client_id)
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (SELECT LOWER(email) FROM clients WHERE clients.id = programme_overrides.client_id)
  );

CREATE POLICY programme_overrides_coach_select ON programme_overrides
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients cl
      JOIN coaches c ON c.id = cl.coach_id
      WHERE cl.id = programme_overrides.client_id
        AND c.email = auth.jwt()->>'email'
    )
  );

-- Compteur de jours de repos pour stats coach
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS rest_days_count INTEGER DEFAULT 0;
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS reported_days_count INTEGER DEFAULT 0;

COMMIT;
