-- Migration 033 — UTM tracking sur waitlist
--
-- Ajoute les colonnes utm_* + referrer pour la source attribution.
-- Frontend (landing.html + founding.html) capture les params depuis l'URL
-- au premier visit, persiste en sessionStorage, et les renvoie avec le
-- form submit waitlist.
--
-- Requete typique pour breakdown leads par source :
--   SELECT
--     COALESCE(utm_source, 'direct') as source,
--     COALESCE(utm_campaign, '—') as campaign,
--     COUNT(*) as leads
--   FROM waitlist
--   GROUP BY source, campaign
--   ORDER BY leads DESC;

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT;

COMMENT ON COLUMN waitlist.utm_source IS 'utm_source param de l''URL de premier visit (ex: instagram, google, direct)';
COMMENT ON COLUMN waitlist.utm_medium IS 'utm_medium (ex: bio, story, reel, paid)';
COMMENT ON COLUMN waitlist.utm_campaign IS 'utm_campaign (ex: founding_launch, may_2026)';
COMMENT ON COLUMN waitlist.utm_content IS 'utm_content (variant ID si A/B)';
COMMENT ON COLUMN waitlist.referrer IS 'document.referrer du premier visit (si externe)';

-- Index pour les requetes analytics par source
CREATE INDEX IF NOT EXISTS idx_waitlist_utm_source ON waitlist (utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_utm_campaign ON waitlist (utm_campaign) WHERE utm_campaign IS NOT NULL;
