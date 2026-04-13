-- =============================================
-- 010 : Coach business — objectif revenus + historique MRR
-- =============================================

-- Objectif mensuel de revenus du coach (EUR)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS monthly_revenue_goal integer DEFAULT 0;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS business_goals_set_at timestamptz;

-- Snapshots business pour tracker l'evolution (MRR/retention/score)
-- Une ligne par coach par jour (pour graphe 30j)
CREATE TABLE IF NOT EXISTS coach_business_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  mrr integer DEFAULT 0,           -- Monthly Recurring Revenue en EUR
  active_clients int DEFAULT 0,
  retention_pct int DEFAULT 0,     -- 0-100
  business_score int DEFAULT 0,    -- 0-100
  activity_score int DEFAULT 0,    -- 0-100 — % clients actifs (7j)
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_business_snapshots_coach_date
  ON coach_business_snapshots(coach_id, snapshot_date DESC);

-- Table d'objectifs mensuels historises (si le coach change son objectif)
CREATE TABLE IF NOT EXISTS coach_monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  month_start date NOT NULL,       -- premier jour du mois
  revenue_goal integer NOT NULL,
  revenue_actual integer,
  achieved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, month_start)
);

-- Badges coachs (gamification)
CREATE TABLE IF NOT EXISTS coach_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  badge_id text NOT NULL,          -- 'first_client', 'ten_active', 'streak_30', etc.
  earned_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, badge_id)
);
