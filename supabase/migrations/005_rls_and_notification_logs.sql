-- =============================================
-- 005 : RLS policies + notification_logs table
-- =============================================

-- Table de rate-limiting server-side pour les crons de relance
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type text NOT NULL,
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, type, sent_date)
);
CREATE INDEX IF NOT EXISTS idx_notif_logs_lookup ON notification_logs(client_id, type, sent_date);

-- =============================================
-- ENABLE RLS on all tables
-- =============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_rpe ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_badges ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLIENTS : le client voit sa propre row, le coach voit ses clients
-- =============================================
CREATE POLICY "clients_own" ON clients
  FOR ALL USING (
    auth.uid()::text = id::text
    OR auth.jwt()->>'email' = email
  );

CREATE POLICY "clients_coach_read" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches WHERE coaches.email = auth.jwt()->>'email'
        AND (coaches.id = clients.coach_id OR clients.coach_id IS NULL)
    )
  );

CREATE POLICY "clients_coach_update" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM coaches WHERE coaches.email = auth.jwt()->>'email'
        AND (coaches.id = clients.coach_id OR clients.coach_id IS NULL)
    )
  );

-- =============================================
-- PROGRAMMES : client voit les siens, coach CRUD sur ses clients
-- =============================================
CREATE POLICY "programmes_client" ON programmes
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id::text FROM clients WHERE clients.id = programmes.client_id
    )
    OR auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = programmes.client_id
    )
  );

CREATE POLICY "programmes_coach" ON programmes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = programmes.client_id
    )
  );

-- =============================================
-- EXERCISE_LOGS : client insert/select les siens, coach read
-- =============================================
CREATE POLICY "exercise_logs_client" ON exercise_logs
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = exercise_logs.client_id
    )
  );

CREATE POLICY "exercise_logs_coach" ON exercise_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = exercise_logs.client_id
    )
  );

-- =============================================
-- SESSION_LOGS : meme pattern
-- =============================================
CREATE POLICY "session_logs_client" ON session_logs
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = session_logs.client_id
    )
  );

CREATE POLICY "session_logs_coach" ON session_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = session_logs.client_id
    )
  );

-- =============================================
-- WEIGHT_LOGS
-- =============================================
CREATE POLICY "weight_logs_client" ON weight_logs
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = weight_logs.client_id
    )
  );

CREATE POLICY "weight_logs_coach" ON weight_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = weight_logs.client_id
    )
  );

-- =============================================
-- SESSION_RPE
-- =============================================
CREATE POLICY "session_rpe_client" ON session_rpe
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = session_rpe.client_id
    )
  );

CREATE POLICY "session_rpe_coach" ON session_rpe
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = session_rpe.client_id
    )
  );

-- =============================================
-- MESSAGES : client et coach voient les messages du client
-- =============================================
CREATE POLICY "messages_client" ON messages
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = messages.client_id
    )
  );

CREATE POLICY "messages_coach" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = messages.client_id
    )
  );

-- =============================================
-- COACH_NOTES : coach only
-- =============================================
CREATE POLICY "coach_notes_coach" ON coach_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM coaches WHERE coaches.email = auth.jwt()->>'email'
        AND coaches.id = coach_notes.coach_id
    )
  );

-- =============================================
-- COACHES : coach voit sa propre row
-- =============================================
CREATE POLICY "coaches_own" ON coaches
  FOR ALL USING (
    auth.jwt()->>'email' = email
  );

-- Super admin voit tous les coaches
CREATE POLICY "coaches_admin_read" ON coaches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt()->>'email')
  );

-- =============================================
-- PUSH_SUBSCRIPTIONS : client les siennes
-- =============================================
CREATE POLICY "push_subs_client" ON push_subscriptions
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = push_subscriptions.client_id
    )
  );

-- =============================================
-- NOTIFICATION_LOGS : service role only (pas de policy publique)
-- Les crons utilisent le service_role_key qui bypass RLS
-- =============================================

-- =============================================
-- BOOKINGS
-- =============================================
CREATE POLICY "bookings_client" ON bookings
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = bookings.client_id
    )
  );

CREATE POLICY "bookings_coach" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM coaches WHERE coaches.email = auth.jwt()->>'email')
  );

-- =============================================
-- NUTRITION_LOGS
-- =============================================
CREATE POLICY "nutrition_logs_client" ON nutrition_logs
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = nutrition_logs.client_id
    )
  );

CREATE POLICY "nutrition_logs_coach" ON nutrition_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = nutrition_logs.client_id
    )
  );

-- =============================================
-- DAILY_TRACKING
-- =============================================
CREATE POLICY "daily_tracking_client" ON daily_tracking
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = daily_tracking.client_id
    )
  );

CREATE POLICY "daily_tracking_coach" ON daily_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = daily_tracking.client_id
    )
  );

-- =============================================
-- RUN_LOGS
-- =============================================
CREATE POLICY "run_logs_client" ON run_logs
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = run_logs.client_id
    )
  );

CREATE POLICY "run_logs_coach" ON run_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = run_logs.client_id
    )
  );

-- =============================================
-- NUTRITION_GOALS
-- =============================================
CREATE POLICY "nutrition_goals_client" ON nutrition_goals
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = nutrition_goals.client_id
    )
  );

CREATE POLICY "nutrition_goals_coach" ON nutrition_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = nutrition_goals.client_id
    )
  );

-- =============================================
-- CLIENT_BADGES
-- =============================================
CREATE POLICY "client_badges_client" ON client_badges
  FOR ALL USING (
    auth.jwt()->>'email' IN (
      SELECT email FROM clients WHERE clients.id = client_badges.client_id
    )
  );

CREATE POLICY "client_badges_coach" ON client_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN clients cl ON cl.coach_id = c.id
      WHERE c.email = auth.jwt()->>'email'
        AND cl.id = client_badges.client_id
    )
  );

-- =============================================
-- SUPER_ADMINS : read only pour se detecter
-- =============================================
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins_self" ON super_admins
  FOR SELECT USING (auth.jwt()->>'email' = email);
