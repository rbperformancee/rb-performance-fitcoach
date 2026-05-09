-- 054_weight_logs_coach_write.sql
-- weight_logs (migration 005) avait une policy coach SELECT-only. Pour
-- permettre la migration des pesées historiques d'un client depuis une
-- ancienne app (Trainerize, Hexfit, balance connectée Withings…), le
-- coach doit pouvoir INSERT/UPDATE/DELETE sur les rows de SES clients.
--
-- Pattern email-based identique aux autres policies coach (cf. 030/034).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'weight_logs'
  ) THEN
    RAISE NOTICE 'Table public.weight_logs absente — skip cette migration.';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS weight_logs_coach_write ON public.weight_logs';
  EXECUTE $POL$
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
      )
  $POL$;
END$$;

COMMIT;
