-- 013_invitations.sql
-- Systeme d'invitation client par email.
--
-- Flow:
--   1. Coach cree une invitation (email + prenom + programme optionnel)
--   2. Token UUID unique genere
--   3. Edge Function send-invite envoie email via Resend avec
--      lien /join?token=XXXX
--   4. Client clique le lien → /join verifie le token (via anon key
--      + RLS policy publique) → affiche formulaire inscription
--   5. A la creation du compte: insert clients avec coach_id,
--      marquer invitation status='accepted', accepted_at=now()
--
-- Duree de vie: 7 jours. Apres, status peut passer a 'expired'
-- via cron (ou check cote Edge Function /join au moment de la
-- verification).

BEGIN;

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  email text NOT NULL,
  prenom text,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
    -- 'pending' | 'accepted' | 'expired' | 'canceled'
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  sent_at timestamptz,
  last_resent_at timestamptz,
  resend_count int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invitations_coach_idx   ON public.invitations (coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invitations_token_idx   ON public.invitations (token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS invitations_email_idx   ON public.invitations (coach_id, email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS invitations_pending_idx ON public.invitations (coach_id) WHERE status = 'pending';

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Coach CRUD sur ses invitations
CREATE POLICY invitations_coach_all ON public.invitations
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Lecture publique (anon) uniquement via un token VALIDE et non expire.
-- Necessaire pour que /join?token=XXX puisse resoudre le coach_id et
-- les infos du prenom/programme sans auth prealable.
CREATE POLICY invitations_public_read ON public.invitations
  FOR SELECT TO anon
  USING (
    status = 'pending'
    AND expires_at > now()
  );

-- Les updates (accepted_at, status='accepted') sont faits par Edge
-- Function via service role key — pas de policy UPDATE pour anon.

COMMIT;
