-- 117 — Custom analytics events table (self-hosted, RGPD-native).
-- Remplace Plausible / GA / Meta côté collecte. Toutes les events du funnel
-- (Landing viewed, Application started/submitted, Post-vente viewed, etc.)
-- sont stockées ici via /api/track-event.
--
-- Lecture : super_admin only (RLS). Insertion : via service role uniquement
-- (l'endpoint /api/track-event utilise SUPABASE_SERVICE_ROLE_KEY).
--
-- Pas de PII brute (pas d'IP en clair). On hash session_id côté client puis
-- on garde juste l'agrégat pour distinguer les visites uniques.

CREATE TABLE IF NOT EXISTS analytics_events (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  props       jsonb DEFAULT '{}'::jsonb,
  session_id  text,                    -- hash anonyme côté client, persist 30 min
  page_path   text,
  referrer    text,
  source      text,                    -- instagram / direct / youtube / etc.
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  user_agent  text,
  country     text,                    -- 2-letter ISO via Vercel geo header
  email       text,                    -- optionnel : si user déjà identifié
  created_at  timestamptz DEFAULT now()
);

-- Index pour les agrégations dashboard
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON analytics_events (name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

-- RLS : super_admin only en lecture, pas d'écriture client (service role only)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_events_select_super_admin ON analytics_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

COMMENT ON TABLE analytics_events IS
  'Self-hosted analytics : remplace Plausible/GA. Inserts via /api/track-event (service role).';
