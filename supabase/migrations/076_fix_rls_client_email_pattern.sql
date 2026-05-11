-- Fix systémique : 7 tables ont la même policy cassée qu'onboarding_forms
-- (migration 074 a déjà fixé celle-ci). Toutes utilisent uniquement
-- `auth.uid()::text = client_id::text` qui FAIL pour les clients invités
-- (clients.id ≠ auth.uid car le row clients existe avant l'auth.users).
--
-- Pattern fixe : (uid match OR email match LOWER), via EXISTS sur clients.
-- Tables impactées :
--   - session_completions (client finir une séance)
--   - weekly_checkins (bilan hebdo client)
--   - bookings (réservation créneau)
--   - session_live (live sessions in-progress)
--   - transformation_sessions (logs séance avec ressenti)
--   - client_badges (badges gamification)
--   - coach_messages_flash (recipient client)
--
-- Sans ce fix, AUCUN client invité ne peut écrire dans ces tables.
-- Léo aurait été bloqué sur chaque action après onboarding.

-- === session_completions ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='session_completions') THEN
    DROP POLICY IF EXISTS session_completions_client ON public.session_completions;
    EXECUTE $sql$
      CREATE POLICY session_completions_client ON public.session_completions
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = session_completions.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = session_completions.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
    $sql$;
  END IF;
END$$;

-- === weekly_checkins ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='weekly_checkins') THEN
    DROP POLICY IF EXISTS weekly_checkins_client ON public.weekly_checkins;
    EXECUTE $sql$
      CREATE POLICY weekly_checkins_client ON public.weekly_checkins
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = weekly_checkins.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = weekly_checkins.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
    $sql$;
  END IF;
END$$;

-- === bookings ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bookings') THEN
    DROP POLICY IF EXISTS bookings_client_own ON public.bookings;
    EXECUTE $sql$
      CREATE POLICY bookings_client_own ON public.bookings
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = bookings.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = bookings.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
    $sql$;
  END IF;
END$$;

-- === session_live ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='session_live') THEN
    DROP POLICY IF EXISTS session_live_client ON public.session_live;
    EXECUTE $sql$
      CREATE POLICY session_live_client ON public.session_live
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = session_live.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = session_live.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
    $sql$;
  END IF;
END$$;

-- === transformation_sessions ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transformation_sessions') THEN
    DROP POLICY IF EXISTS transformation_sessions_client ON public.transformation_sessions;
    EXECUTE $sql$
      CREATE POLICY transformation_sessions_client ON public.transformation_sessions
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = transformation_sessions.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = transformation_sessions.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
    $sql$;
  END IF;
END$$;

-- === client_badges ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_badges') THEN
    DROP POLICY IF EXISTS client_badges_own ON public.client_badges;
    EXECUTE $sql$
      CREATE POLICY client_badges_own ON public.client_badges
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = client_badges.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = client_badges.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
    $sql$;
  END IF;
END$$;

-- === coach_messages_flash (recipient = client) ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coach_messages_flash') THEN
    DROP POLICY IF EXISTS coach_messages_flash_recipient ON public.coach_messages_flash;
    EXECUTE $sql$
      CREATE POLICY coach_messages_flash_recipient ON public.coach_messages_flash
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = coach_messages_flash.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = coach_messages_flash.client_id
              AND (auth.uid()::text = c.id::text
                   OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
          )
        )
    $sql$;
  END IF;
END$$;
