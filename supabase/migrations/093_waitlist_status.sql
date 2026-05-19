-- 093_waitlist_status.sql
-- Suivi du parcours d'un lead waitlist coach → contact → paiement.
-- Géré depuis le SuperAdminDashboard (vue Waitlist).
--
-- status : pending (par défaut) → contacted (lien Stripe envoyé) → paid → declined.
-- contacted_at / paid_at : timestamps des transitions, utiles pour les
-- relances et l'analytique (taux de conversion waitlist → payant).

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
--@SPLIT@
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
--@SPLIT@
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS paid_at timestamptz;
