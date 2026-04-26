-- =============================================
-- 021 : RLS manquante sur 6 tables (audit pre-launch 2026-04-26)
-- =============================================
-- Tables creees sans ENABLE RLS dans les migrations precedentes :
--   coach_business_snapshots, coach_monthly_goals, coach_badges (010)
--   coach_invitations (008)
--   coach_activity_log, coach_reminders (011)
-- Risque : tout user authentifie pouvait lire/ecrire ces tables avec la cle ANON.
-- Pattern applique : meme join coaches.email = auth.jwt()->>'email' que la 005.

BEGIN;

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE coach_business_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_monthly_goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_badges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_activity_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_reminders          ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES : un coach voit/modifie uniquement ses propres rows
-- =============================================

-- coach_business_snapshots
DROP POLICY IF EXISTS coach_business_snapshots_own ON coach_business_snapshots;
CREATE POLICY coach_business_snapshots_own ON coach_business_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_business_snapshots.coach_id
              AND coaches.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_business_snapshots.coach_id
              AND coaches.email = auth.jwt()->>'email')
  );

-- coach_monthly_goals
DROP POLICY IF EXISTS coach_monthly_goals_own ON coach_monthly_goals;
CREATE POLICY coach_monthly_goals_own ON coach_monthly_goals
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_monthly_goals.coach_id
              AND coaches.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_monthly_goals.coach_id
              AND coaches.email = auth.jwt()->>'email')
  );

-- coach_badges
DROP POLICY IF EXISTS coach_badges_own ON coach_badges;
CREATE POLICY coach_badges_own ON coach_badges
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_badges.coach_id
              AND coaches.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_badges.coach_id
              AND coaches.email = auth.jwt()->>'email')
  );

-- coach_invitations
DROP POLICY IF EXISTS coach_invitations_own ON coach_invitations;
CREATE POLICY coach_invitations_own ON coach_invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_invitations.coach_id
              AND coaches.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_invitations.coach_id
              AND coaches.email = auth.jwt()->>'email')
  );

-- coach_activity_log
DROP POLICY IF EXISTS coach_activity_log_own ON coach_activity_log;
CREATE POLICY coach_activity_log_own ON coach_activity_log
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_activity_log.coach_id
              AND coaches.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_activity_log.coach_id
              AND coaches.email = auth.jwt()->>'email')
  );

-- coach_reminders
DROP POLICY IF EXISTS coach_reminders_own ON coach_reminders;
CREATE POLICY coach_reminders_own ON coach_reminders
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_reminders.coach_id
              AND coaches.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM coaches
            WHERE coaches.id = coach_reminders.coach_id
              AND coaches.email = auth.jwt()->>'email')
  );

COMMIT;

-- =============================================
-- VERIFICATION (a executer apres pour valider)
-- =============================================
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('coach_business_snapshots','coach_monthly_goals','coach_badges',
--                     'coach_invitations','coach_activity_log','coach_reminders');
-- → toutes lignes doivent avoir rowsecurity = true
--
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('coach_business_snapshots','coach_monthly_goals','coach_badges',
--                     'coach_invitations','coach_activity_log','coach_reminders');
-- → 6 lignes (1 policy par table)
