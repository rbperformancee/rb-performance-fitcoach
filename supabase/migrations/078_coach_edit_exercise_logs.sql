-- =============================================
-- 078 : coach peut UPDATE exercise_logs de ses clients
-- =============================================
-- La policy existante exercise_logs_coach (migration 005) ne donnait que
-- SELECT au coach. Quand un client se trompe sur un poids (ex : tape 40
-- au lieu de 80), on veut que le coach puisse corriger directement depuis
-- la modale détail séance.
--
-- Restriction de sécurité : seulement les clients RATTACHÉS au coach (via
-- clients.coach_id = coaches.id where coaches.email = jwt.email).

DROP POLICY IF EXISTS "exercise_logs_coach_update" ON exercise_logs;
CREATE POLICY "exercise_logs_coach_update" ON exercise_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE LOWER(c.email) = LOWER(auth.jwt()->>'email')
        AND cl.id = exercise_logs.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE LOWER(c.email) = LOWER(auth.jwt()->>'email')
        AND cl.id = exercise_logs.client_id
    )
  );
