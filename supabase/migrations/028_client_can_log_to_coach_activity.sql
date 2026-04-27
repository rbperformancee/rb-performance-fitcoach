-- =============================================
-- 028 : Permet au client d'inserer dans coach_activity_log
-- =============================================
-- Necessaire pour que les changements d'objectifs nutrition (cote client)
-- apparaissent dans le journal du coach. RLS de 021 limitait au coach
-- proprietaire ; on ajoute une policy INSERT pour le client lui-meme.

BEGIN;

CREATE POLICY coach_activity_log_client_insert ON coach_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Le client ne peut inserer que dans le journal de SON coach
    -- ET uniquement avec client_id pointant sur lui-meme
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = coach_activity_log.client_id
        AND clients.coach_id = coach_activity_log.coach_id
        AND clients.email = auth.jwt()->>'email'
    )
  );

COMMIT;
