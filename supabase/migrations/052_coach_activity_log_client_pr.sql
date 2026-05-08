-- 052_coach_activity_log_client_insert.sql (numéro 052)
-- BUG : plusieurs hooks côté CLIENT insèrent dans coach_activity_log :
--   - useLogs.notifyCoachPR : activity_type='client_pr' (shippé aujourd'hui)
--   - useFuel : activity_type='client_goals_changed' (pré-existant)
-- La policy RLS coach_activity_log_own (021) exige
-- coaches.email = auth.jwt()->>'email' — le JWT du client ≠ email du
-- coach, donc les INSERT échouent silencieusement (catch swallow côté
-- client). Le coach ne voit jamais ces events dans sa timeline.
--
-- Fix : policy INSERT-only ouverte au client connecté, strictement bornée :
--   - le client_id DOIT correspondre à une row clients dont l'email match
--     le JWT du caller
--   - le coach_id DOIT être le coach_id de ce même client
-- → un client peut INSÉRER des events SUR LUI-MÊME envers SON coach,
-- mais ni modifier ni supprimer ni voir d'autres events. La policy
-- coach_activity_log_own (SELECT/UPDATE/DELETE par le coach) reste
-- intacte.

BEGIN;

DROP POLICY IF EXISTS coach_activity_log_client_pr ON public.coach_activity_log;
DROP POLICY IF EXISTS coach_activity_log_client_insert ON public.coach_activity_log;
CREATE POLICY coach_activity_log_client_insert ON public.coach_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = coach_activity_log.client_id
        AND c.coach_id = coach_activity_log.coach_id
        AND LOWER(c.email) = LOWER(auth.jwt()->>'email')
    )
  );

COMMIT;
