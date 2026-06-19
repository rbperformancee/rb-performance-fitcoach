-- 123 — Fonction RPC pour refresh la materialized view depuis le cron.
-- REFRESH MATERIALIZED VIEW ne peut pas être appelé via PostgREST direct,
-- on passe par une fonction wrapper.

CREATE OR REPLACE FUNCTION refresh_lead_intent_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW lead_intent_scores;
END;
$$;

-- Permettre l'appel depuis service_role uniquement (cron Vercel)
REVOKE ALL ON FUNCTION refresh_lead_intent_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_lead_intent_scores() TO service_role;

COMMENT ON FUNCTION refresh_lead_intent_scores() IS
  'Refresh la matérialisée vue lead_intent_scores. Appelée par cron-refresh-lead-intent.';
