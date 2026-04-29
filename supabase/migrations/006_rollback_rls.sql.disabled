-- =============================================
-- 006 : ROLLBACK RLS from migration 005
-- Re-applique plus tard avec des policies testees une par une
-- =============================================

-- Drop toutes les policies de la migration 005
DROP POLICY IF EXISTS "clients_own" ON clients;
DROP POLICY IF EXISTS "clients_coach_read" ON clients;
DROP POLICY IF EXISTS "clients_coach_update" ON clients;
DROP POLICY IF EXISTS "programmes_client" ON programmes;
DROP POLICY IF EXISTS "programmes_coach" ON programmes;
DROP POLICY IF EXISTS "exercise_logs_client" ON exercise_logs;
DROP POLICY IF EXISTS "exercise_logs_coach" ON exercise_logs;
DROP POLICY IF EXISTS "session_logs_client" ON session_logs;
DROP POLICY IF EXISTS "session_logs_coach" ON session_logs;
DROP POLICY IF EXISTS "weight_logs_client" ON weight_logs;
DROP POLICY IF EXISTS "weight_logs_coach" ON weight_logs;
DROP POLICY IF EXISTS "session_rpe_client" ON session_rpe;
DROP POLICY IF EXISTS "session_rpe_coach" ON session_rpe;
DROP POLICY IF EXISTS "messages_client" ON messages;
DROP POLICY IF EXISTS "messages_coach" ON messages;
DROP POLICY IF EXISTS "coach_notes_coach" ON coach_notes;
DROP POLICY IF EXISTS "coaches_own" ON coaches;
DROP POLICY IF EXISTS "coaches_admin_read" ON coaches;
DROP POLICY IF EXISTS "push_subs_client" ON push_subscriptions;
DROP POLICY IF EXISTS "bookings_client" ON bookings;
DROP POLICY IF EXISTS "bookings_coach" ON bookings;
DROP POLICY IF EXISTS "nutrition_logs_client" ON nutrition_logs;
DROP POLICY IF EXISTS "nutrition_logs_coach" ON nutrition_logs;
DROP POLICY IF EXISTS "daily_tracking_client" ON daily_tracking;
DROP POLICY IF EXISTS "daily_tracking_coach" ON daily_tracking;
DROP POLICY IF EXISTS "run_logs_client" ON run_logs;
DROP POLICY IF EXISTS "run_logs_coach" ON run_logs;
DROP POLICY IF EXISTS "nutrition_goals_client" ON nutrition_goals;
DROP POLICY IF EXISTS "nutrition_goals_coach" ON nutrition_goals;
DROP POLICY IF EXISTS "client_badges_client" ON client_badges;
DROP POLICY IF EXISTS "client_badges_coach" ON client_badges;
DROP POLICY IF EXISTS "super_admins_self" ON super_admins;

-- Desactiver RLS sur toutes les tables (retour a l'etat avant migration 005)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE programmes DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_rpe DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE coaches DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE run_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins DISABLE ROW LEVEL SECURITY;

-- IMPORTANT : garder RLS sur notification_logs (pas de policy = lecture/ecriture bloquee
-- sauf service_role, ce qui est le comportement voulu pour les crons)
-- ALTER TABLE notification_logs KEEP ROW LEVEL SECURITY ENABLED;
