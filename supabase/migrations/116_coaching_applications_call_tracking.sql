-- 116 — Tracking du call de vente sur coaching_applications.
-- 3 colonnes :
--   call_scheduled_at : timestamp du créneau confirmé par Rayan
--   call_outcome      : closed_won / closed_lost / no_show / pending / rescheduled
--   call_completed_at : timestamp réel de fin de call (post-meeting)
--
-- Usage :
--   - call_scheduled_at est set quand Rayan confirme un créneau au candidat
--   - cron-coaching-call-reminder lit cette colonne pour envoyer J-1 / H-2
--   - call_outcome + call_completed_at sont set par Rayan post-call (manuel)
--   - cron-coaching-call-followup envoie la séquence récupération si lost

ALTER TABLE coaching_applications
  ADD COLUMN IF NOT EXISTS call_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS call_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS call_outcome text
    CHECK (call_outcome IN (
      'pending',         -- défaut : call pas encore eu lieu
      'no_show',         -- candidat ne s'est pas présenté
      'closed_won',      -- signé sur le call
      'closed_lost',     -- pas signé, candidat dit "je réfléchis" ou "non direct"
      'rescheduled',     -- reporté
      'rejected_by_us'   -- Rayan a décidé que ce n'était pas le bon match
    ));

-- Index pour le cron : trouver rapidement les calls programmés à venir
CREATE INDEX IF NOT EXISTS idx_coaching_applications_call_scheduled
  ON coaching_applications (call_scheduled_at)
  WHERE call_scheduled_at IS NOT NULL;

-- Index pour le cron followup : trouver les closed_lost récents
CREATE INDEX IF NOT EXISTS idx_coaching_applications_call_outcome
  ON coaching_applications (call_outcome, call_completed_at)
  WHERE call_outcome IS NOT NULL;

COMMENT ON COLUMN coaching_applications.call_scheduled_at IS
  'Timestamp du créneau confirmé par Rayan. Lu par cron-coaching-call-reminder (J-1 + H-2).';

COMMENT ON COLUMN coaching_applications.call_outcome IS
  'Résultat du call. Set par Rayan post-call. Lu par cron-coaching-call-followup pour la séquence récupération.';
