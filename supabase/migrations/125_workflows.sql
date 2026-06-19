-- 125 — Workflows automation system (FunnelOps-inspired, mono-tenant adapté).
--
-- workflows     : config "if trigger, do actions[]"
-- workflow_runs : log de chaque exécution (status + log[] + lead concerné)
--
-- Triggers supportés (string dans trigger.type) :
--   - 'coaching_application_received'           — POST /api/coaching-application
--   - 'coaching_application_call_scheduled'     — créneau confirmé dans CRM
--   - 'coaching_application_outcome_set'        — outcome marqué (closed_won/lost/etc)
--   - 'pack_decouverte_optin'                   — lead magnet capturé
--
-- Trigger.config (jsonb) :
--   { to: 'closed_won' }      — pour outcome_set, filtre sur l'outcome final
--   { from: 'pending', to: 'closed_won' }
--
-- Actions (array d'objects) :
--   { type: 'send_email', config: { template_key: 'X', vars: {...}, to: 'lead'|'rayan' } }
--   { type: 'send_email_inline', config: { subject: '{{var}}', html_body: '...', to: 'lead'|'rayan' } }
--   { type: 'set_call_outcome', config: { outcome: 'closed_lost' } }
--   { type: 'set_crm_stage', config: { stage: 'lost' } }
--   { type: 'webhook', config: { url: 'https://...', method: 'POST' } }
--   { type: 'meta_event', config: { event_name: 'Lead'|'Purchase'|... } }
--   { type: 'delay', config: { minutes: 30 } }   — stub : log only, pas de vraie attente
--   { type: 'internal_alert', config: { subject: '...', body: '...' } } — mail à Rayan

CREATE TABLE IF NOT EXISTS workflows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  active        boolean NOT NULL DEFAULT true,
  trigger       jsonb NOT NULL,            -- { type, config?: { from?, to? } }
  actions       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- Action[]
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type
  ON workflows ((trigger->>'type')) WHERE active = true;

CREATE TABLE IF NOT EXISTS workflow_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  ref_type      text,                                            -- 'coaching_application'|'pack_decouverte_optin'
  ref_id        uuid,                                            -- ID dans la table source
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
  log           jsonb NOT NULL DEFAULT '[]'::jsonb,              -- [{at, action, ok, error?}]
  context       jsonb,                                           -- snapshot du context au trigger
  triggered_at  timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs (workflow_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs (status, triggered_at DESC) WHERE status IN ('failed', 'pending');

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflows_super_admin ON workflows
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY workflow_runs_super_admin ON workflow_runs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION workflows_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflows_updated_at ON workflows;
CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION workflows_set_updated_at();

COMMENT ON TABLE workflows IS
  'Automation rules : if trigger, do actions[]. Multiple workflows par trigger possible.';

COMMENT ON TABLE workflow_runs IS
  'Audit trail de chaque execution. Log array contient le détail par action.';
