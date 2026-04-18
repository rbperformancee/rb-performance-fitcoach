-- 015_coach_plans.sql
-- Plans d'abonnement dynamiques par coach (remplace les constantes hardcodées)

-- 1. Table coach_plans
CREATE TABLE IF NOT EXISTS coach_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_per_month NUMERIC(10,2) NOT NULL CHECK (price_per_month >= 0),
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  billing_type TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_type IN ('monthly', 'upfront')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_plans_name_unique UNIQUE (coach_id, name)
);

CREATE INDEX IF NOT EXISTS idx_coach_plans_coach_id ON coach_plans(coach_id) WHERE is_active = true;

-- 2. Seed : pour CHAQUE coach existant, crée les 4 plans par défaut
INSERT INTO coach_plans (coach_id, name, price_per_month, duration_months, billing_type, display_order)
SELECT c.id, '8 semaines', 39, 2, 'upfront', 1 FROM coaches c
ON CONFLICT (coach_id, name) DO NOTHING;

INSERT INTO coach_plans (coach_id, name, price_per_month, duration_months, billing_type, display_order)
SELECT c.id, '3 mois', 120, 3, 'upfront', 2 FROM coaches c
ON CONFLICT (coach_id, name) DO NOTHING;

INSERT INTO coach_plans (coach_id, name, price_per_month, duration_months, billing_type, display_order)
SELECT c.id, '6 mois', 110, 6, 'upfront', 3 FROM coaches c
ON CONFLICT (coach_id, name) DO NOTHING;

INSERT INTO coach_plans (coach_id, name, price_per_month, duration_months, billing_type, display_order)
SELECT c.id, '12 mois', 100, 12, 'upfront', 4 FROM coaches c
ON CONFLICT (coach_id, name) DO NOTHING;

-- 3. Ajoute colonne subscription_plan_id dans clients (rollback safe — garde l'ancienne)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES coach_plans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_subscription_plan_id ON clients(subscription_plan_id);

-- 4. Backfill : lier chaque client existant au plan correspondant de SON coach
UPDATE clients cl
SET subscription_plan_id = cp.id
FROM coach_plans cp
WHERE cl.coach_id = cp.coach_id
  AND (
    (cl.subscription_plan = '8sem' AND cp.name = '8 semaines') OR
    (cl.subscription_plan = '3m'   AND cp.name = '3 mois') OR
    (cl.subscription_plan = '6m'   AND cp.name = '6 mois') OR
    (cl.subscription_plan = '12m'  AND cp.name = '12 mois')
  );

-- 5. RLS — coach voit et édite uniquement SES plans
ALTER TABLE coach_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach reads own plans" ON coach_plans
  FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Coach inserts own plans" ON coach_plans
  FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coach updates own plans" ON coach_plans
  FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coach deletes own plans" ON coach_plans
  FOR DELETE USING (coach_id = auth.uid());

-- 6. Trigger updated_at
CREATE OR REPLACE FUNCTION set_coach_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_plans_updated_at
  BEFORE UPDATE ON coach_plans
  FOR EACH ROW EXECUTE FUNCTION set_coach_plans_updated_at();
