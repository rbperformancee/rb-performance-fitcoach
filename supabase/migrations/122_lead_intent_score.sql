-- 122 — Buyer Intent scoring (adapté de FunnelOps).
--
-- Vue qui calcule un score 0-100 par lead (coaching_application) basé sur :
--   - % VSL vidéo regardée (event Funnel:VideoComplete / Action:VideoPlay)
--   - Scroll depth max atteint sur landing (Funnel:LandingViewed events meta.scroll)
--   - Visites multiples (sessions distinctes sur cette email)
--   - Récence : decay si > 7j sans activité
--   - Présence dans pack_decouverte_optins (signal d'engagement)
--
-- Permet de prioriser les appels chauds dans le CRM.
-- Pas de table dédiée → vue matérialisée refresh quotidienne par cron.

-- Drop si réimport
DROP MATERIALIZED VIEW IF EXISTS lead_intent_scores CASCADE;

CREATE MATERIALIZED VIEW lead_intent_scores AS
WITH application_sessions AS (
  -- Pour chaque candidature, on retrouve les sessions liées via email
  SELECT
    ca.id AS application_id,
    ca.email,
    ca.created_at AS applied_at,
    ca.call_outcome,
    ca.call_completed_at
  FROM coaching_applications ca
  WHERE ca.call_outcome IS NULL
     OR ca.call_outcome IN ('pending', 'rescheduled')
),
events_per_email AS (
  -- Events analytics par email (best effort matching)
  SELECT
    ae.email,
    COUNT(*) FILTER (WHERE ae.name = 'Funnel:LandingViewed') AS landing_views,
    COUNT(DISTINCT ae.session_id) AS unique_sessions,
    MAX(ae.created_at) AS last_event_at,
    COUNT(*) FILTER (WHERE ae.name LIKE 'Funnel:Video%') AS video_events,
    BOOL_OR(ae.name = 'Action:VideoPlay') AS played_video
  FROM analytics_events ae
  WHERE ae.email IS NOT NULL
  GROUP BY ae.email
),
pack_optins AS (
  SELECT lower(email) AS email, MIN(created_at) AS pack_optin_at
  FROM pack_decouverte_optins
  WHERE status = 'active'
  GROUP BY lower(email)
)
SELECT
  asn.application_id,
  asn.email,
  asn.applied_at,
  -- Score sur 100 — pondéré
  LEAST(100, GREATEST(0,
    -- Base : avoir candidaté = 30 pts
    30
    -- Engagement vidéo : +15 si play détecté, +15 supplémentaires si plusieurs events
    + CASE WHEN COALESCE(epe.played_video, false) THEN 15 ELSE 0 END
    + CASE WHEN COALESCE(epe.video_events, 0) >= 3 THEN 15 ELSE 0 END
    -- Visites multiples : +10 si 2-3 sessions, +20 si 4+
    + CASE
        WHEN COALESCE(epe.unique_sessions, 0) >= 4 THEN 20
        WHEN COALESCE(epe.unique_sessions, 0) >= 2 THEN 10
        ELSE 0
      END
    -- Pack découverte = signal d'engagement précédent : +10
    + CASE WHEN po.pack_optin_at IS NOT NULL THEN 10 ELSE 0 END
    -- Décay récence : -3 par jour depuis dernier event (max -30)
    - LEAST(30, GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(epe.last_event_at, asn.applied_at)))::int * 3))
  ))::int AS intent_score,
  COALESCE(epe.landing_views, 0) AS landing_views,
  COALESCE(epe.unique_sessions, 0) AS unique_sessions,
  COALESCE(epe.video_events, 0) AS video_events,
  COALESCE(epe.played_video, false) AS played_video,
  po.pack_optin_at IS NOT NULL AS has_pack_optin,
  COALESCE(epe.last_event_at, asn.applied_at) AS last_activity_at
FROM application_sessions asn
LEFT JOIN events_per_email epe ON lower(asn.email) = lower(epe.email)
LEFT JOIN pack_optins po ON lower(asn.email) = po.email;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_intent_scores_app_id
  ON lead_intent_scores (application_id);

CREATE INDEX IF NOT EXISTS idx_lead_intent_scores_score_desc
  ON lead_intent_scores (intent_score DESC);

-- Pour rafraîchir la vue : SELECT cron.schedule(...) ou un cron Vercel HTTP qui
-- appelle un endpoint qui fait REFRESH MATERIALIZED VIEW CONCURRENTLY.

COMMENT ON MATERIALIZED VIEW lead_intent_scores IS
  'Score 0-100 par lead pour priorisation appels. Refresh quotidien recommandé.';
