-- 016_sentinel.sql
-- Sentinel — agent IA business pour coachs Pro/Elite/Founding
-- Tables: sentinel_cards (feed), platform_benchmarks (anonymises), sentinel_mistral_logs (cost tracking)

-- =============================================
-- 1. SENTINEL CARDS — feed principal
-- =============================================
CREATE TABLE IF NOT EXISTS sentinel_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('price_intel', 'ranking', 'daily_playbook', 'revenue_unblocker')),
  priority SMALLINT NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cta_label TEXT,
  cta_action TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Idempotency pour cron (evite les doublons si un cron tourne 2 fois)
  dedupe_key TEXT,
  CONSTRAINT uniq_dedupe UNIQUE (coach_id, dedupe_key)
);

-- Index pour le feed: cards actives triees par priorite
CREATE INDEX idx_sc_coach_status ON sentinel_cards(coach_id, status, priority DESC)
  WHERE status = 'active';

-- Index pour le cron d'expiration
CREATE INDEX idx_sc_expires ON sentinel_cards(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'active';


-- =============================================
-- 2. PLATFORM BENCHMARKS — data anonymisee
-- =============================================
CREATE TABLE IF NOT EXISTS platform_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key TEXT NOT NULL,
  metric TEXT NOT NULL,
  p10 NUMERIC,
  p50 NUMERIC,
  p90 NUMERIC,
  median_value NUMERIC,
  top10_behavior JSONB,
  sample_size INTEGER NOT NULL CHECK (sample_size >= 10),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_benchmark ON platform_benchmarks(bucket_key, metric, computed_at);


-- =============================================
-- 3. SENTINEL MISTRAL LOGS — cost tracking
-- =============================================
CREATE TABLE IF NOT EXISTS sentinel_mistral_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id),
  module TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost_usd NUMERIC(10,6),
  status TEXT CHECK (status IN ('success', 'parse_error', 'mistral_error', 'timeout')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================
-- 4. RLS — strict isolation
-- =============================================

-- sentinel_cards: coach voit UNIQUEMENT ses propres cartes
ALTER TABLE sentinel_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_select_own" ON sentinel_cards
  FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "sc_update_own" ON sentinel_cards
  FOR UPDATE USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- PAS de policy INSERT/DELETE pour les users → via service_role dans les crons

-- platform_benchmarks: lecture libre (data deja anonymisee, pas de coach_id)
ALTER TABLE platform_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_select_all" ON platform_benchmarks
  FOR SELECT USING (true);

-- sentinel_mistral_logs: PAS de policy → seul service_role peut lire (debug/cost monitoring)
ALTER TABLE sentinel_mistral_logs ENABLE ROW LEVEL SECURITY;
