-- 079_coaches_coach_notes.sql
-- Feature "Inviter un coach" (SuperAdminDashboard / Edge Function invite-coach).
--
-- Permet au super admin de créer un compte coach HORS Stripe : comps,
-- partenaires, et le Pioneer #1 (Kévin). `coach_notes` garde le contexte
-- interne de la création (raison, deal négocié, palier de prix verrouillé...).
--
-- NB : 002_coach_notes.sql concerne les notes coach→client, c'est une
-- autre table. Cette colonne-ci est sur `coaches` et n'est lue que par
-- le super admin.

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS coach_notes text;

COMMENT ON COLUMN public.coaches.coach_notes IS
  'Notes internes super admin sur un coach créé manuellement hors Stripe (raison de la création, deal négocié). Jamais exposé au coach lui-même.';
