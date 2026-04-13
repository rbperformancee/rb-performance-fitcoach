-- =============================================
-- 011 : CRM — tags + pipeline + activity feed
-- =============================================

-- Tags client (array de strings, par client — simple + rapide)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING gin(tags);

-- Pipeline status (pour la vue Kanban)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pipeline_status text DEFAULT 'new';
-- Valeurs : 'new' | 'active' | 'at_risk' | 'to_renew' | 'completed'
CREATE INDEX IF NOT EXISTS idx_clients_pipeline ON clients(pipeline_status);

-- Auto-set 'active' pour les clients existants avec subscription active
UPDATE clients SET pipeline_status = 'active'
WHERE pipeline_status = 'new' AND subscription_status = 'active';

-- Couleurs par defaut pour les tags les plus courants (suggestions)
-- Stockees cote frontend, pas besoin de table.

-- Activity log : tracking complet des interactions coach-client
CREATE TABLE IF NOT EXISTS coach_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  activity_type text NOT NULL,  -- 'note' | 'message' | 'programme' | 'call' | 'tag' | 'pipeline'
  details text,                 -- JSON serialise ou texte libre
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_coach_date ON coach_activity_log(coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_client_date ON coach_activity_log(client_id, created_at DESC);

-- Rappels automatiques (pour "Tu n'as pas contacte Thomas depuis 5 jours")
CREATE TABLE IF NOT EXISTS coach_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,   -- 'no_contact' | 'follow_up' | 'custom'
  message text NOT NULL,
  due_at timestamptz,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_coach ON coach_reminders(coach_id, completed, due_at);
