-- 040_gdpr_deletions.sql
-- Audit log des suppressions RGPD art. 17.
--
-- Quand un utilisateur supprime son compte via /api/gdpr-delete, on enregistre
-- ici un log irréversible (hash de l'email + ID, pas le clair) pour preuve
-- de conformité en cas de contrôle CNIL ou contestation client.
--
-- IMPORTANT : on ne stocke PAS l'email/ID en clair → respecte le droit à
-- l'oubli tout en gardant une trace auditable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gdpr_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash text NOT NULL,        -- sha256(user.id) tronqué 16 chars
  email_hash text NOT NULL,          -- sha256(email) tronqué 16 chars
  role text NOT NULL,                -- "coach" ou "client"
  tables_affected text[] NOT NULL DEFAULT '{}',
  errors text[] NOT NULL DEFAULT '{}',
  requested_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gdpr_deletions_requested_at_idx
  ON public.gdpr_deletions (requested_at DESC);

-- RLS : seul super_admin peut lire. Service role bypass pour insertions.
ALTER TABLE public.gdpr_deletions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY gdpr_deletions_admin_read ON public.gdpr_deletions
    FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.super_admins WHERE email = (auth.jwt() ->> 'email'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.gdpr_deletions IS
  'Audit log des suppressions de compte RGPD art. 17. Stocke uniquement des hashes pour respecter le droit à l''oubli tout en gardant une trace de conformité.';

COMMIT;
