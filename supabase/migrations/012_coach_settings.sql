-- 012_coach_settings.sql
-- Colonnes complementaires pour le Settings coach + l'Onboarding 3 etapes.
--
-- Certaines colonnes recoupent partiellement les migrations 010
-- (public_slug, bio, specialties, photo, etc.) — on utilise `ADD COLUMN
-- IF NOT EXISTS` pour etre idempotent.

BEGIN;

-- ===== ONBOARDING =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS onboarding_done       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- ===== PROFIL personnel =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS experience_years int;

-- ===== BRANDING coach (distinct de public_photo_url en 010) =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS coaching_name    text,
  ADD COLUMN IF NOT EXISTS logo_url         text,
  ADD COLUMN IF NOT EXISTS accent_color     text NOT NULL DEFAULT '#02d1ba',
  ADD COLUMN IF NOT EXISTS client_theme     text NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS welcome_message  text;

-- ===== NOTIFICATIONS email =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS notif_weekly_report    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_churn_alert      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_new_client       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_expiring_sub     boolean NOT NULL DEFAULT true;

-- ===== NOTIFICATIONS push =====
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS notif_push_enabled     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_push_churn       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_push_session     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_push_message     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_push_score       boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.coaches.onboarding_done IS
  'FALSE = affichage du modal Onboarding plein ecran au login. Passe TRUE apres etape 3.';
COMMENT ON COLUMN public.coaches.accent_color IS
  'Hex color pour personnaliser l''app client (remplace --accent). 8 presets + custom.';
COMMENT ON COLUMN public.coaches.client_theme IS
  '''dark'' (defaut) ou ''light''. Applique aux CSS variables de l''app client.';

COMMIT;
