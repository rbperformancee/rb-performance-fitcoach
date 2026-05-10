-- Fix RLS — audit pre-launch
--
-- Targets découverts par audit :
--  1. bookings_coach (005) : policy too-broad — déjà absente en prod, on confirme drop
--  2. client_measurements (014) : table jamais créée en prod (migration 014 pas appliquée),
--     on skip pour ne pas erreur
--  3. live_sessions sessions/session_sets (059) : policies user_id (colonne inexistante)
--     + coach_id=auth.uid() (fail pour coachs legacy). On fixe avec pattern id+email.
--
-- Tout enveloppé en DO blocks pour idempotence + skip si table absente.

DO $$
BEGIN
  -- ===== 1. bookings : drop la policy too-broad si elle existe =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    DROP POLICY IF EXISTS "bookings_coach" ON public.bookings;
    DROP POLICY IF EXISTS bookings_coach_own ON public.bookings;

    EXECUTE $sql$
      CREATE POLICY bookings_coach_own ON public.bookings
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients cl
            JOIN public.coaches co ON co.id = cl.coach_id
            WHERE cl.id = bookings.client_id
              AND (auth.uid()::text = co.id::text OR auth.jwt()->>'email' = co.email)
          )
        )
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  -- ===== 2. client_measurements : seulement si la table existe =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_measurements') THEN
    DROP POLICY IF EXISTS client_meas_self_all ON public.client_measurements;
    DROP POLICY IF EXISTS client_meas_coach_read ON public.client_measurements;
    DROP POLICY IF EXISTS client_meas_client_own ON public.client_measurements;
    DROP POLICY IF EXISTS client_meas_coach_read_v2 ON public.client_measurements;

    EXECUTE $sql$
      CREATE POLICY client_meas_client_own ON public.client_measurements
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = client_id
              AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = client_id
              AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY client_meas_coach_read_v2 ON public.client_measurements
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients cl
            JOIN public.coaches co ON co.id = cl.coach_id
            WHERE cl.id = client_id
              AND (auth.uid()::text = co.id::text OR auth.jwt()->>'email' = co.email)
          )
        )
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  -- ===== 3. live_sessions : sessions =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
    DROP POLICY IF EXISTS sessions_client_own ON public.sessions;
    DROP POLICY IF EXISTS sessions_coach_read ON public.sessions;

    EXECUTE $sql$
      CREATE POLICY sessions_client_own ON public.sessions
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = sessions.client_id
              AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = sessions.client_id
              AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY sessions_coach_read ON public.sessions
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients cl
            JOIN public.coaches co ON co.id = cl.coach_id
            WHERE cl.id = sessions.client_id
              AND (auth.uid()::text = co.id::text OR auth.jwt()->>'email' = co.email)
          )
        )
    $sql$;
  END IF;
END$$;

DO $$
BEGIN
  -- ===== 3 bis. live_sessions : session_sets =====
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_sets') THEN
    DROP POLICY IF EXISTS session_sets_client_own ON public.session_sets;
    DROP POLICY IF EXISTS session_sets_coach_read ON public.session_sets;

    EXECUTE $sql$
      CREATE POLICY session_sets_client_own ON public.session_sets
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.clients c ON c.id = s.client_id
            WHERE s.id = session_id
              AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.clients c ON c.id = s.client_id
            WHERE s.id = session_id
              AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY session_sets_coach_read ON public.session_sets
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.clients cl ON cl.id = s.client_id
            JOIN public.coaches co ON co.id = cl.coach_id
            WHERE s.id = session_id
              AND (auth.uid()::text = co.id::text OR auth.jwt()->>'email' = co.email)
          )
        )
    $sql$;
  END IF;
END$$;
