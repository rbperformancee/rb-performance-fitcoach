-- Migration 034 — Complete RLS coverage (SAFE VERSION)
--
-- Audit pre-launch a revele 14 tables sans RLS dont 3 critiques.
-- Cette migration :
--   1. Enable RLS sur les tables CRITIQUES + add policies (testees avec
--      pattern existant clients/programmes)
--   2. Pour les tables avec schema inconnu : enable RLS SANS policy
--      → bloque tout cote client. service_role bypass de toute facon.
--      Si l'app utilise ces tables cote client, on ajoutera policies after.
--
-- Apply : Supabase Dashboard → SQL Editor → paste + run
-- Si erreur sur une table : c'est que le schema differe, on adapte au cas par cas.

-- ===== 1. coaches (CRITIQUE — emails/stripe/payment_link) =====
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coaches_self_all ON coaches;
CREATE POLICY coaches_self_all ON coaches FOR ALL USING (
  auth.uid()::text = id::text
  OR auth.jwt()->>'email' = email
);

-- Clients peuvent SELECT le coach auquel ils sont rattaches
DROP POLICY IF EXISTS coaches_select_by_clients ON coaches;
CREATE POLICY coaches_select_by_clients ON coaches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.coach_id = coaches.id
      AND (auth.uid()::text = clients.id::text
        OR auth.jwt()->>'email' = clients.email)
  )
);

-- Profil public coach via slug (page /coach/:slug + JoinPage flow)
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

DROP POLICY IF EXISTS onboarding_forms_client ON onboarding_forms;
CREATE POLICY onboarding_forms_client ON onboarding_forms FOR ALL USING (
  auth.uid()::text = client_id::text
);

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

-- ===== 5. super_admins (CRITIQUE — liste admins) =====
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS super_admins_self ON super_admins;
CREATE POLICY super_admins_self ON super_admins FOR SELECT USING (
  auth.jwt()->>'email' = email
);

-- ===== 6. exercise_logs (avait deja 2 policies, RLS off) =====
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- ===== 7. push_subscriptions (avait deja 2 policies, RLS off) =====
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ===== 8-14. Tables au schema incertain : enable RLS sans policy =====
-- (= bloque cote client, service_role bypass de toute facon)
-- Si l'app utilise ces tables cote client, on ajoutera policies after.
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages_flash ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformation_sessions ENABLE ROW LEVEL SECURITY;

-- ===== Verification post-migration =====
-- SELECT c.relname, c.relrowsecurity, COUNT(p.polname) AS policy_count
-- FROM pg_class c LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
-- GROUP BY c.relname, c.relrowsecurity ORDER BY c.relrowsecurity ASC;
