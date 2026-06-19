-- 118 — Table dédiée pour dedup des notifications funnel.
-- notification_logs.client_id a une FK vers clients(id), donc pas
-- utilisable pour les events funnel (coaching_applications a un UUID
-- différent). Une table dédiée évite la collision sans toucher l'existant.
--
-- Usage : insertions par cron-coaching-call-reminder, cron-coaching-call-followup
-- et toute autre logique funnel qui doit dedup.

CREATE TABLE IF NOT EXISTS funnel_notification_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id      uuid NOT NULL,        -- coaching_applications.id (no FK = découplé)
  type        text NOT NULL,        -- ex: 'call_reminder_d_minus_1', 'followup_lost_j1'
  sent_date   date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (ref_id, type, sent_date)
);

CREATE INDEX IF NOT EXISTS idx_funnel_notif_logs_lookup
  ON funnel_notification_logs (ref_id, type, sent_date);

ALTER TABLE funnel_notification_logs ENABLE ROW LEVEL SECURITY;

-- Lecture super_admin (audit)
CREATE POLICY funnel_notif_logs_select_super_admin ON funnel_notification_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

COMMENT ON TABLE funnel_notification_logs IS
  'Dedup pour reminders/followups funnel. Pas de FK pour découpler des clients existants.';
