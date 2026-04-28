-- Migration 034 — Complete RLS coverage
--
-- Audit pre-launch a revele 14 tables sans RLS dont 3 critiques :
-- coaches (data leak emails/stripe), onboarding_forms (data health),
-- super_admins (liste admins exposee).
--
-- Cette migration :
--   1. Enable RLS sur toutes les tables sensibles
--   2. Ajoute des policies basees sur le pattern existant (auth.uid +
--      relation coach-client) pour les flows legitimes
--   3. service_role bypass RLS de toute facon (les crons + API endpoints
--      Vercel utilisent SUPABASE_SERVICE_ROLE_KEY → pas impactes)
--
-- Apply : via Supabase Dashboard → SQL Editor → paste + run
-- Rollback : DROP POLICY... + ALTER TABLE ... DISABLE ROW LEVEL SECURITY

-- ===== 1. coaches (CRITIQUE — emails/stripe/payment_link) =====
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Coach peut tout faire sur sa propre row
DROP POLICY IF EXISTS coaches_self_all ON coaches;
CREATE POLICY coaches_self_all ON coaches FOR ALL USING (
  auth.uid()::text = id::text
  OR auth.jwt()->>'email' = email
);

-- Clients peuvent SELECT le coach auquel ils sont rattaches
-- (pour afficher le branding, logo, accent_color cote client)
DROP POLICY IF EXISTS coaches_select_by_clients ON coaches;
CREATE POLICY coaches_select_by_clients ON coaches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.coach_id = coaches.id
      AND (auth.uid()::text = clients.id::text
        OR auth.jwt()->>'email' = clients.email)
  )
);

-- Anon users peuvent lookup un coach via invitation valide
-- (flow JoinPage : /join?token=... lit le coach_id puis le coach)
DROP POLICY IF EXISTS coaches_select_via_invitation ON coaches;
CREATE POLICY coaches_select_via_invitation ON coaches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.coach_id = coaches.id
      AND invitations.status = 'pending'
      AND invitations.expires_at > NOW()
  )
);

-- Profil public coach via slug (page /coach/:slug ou /rejoindre/:slug)
-- Limit: anon can read coach row si slug existe (revele le profil public)
DROP POLICY IF EXISTS coaches_public_via_slug ON coaches;
CREATE POLICY coaches_public_via_slug ON coaches FOR SELECT USING (
  coach_slug IS NOT NULL
);

-- ===== 2. coach_notes (private notes coach sur clients) =====
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_notes_owner ON coach_notes;
CREATE POLICY coach_notes_owner ON coach_notes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.id = coach_notes.coach_id
      AND (auth.uid()::text = coaches.id::text
        OR auth.jwt()->>'email' = coaches.email)
  )
);

-- ===== 3. onboarding_forms (CRITIQUE — health data) =====
ALTER TABLE onboarding_forms ENABLE ROW LEVEL SECURITY;

-- Client owner
DROP POLICY IF EXISTS onboarding_forms_client ON onboarding_forms;
CREATE POLICY onboarding_forms_client ON onboarding_forms FOR ALL USING (
  auth.uid()::text = client_id::text
  OR auth.jwt()->>'email' IN (SELECT email FROM clients WHERE id = onboarding_forms.client_id)
);

-- Coach peut lire l'onboarding de ses clients
DROP POLICY IF EXISTS onboarding_forms_coach_read ON onboarding_forms;
CREATE POLICY onboarding_forms_coach_read ON onboarding_forms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = onboarding_forms.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 4. weekly_checkins (health data) =====
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_checkins_client ON weekly_checkins;
CREATE POLICY weekly_checkins_client ON weekly_checkins FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS weekly_checkins_coach_read ON weekly_checkins;
CREATE POLICY weekly_checkins_coach_read ON weekly_checkins FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = weekly_checkins.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 5. exercise_logs (training data) =====
-- Note: avait deja 2 policies definies mais RLS desactive — on l'active
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- ===== 6. transformation_sessions =====
ALTER TABLE transformation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transformation_sessions_client ON transformation_sessions;
CREATE POLICY transformation_sessions_client ON transformation_sessions FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS transformation_sessions_coach_read ON transformation_sessions;
CREATE POLICY transformation_sessions_coach_read ON transformation_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = transformation_sessions.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 7. session_completions =====
ALTER TABLE session_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_completions_client ON session_completions;
CREATE POLICY session_completions_client ON session_completions FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS session_completions_coach_read ON session_completions;
CREATE POLICY session_completions_coach_read ON session_completions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = session_completions.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 8. session_live =====
ALTER TABLE session_live ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_live_client ON session_live;
CREATE POLICY session_live_client ON session_live FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS session_live_coach_read ON session_live;
CREATE POLICY session_live_coach_read ON session_live FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = session_live.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 9. bookings (appointments) =====
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_client ON bookings;
CREATE POLICY bookings_client ON bookings FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS bookings_coach ON bookings;
CREATE POLICY bookings_coach ON bookings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM coaches WHERE coaches.id = bookings.coach_id
      AND (auth.uid()::text = coaches.id::text OR auth.jwt()->>'email' = coaches.email)
  )
);

-- ===== 10. coach_slots (creneaux dispo) =====
ALTER TABLE coach_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_slots_owner ON coach_slots;
CREATE POLICY coach_slots_owner ON coach_slots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM coaches WHERE coaches.id = coach_slots.coach_id
      AND (auth.uid()::text = coaches.id::text OR auth.jwt()->>'email' = coaches.email)
  )
);

-- Lecture publique des slots (pour les clients qui veulent booker)
DROP POLICY IF EXISTS coach_slots_public_read ON coach_slots;
CREATE POLICY coach_slots_public_read ON coach_slots FOR SELECT USING (TRUE);

-- ===== 11. coach_messages_flash =====
ALTER TABLE coach_messages_flash ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_messages_flash_owner ON coach_messages_flash;
CREATE POLICY coach_messages_flash_owner ON coach_messages_flash FOR ALL USING (
  EXISTS (
    SELECT 1 FROM coaches WHERE coaches.id = coach_messages_flash.coach_id
      AND (auth.uid()::text = coaches.id::text OR auth.jwt()->>'email' = coaches.email)
  )
);

-- Lecture par les clients du coach
DROP POLICY IF EXISTS coach_messages_flash_clients_read ON coach_messages_flash;
CREATE POLICY coach_messages_flash_clients_read ON coach_messages_flash FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.coach_id = coach_messages_flash.coach_id
      AND (auth.uid()::text = clients.id::text OR auth.jwt()->>'email' = clients.email)
  )
);

-- ===== 12. push_subscriptions =====
-- Note: 2 policies deja definies. On active RLS.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ===== 13. client_badges =====
ALTER TABLE client_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_badges_client ON client_badges;
CREATE POLICY client_badges_client ON client_badges FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS client_badges_coach_read ON client_badges;
CREATE POLICY client_badges_coach_read ON client_badges FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = client_badges.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 14. super_admins (CRITIQUE — liste admins) =====
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Seuls les super admins eux-memes voient la liste
DROP POLICY IF EXISTS super_admins_self ON super_admins;
CREATE POLICY super_admins_self ON super_admins FOR SELECT USING (
  auth.jwt()->>'email' = email
);

-- ===== Verification post-migration =====
-- Apres apply, refaire le SQL audit pour verifier que toutes les tables
-- 🔴 sont devenues ✅ ou 🟠 :
--
-- SELECT c.relname, c.relrowsecurity, COUNT(p.polname) AS policy_count
-- FROM pg_class c
-- LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relrowsecurity ASC;
