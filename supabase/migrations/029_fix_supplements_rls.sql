-- =============================================
-- 029 : Fix RLS supplements (auth.users -> auth.jwt())
-- =============================================
-- Migration 019 a utilise (SELECT email FROM auth.users WHERE id = auth.uid())
-- ce qui declenche "permission denied for table users" pour le role anon/auth.
-- Le client ne peut donc ni lire ni inserer ses supplements.
-- Pattern correct (cf. 005) : auth.jwt()->>'email'.

BEGIN;

-- Drop des anciennes policies cassees
DROP POLICY IF EXISTS "client_read_own_supplements"   ON client_supplements;
DROP POLICY IF EXISTS "client_insert_own_supplements" ON client_supplements;
DROP POLICY IF EXISTS "client_update_own_supplements" ON client_supplements;
DROP POLICY IF EXISTS "client_delete_own_supplements" ON client_supplements;
DROP POLICY IF EXISTS "coach_manage_client_supplements" ON client_supplements;

DROP POLICY IF EXISTS "client_read_own_sup_logs"   ON supplement_logs;
DROP POLICY IF EXISTS "client_insert_own_sup_logs" ON supplement_logs;
DROP POLICY IF EXISTS "client_update_own_sup_logs" ON supplement_logs;
DROP POLICY IF EXISTS "coach_read_sup_logs"        ON supplement_logs;

-- =============================================
-- client_supplements
-- =============================================
CREATE POLICY client_supplements_client_all ON client_supplements
  FOR ALL TO authenticated
  USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt()->>'email')
  )
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY client_supplements_coach_all ON client_supplements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients cl
      JOIN coaches c ON c.id = cl.coach_id
      WHERE cl.id = client_supplements.client_id
        AND c.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients cl
      JOIN coaches c ON c.id = cl.coach_id
      WHERE cl.id = client_supplements.client_id
        AND c.email = auth.jwt()->>'email'
    )
  );

-- =============================================
-- supplement_logs
-- =============================================
CREATE POLICY supplement_logs_client_all ON supplement_logs
  FOR ALL TO authenticated
  USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt()->>'email')
  )
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY supplement_logs_coach_select ON supplement_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients cl
      JOIN coaches c ON c.id = cl.coach_id
      WHERE cl.id = supplement_logs.client_id
        AND c.email = auth.jwt()->>'email'
    )
  );

COMMIT;
