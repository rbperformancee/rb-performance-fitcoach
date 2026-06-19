-- 124 — Email templates + unified funnel_messages log (FunnelOps-inspired).
--
-- email_templates : éditer le copy sans deploy. Variables {{first_name}}, etc.
-- funnel_messages        : historique unifié toutes communications (mail/sms/whatsapp)
--                   par lead. Visible dans le CRM par contact.

-- ════════════════════════════════════════════════════════════════════
-- email_templates : templates réutilisables avec interpolation {{var}}
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,            -- ex: 'pre_call_d_minus_1'
  name          text NOT NULL,                   -- nom lisible "Reminder J-1"
  subject       text NOT NULL,                   -- "Demain on se parle{{first_name_comma}}"
  html_body     text NOT NULL,                   -- HTML avec {{vars}}
  vars          text[],                          -- ['first_name', 'call_time']
  description   text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(key) WHERE active;

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_templates_super_admin ON email_templates
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION email_templates_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION email_templates_set_updated_at();

COMMENT ON TABLE email_templates IS
  'Templates email avec interpolation {{var}}. Edition sans deploy depuis CRM.';

-- ════════════════════════════════════════════════════════════════════
-- funnel_messages : log unifié toutes communications outbound + inbound
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS funnel_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type        text NOT NULL CHECK (ref_type IN (
    'coaching_application',
    'pack_decouverte_optin',
    'manual',
    'other'
  )),
  ref_id          uuid,                                    -- ID dans la table source (sans FK)
  email           text,                                    -- destinataire (out) ou expéditeur (in)
  direction       text NOT NULL CHECK (direction IN ('out', 'in')),
  channel         text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'other')),
  template_key    text,                                    -- email_templates.key si template utilisé
  subject         text,                                    -- pour email
  body_preview    text,                                    -- premiers 500 chars du body
  status          text NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'queued', 'failed', 'bounced', 'delivered', 'opened', 'received')),
  provider        text,                                    -- 'zoho', 'twilio', 'whatsapp_cloud', etc.
  provider_id     text,                                    -- message_id renvoyé par provider
  error_message   text,
  meta            jsonb DEFAULT '{}'::jsonb,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_messages_email_sent ON funnel_messages(email, sent_at DESC) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_messages_ref ON funnel_messages(ref_type, ref_id) WHERE ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_messages_template ON funnel_messages(template_key) WHERE template_key IS NOT NULL;

ALTER TABLE funnel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY funnel_messages_super_admin ON funnel_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

COMMENT ON TABLE funnel_messages IS
  'Log unifié toutes communications. Pas de FK = découplé. Lecture super_admin CRM.';
