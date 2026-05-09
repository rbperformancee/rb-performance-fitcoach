-- 054_weight_logs_coach_write.sql
-- weight_logs (migration 005) avait une policy coach SELECT-only. Pour
-- permettre la migration des pesées historiques d'un client depuis une
-- ancienne app (Trainerize, Hexfit, balance connectée Withings…), le
-- coach doit pouvoir INSERT/UPDATE/DELETE sur les rows de SES clients.
--
-- Pattern email-based identique aux autres policies coach (cf. 030/034).

BEGIN;

-- Garde la policy SELECT existante. Ajoute INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS weight_logs_coach_write ON public.weight_logs;
CREATE POLICY weight_logs_coach_write ON public.weight_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      JOIN public.clients cl ON cl.coach_id = c.id
      WHERE cl.id = weight_logs.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaches c
      JOIN public.clients cl ON cl.coach_id = c.id
      WHERE cl.id = weight_logs.client_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  );

COMMIT;
