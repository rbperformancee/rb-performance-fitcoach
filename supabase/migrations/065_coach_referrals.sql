-- 065_coach_referrals.sql
-- Système de parrainage coach→coach.
-- Coach A partage un code → coach B s'inscrit avec → tous les 2 ont 1 mois
-- offert (logique reward gérée plus tard côté Stripe / Sentinel cron).
--
-- Tables :
--   coaches.referral_code   : code unique généré 1× par coach (ex "RAYAN-K3F2")
--   coach_referrals         : 1 ligne par parrainage utilisé (referrer + referred)
--
-- Le code est généré à la demande (lazy) via le front au 1er clic "Mon code"
-- OU côté backend lors de l'onboarding. Pour le 1er ship, on fait lazy front.

BEGIN;

-- 1. Colonne sur coaches : code de parrainage perso
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
CREATE INDEX IF NOT EXISTS coaches_referral_code_idx
  ON public.coaches (referral_code) WHERE referral_code IS NOT NULL;

-- 2. Table des parrainages
CREATE TABLE IF NOT EXISTS public.coach_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  referred_coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  -- Code utilisé au signup (snapshot — au cas où le coach change le sien)
  code_used text NOT NULL,
  -- Reward status : pending → granted (après 1 mois actif vérifié)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'granted', 'cancelled')),
  granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 1 coach ne peut être parrainé qu'1 seule fois
  UNIQUE (referred_coach_id)
);
CREATE INDEX IF NOT EXISTS coach_referrals_referrer_idx
  ON public.coach_referrals (referrer_coach_id, status);

ALTER TABLE public.coach_referrals ENABLE ROW LEVEL SECURITY;

-- Coach voit ses parrainages (referrer OU referred)
DROP POLICY IF EXISTS coach_referrals_self_read ON public.coach_referrals;
CREATE POLICY coach_referrals_self_read ON public.coach_referrals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE (c.id = coach_referrals.referrer_coach_id OR c.id = coach_referrals.referred_coach_id)
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  );

-- INSERT : seulement le referred peut s'auto-inscrire avec un code
-- (vérifié côté front via la fonction RPC dédiée)
DROP POLICY IF EXISTS coach_referrals_insert_self ON public.coach_referrals;
CREATE POLICY coach_referrals_insert_self ON public.coach_referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = coach_referrals.referred_coach_id
        AND (auth.uid()::text = c.id::text
             OR LOWER(auth.jwt()->>'email') = LOWER(c.email))
    )
  );

-- Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_referrals';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

COMMIT;
