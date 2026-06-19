-- 120 — Lead magnet "Pack Découverte" opt-ins.
--
-- Table dédiée pour les optin du pack découverte gratuit (front-funnel).
-- Distinct de waitlist (qui est ouverte au pré-launch app) et de
-- coaching_applications (qui est le high-ticket).
--
-- Flow :
--   1. Visiteur arrive sur /pack-decouverte (ou via le footer de /candidature)
--   2. Donne son email → INSERT ici via /api/pack-decouverte-optin
--   3. Mail welcome immédiat avec lien pack
--   4. Cron-pack-decouverte-nurture envoie les 4 mails suivants J+1 à J+7

CREATE TABLE IF NOT EXISTS pack_decouverte_optins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  nom_prenom      text,
  source          text,           -- /candidature_footer / direct / instagram / etc.
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  status          text NOT NULL DEFAULT 'active',
                                  -- 'active' / 'converted' (devenu coaching_applications) / 'unsubscribed'
  converted_application_id uuid,  -- ID coaching_applications si la personne candidate ensuite
  unsubscribed_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index dedup par email (un optin = un email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_decouverte_email_unique
  ON pack_decouverte_optins (lower(email));

-- Index pour le cron
CREATE INDEX IF NOT EXISTS idx_pack_decouverte_created_status
  ON pack_decouverte_optins (created_at DESC, status)
  WHERE status = 'active';

ALTER TABLE pack_decouverte_optins ENABLE ROW LEVEL SECURITY;

-- Super_admin only en lecture
CREATE POLICY pack_decouverte_super_admin ON pack_decouverte_optins
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

COMMENT ON TABLE pack_decouverte_optins IS
  'Opt-ins lead magnet Pack Découverte. Service role gère les inserts publics.';
