-- 010_referral_public_profile.sql
-- Systeme de parrainage coach + vitrine publique + annuaire.
--
-- Chaque coach peut:
--   - Activer sa vitrine publique /coach/[slug]
--   - Parrainer d'autres coachs via son referral_code
--   - Afficher 1-3 temoignages clients
--   - Choisir de masquer le badge 'Powered by RB Perform' (Pro/Elite)

BEGIN;

-- =========================================================
-- COLONNES COACHES — vitrine + parrainage + branding
-- =========================================================
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_bio text,
  ADD COLUMN IF NOT EXISTS public_specialties text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS public_photo_url text,
  ADD COLUMN IF NOT EXISTS public_city text,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referral_coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS show_rb_badge boolean NOT NULL DEFAULT true;

-- Contraintes uniques (ajoutees apres coup pour etre idempotent)
DO $$ BEGIN
  ALTER TABLE public.coaches ADD CONSTRAINT coaches_public_slug_uq   UNIQUE (public_slug);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.coaches ADD CONSTRAINT coaches_referral_code_uq UNIQUE (referral_code);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS coaches_public_idx ON public.coaches (public_slug) WHERE public_profile_enabled = true;

COMMENT ON COLUMN public.coaches.public_slug IS
  'Slug unique pour /coach/<slug>. Genere auto depuis full_name au signup.';
COMMENT ON COLUMN public.coaches.referral_code IS
  'Code unique pour parrainer d''autres coachs, ex: RB-RAYAN42.';
COMMENT ON COLUMN public.coaches.show_rb_badge IS
  'Badge "Powered by RB Perform" dans l''app client. Starter: force true. Pro/Elite: au choix.';

-- =========================================================
-- PARRAINAGES (referrer → referred)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',       -- 'pending' | 'active' | 'rewarded' | 'canceled'
  reward_months int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,                     -- quand le filleul a pris un plan payant
  rewarded_at timestamptz,
  UNIQUE(referrer_id, referred_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_referred_idx ON public.referrals (referred_id);

-- =========================================================
-- TEMOIGNAGES CLIENTS (affiches sur la vitrine coach)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.coach_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_photo_url text,
  content text NOT NULL,
  rating int CHECK (rating >= 1 AND rating <= 5),
  visible boolean NOT NULL DEFAULT true,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS testimonials_coach_idx ON public.coach_testimonials (coach_id, ordre) WHERE visible = true;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.referrals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_testimonials ENABLE ROW LEVEL SECURITY;

-- Le parrain voit tous les filleuls qu'il a parraines; le filleul
-- voit ses propres entries pour traquer s'il est "active"
CREATE POLICY referrals_parties_read ON public.referrals
  FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY referrals_self_insert ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (referrer_id = auth.uid() OR referred_id = auth.uid());
-- Les updates (status 'pending' → 'active' → 'rewarded') sont faits par Edge Function service role

-- Temoignages : le coach CRUD les siens. Lecture publique via vitrine passe
-- par la anon key avec un policy dedie (SELECT TRUE si visible + coach public).
CREATE POLICY testimonials_coach_all ON public.coach_testimonials
  FOR ALL TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY testimonials_public_read ON public.coach_testimonials
  FOR SELECT TO anon USING (
    visible = true AND EXISTS (
      SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.public_profile_enabled = true
    )
  );

-- Lecture publique coaches (vitrine + annuaire /coachs)
CREATE POLICY coaches_public_read ON public.coaches
  FOR SELECT TO anon USING (public_profile_enabled = true);

COMMIT;
