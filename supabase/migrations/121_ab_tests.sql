-- 121 — A/B testing system (adapté de FunnelOps ab_tests).
--
-- Permet de tester 2 variantes d'une page funnel (VSL, candidature,
-- pack-decouverte, post-vente). Le code front check s'il existe un test
-- actif → choisit A ou B selon traffic_split → applique l'override de
-- config via deep-merge → tracke la variant dans analytics_events.
--
-- Différent de FunnelOps : pas de coach_id (mono-tenant). Une page = un
-- test actif maximum.

CREATE TYPE ab_test_page AS ENUM (
  'landing',          -- /candidature landing
  'pack_decouverte',  -- /pack-decouverte opt-in
  'post_vente',       -- /post-vente welcome
  'confirmation'      -- /candidature step 7 confirmation
);

CREATE TABLE IF NOT EXISTS ab_tests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                           -- "VSL headline test #1"
  page            ab_test_page NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  traffic_split   int NOT NULL DEFAULT 50 CHECK (traffic_split BETWEEN 0 AND 100),
                                                          -- % de visiteurs → variant B
  variant_a       jsonb NOT NULL DEFAULT '{}'::jsonb,      -- partial override
  variant_b       jsonb NOT NULL DEFAULT '{}'::jsonb,      -- partial override
  hypothesis      text,                                    -- "B convertira mieux car..."
  created_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,                             -- mis quand on désactive
  winner          text CHECK (winner IN ('a', 'b', 'inconclusive'))
);

-- Un test actif max par page
CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_tests_one_active_per_page
  ON ab_tests (page) WHERE active = true;

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

-- Super_admin only en CRUD, lecture publique pour le front
CREATE POLICY ab_tests_super_admin_crud ON ab_tests
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

-- Lecture anonyme pour le front public (sinon impossible de déterminer
-- la variante à afficher). On lit juste les tests actifs.
CREATE POLICY ab_tests_anon_read_active ON ab_tests
  FOR SELECT TO anon
  USING (active = true);

CREATE POLICY ab_tests_auth_read_active ON ab_tests
  FOR SELECT TO authenticated
  USING (active = true);

COMMENT ON TABLE ab_tests IS
  'A/B tests sur pages funnel. Un test actif max par page. Lecture publique des actifs.';
