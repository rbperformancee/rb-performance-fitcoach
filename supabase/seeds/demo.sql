-- =========================================================
-- DEMO SEED — RB Perform
-- =========================================================
-- Hydrate les comptes demo (coach + client) avec un dataset
-- realistic pour la conversion :
--   • Coach demo : demo@rbperform.app (auto-login via /demo)
--   • Client demo : lucas.demo@rbperform.app (auto-login via /demo-client)
--
-- A executer via :
--   1. Supabase Dashboard → SQL Editor → coller ce fichier → Run
--   2. OU psql via supabase db push --include-seed (post-migrations)
--
-- IDEMPOTENT : peut etre rejoue. Utilise UPSERT sur les ids fixes.
-- Les writes lucas.demo viennent du frontend (mode demo) sont nettoyes
-- par le cron supabase/functions/demo-reset (cron quotidien 03:00 UTC).
-- =========================================================

-- IDs fixes (referencees dans le code frontend, ne pas changer)
-- demo coach    : tire de auth.users via demo@rbperform.app
-- demo client   : 5f5cb37c-728b-47a9-b7ae-43d3aa643d65 (hardcode _test-push.sh)

-- =========================================================
-- 1. COACH DEMO — informations publiques (jamais de password ici)
-- =========================================================
-- Le user auth.users est cree manuellement via Supabase Dashboard
-- avec email demo@rbperform.app + password defini en env
-- (REACT_APP_DEMO_PASSWORD). Cette migration ne touche QUE la
-- table publique coaches.

INSERT INTO public.coaches (
  id, email, full_name, brand_name, coach_slug, coaching_name,
  is_active, onboarding_done, founding_coach, subscription_plan,
  created_at
)
SELECT
  u.id,
  'demo@rbperform.app',
  'Demo Coach',
  'RB Perform Demo',
  'demo',
  'Coach Demo',
  true,
  true,
  true,
  'founding',
  now()
FROM auth.users u
WHERE u.email = 'demo@rbperform.app'
ON CONFLICT (email) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  is_active = true,
  onboarding_done = true,
  founding_coach = true;

-- =========================================================
-- 2. CLIENT DEMO — Lucas Bernard
-- =========================================================
INSERT INTO public.clients (
  id, email, full_name, coach_id, status, created_at
)
SELECT
  '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid,
  'lucas.demo@rbperform.app',
  'Lucas Bernard',
  c.id,
  'active',
  now() - interval '45 days'
FROM public.coaches c WHERE c.email = 'demo@rbperform.app'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  status = 'active';

-- =========================================================
-- 3. PESEES — historique 30 jours, perte progressive 78 → 75
-- =========================================================
DELETE FROM public.client_measurements
WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid;

INSERT INTO public.client_measurements (client_id, weight_kg, created_at)
SELECT
  '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid,
  -- Pertes ~3kg sur 30 jours avec bruit ±0.4kg
  78.2 - (n * 0.1) + (random() * 0.8 - 0.4),
  now() - (interval '1 day' * (30 - n))
FROM generate_series(1, 30) n;

-- =========================================================
-- 4. SESSIONS COMPLETED — 12 seances sur 30 jours
-- =========================================================
DELETE FROM public.sessions
WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid;

INSERT INTO public.sessions (
  client_id, seance_nom, started_at, ended_at,
  duration_minutes, rpe_moyen, sets_completes, sets_total, status
)
SELECT
  '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid,
  CASE (n % 3) WHEN 0 THEN 'Push' WHEN 1 THEN 'Pull' ELSE 'Legs' END,
  now() - (interval '2 day' * (12 - n)) - interval '90 minutes',
  now() - (interval '2 day' * (12 - n)),
  60 + floor(random() * 30)::int,
  6 + floor(random() * 3)::int,
  20 + floor(random() * 4)::int,
  24,
  'completed'
FROM generate_series(1, 12) n;

-- =========================================================
-- 5. BADGES — 4 badges debloque (rookie level)
-- =========================================================
DELETE FROM public.client_badges
WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid;

INSERT INTO public.client_badges (client_id, badge_id, earned_at)
VALUES
  ('5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid, 'first_session', now() - interval '40 days'),
  ('5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid, 'five_sessions',  now() - interval '25 days'),
  ('5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid, 'ten_sessions',   now() - interval '5 days'),
  ('5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid, 'weight_logged',  now() - interval '40 days');

-- =========================================================
-- 6. MESSAGES — quelques echanges coach <-> client
-- =========================================================
DELETE FROM public.messages
WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid;

INSERT INTO public.messages (client_id, content, from_coach, created_at)
VALUES
  ('5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid,
   'Salut Lucas, super seance hier ! On garde la meme structure cette semaine.',
   true,  now() - interval '2 days'),
  ('5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid,
   'Merci coach, je me sens vraiment plus fort sur le bench.',
   false, now() - interval '2 days' + interval '2 hours'),
  ('5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid,
   'Tu peux me partager ta consommation proteines de la semaine ?',
   true,  now() - interval '1 day');

-- =========================================================
-- VERIFICATION — affiche un resume
-- =========================================================
SELECT
  'demo seed loaded' AS status,
  (SELECT count(*) FROM public.client_measurements WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS measurements,
  (SELECT count(*) FROM public.sessions WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS sessions,
  (SELECT count(*) FROM public.client_badges WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS badges,
  (SELECT count(*) FROM public.messages WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS messages;
