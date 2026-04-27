-- =============================================
-- 030 : RLS case-insensitive sur tables client
-- =============================================
-- Supabase Auth normalise auth.jwt()->>'email' en minuscules.
-- Si une row clients.email a ete creee avec une majuscule, la policy
-- "auth.jwt()->>'email' = email" echoue silencieusement et tout
-- insert est rejete avec "new row violates row-level security".
--
-- Fix : LOWER() sur les 2 cotes.

BEGIN;

-- nutrition_logs
DROP POLICY IF EXISTS "nutrition_logs_client" ON nutrition_logs;
CREATE POLICY nutrition_logs_client ON nutrition_logs
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = nutrition_logs.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = nutrition_logs.client_id
    )
  );

-- daily_tracking
DROP POLICY IF EXISTS "daily_tracking_client" ON daily_tracking;
CREATE POLICY daily_tracking_client ON daily_tracking
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = daily_tracking.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = daily_tracking.client_id
    )
  );

-- run_logs
DROP POLICY IF EXISTS "run_logs_client" ON run_logs;
CREATE POLICY run_logs_client ON run_logs
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = run_logs.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = run_logs.client_id
    )
  );

-- weight_logs
DROP POLICY IF EXISTS "weight_logs_client" ON weight_logs;
CREATE POLICY weight_logs_client ON weight_logs
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = weight_logs.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = weight_logs.client_id
    )
  );

-- session_logs
DROP POLICY IF EXISTS "session_logs_client" ON session_logs;
CREATE POLICY session_logs_client ON session_logs
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = session_logs.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = session_logs.client_id
    )
  );

-- exercise_logs
DROP POLICY IF EXISTS "exercise_logs_client" ON exercise_logs;
CREATE POLICY exercise_logs_client ON exercise_logs
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = exercise_logs.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = exercise_logs.client_id
    )
  );

-- session_rpe
DROP POLICY IF EXISTS "session_rpe_client" ON session_rpe;
CREATE POLICY session_rpe_client ON session_rpe
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = session_rpe.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = session_rpe.client_id
    )
  );

-- nutrition_goals
DROP POLICY IF EXISTS "nutrition_goals_client" ON nutrition_goals;
CREATE POLICY nutrition_goals_client ON nutrition_goals
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = nutrition_goals.client_id
    )
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') IN (
      SELECT LOWER(email) FROM clients WHERE clients.id = nutrition_goals.client_id
    )
  );

-- En complement : normaliser tous les emails clients en minuscules
-- pour que les autres policies (ailleurs dans le codebase) marchent aussi
UPDATE clients SET email = LOWER(email) WHERE email != LOWER(email);

COMMIT;
