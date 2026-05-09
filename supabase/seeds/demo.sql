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
-- 7. CLIENTS DEMO ADDITIONNELS (9 clients fictifs)
-- =========================================================
-- Permet aux prospects coachs en mode démo de voir un dashboard rempli
-- (10 clients total avec Lucas) plutôt qu'un environnement vide.
-- IDs déterministes via gen_random_uuid n'est pas idempotent → on
-- utilise des UUIDs hardcoded.

DO $$
DECLARE
  demo_coach_id uuid;
BEGIN
  SELECT id INTO demo_coach_id FROM public.coaches WHERE email = 'demo@rbperform.app';
  IF demo_coach_id IS NULL THEN RETURN; END IF;

  -- 9 clients fictifs (le 1er = Lucas est déjà inséré section 2)
  INSERT INTO public.clients (id, email, full_name, coach_id, status, onboarding_done, created_at, last_seen_at)
  VALUES
    ('11111111-1111-1111-1111-111111110001', 'thomas.demo@rbperform.app',  'Thomas Reynaud',  demo_coach_id, 'active', true, now() - interval '90 days', now() - interval '12 hours'),
    ('11111111-1111-1111-1111-111111110002', 'sophie.demo@rbperform.app',  'Sophie Lambert',  demo_coach_id, 'active', true, now() - interval '60 days', now() - interval '2 days'),
    ('11111111-1111-1111-1111-111111110003', 'marc.demo@rbperform.app',    'Marc Dupré',      demo_coach_id, 'active', true, now() - interval '45 days', now() - interval '1 day'),
    ('11111111-1111-1111-1111-111111110004', 'julie.demo@rbperform.app',   'Julie Cassan',    demo_coach_id, 'active', true, now() - interval '120 days', now() - interval '8 days'),
    ('11111111-1111-1111-1111-111111110005', 'pierre.demo@rbperform.app',  'Pierre Roussel',  demo_coach_id, 'active', true, now() - interval '30 days', now() - interval '6 hours'),
    ('11111111-1111-1111-1111-111111110006', 'laetitia.demo@rbperform.app','Laetitia Mouret', demo_coach_id, 'active', true, now() - interval '15 days', now() - interval '3 days'),
    ('11111111-1111-1111-1111-111111110007', 'antoine.demo@rbperform.app', 'Antoine Beaufort',demo_coach_id, 'active', true, now() - interval '180 days', now() - interval '4 hours'),
    ('11111111-1111-1111-1111-111111110008', 'celia.demo@rbperform.app',   'Célia Vasseur',   demo_coach_id, 'active', true, now() - interval '75 days', now() - interval '20 days'),  -- inactif/à risque
    ('11111111-1111-1111-1111-111111110009', 'nicolas.demo@rbperform.app', 'Nicolas Bertin',  demo_coach_id, 'active', true, now() - interval '20 days', now() - interval '2 hours')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    last_seen_at = EXCLUDED.last_seen_at,
    status = 'active';

  -- Tags CRM (cohorts) — pour valoriser les nouveaux filtres
  UPDATE public.clients SET tags = ARRAY['perf','force']    WHERE id = '11111111-1111-1111-1111-111111110001';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE id = '11111111-1111-1111-1111-111111110002';
  UPDATE public.clients SET tags = ARRAY['hybrid','perf']   WHERE id = '11111111-1111-1111-1111-111111110003';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE id = '11111111-1111-1111-1111-111111110004';
  UPDATE public.clients SET tags = ARRAY['force']           WHERE id = '11111111-1111-1111-1111-111111110005';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE id = '11111111-1111-1111-1111-111111110006';
  UPDATE public.clients SET tags = ARRAY['perf','hybrid']   WHERE id = '11111111-1111-1111-1111-111111110007';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE id = '11111111-1111-1111-1111-111111110008';
  UPDATE public.clients SET tags = ARRAY['force']           WHERE id = '11111111-1111-1111-1111-111111110009';

  -- Sessions logs (variable selon profil — Thomas, Marc, Pierre, Antoine, Nicolas = actifs)
  DELETE FROM public.session_logs WHERE client_id IN (
    '11111111-1111-1111-1111-111111110001','11111111-1111-1111-1111-111111110002',
    '11111111-1111-1111-1111-111111110003','11111111-1111-1111-1111-111111110004',
    '11111111-1111-1111-1111-111111110005','11111111-1111-1111-1111-111111110006',
    '11111111-1111-1111-1111-111111110007','11111111-1111-1111-1111-111111110008',
    '11111111-1111-1111-1111-111111110009'
  );
  -- Thomas : 14 séances sur 21 jours (assidu)
  INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
  SELECT '11111111-1111-1111-1111-111111110001'::uuid,
    CASE (n % 3) WHEN 0 THEN 'Push' WHEN 1 THEN 'Pull' ELSE 'Legs' END,
    'PPL Force', now() - (interval '1.5 day' * (14 - n)),
    7 + floor(random()*2)::int,
    CASE WHEN random() < 0.7 THEN 'good' ELSE 'great' END
  FROM generate_series(1, 14) n;
  -- Marc : 8 séances sur 21j
  INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
  SELECT '11111111-1111-1111-1111-111111110003'::uuid,
    CASE (n % 4) WHEN 0 THEN 'Force' WHEN 1 THEN 'Hyper' WHEN 2 THEN 'Cardio' ELSE 'Mob' END,
    'Hybrid', now() - (interval '2.5 day' * (8 - n)),
    6 + floor(random()*3)::int, 'good'
  FROM generate_series(1, 8) n;
  -- Pierre : 9 séances en 30j (moyen)
  INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
  SELECT '11111111-1111-1111-1111-111111110005'::uuid,
    CASE (n % 4) WHEN 0 THEN 'Squat' WHEN 1 THEN 'Bench' WHEN 2 THEN 'Deadlift' ELSE 'Accessoires' END,
    'Powerlift Light', now() - (interval '3 day' * (9 - n)),
    8, 'good'
  FROM generate_series(1, 9) n;
  -- Antoine : 18 séances 6 derniers mois (long terme)
  INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
  SELECT '11111111-1111-1111-1111-111111110007'::uuid,
    CASE (n % 3) WHEN 0 THEN 'Push' WHEN 1 THEN 'Pull' ELSE 'Legs' END,
    'PPL Hyper', now() - (interval '1.2 day' * (18 - n)),
    7 + floor(random()*2)::int,
    CASE WHEN n > 14 THEN 'great' ELSE 'good' END
  FROM generate_series(1, 18) n;
  -- Nicolas : 6 séances en 14j (newcomer enthousiaste)
  INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
  SELECT '11111111-1111-1111-1111-111111110009'::uuid,
    'Full Body', 'FB Débutant',
    now() - (interval '2 day' * (6 - n)),
    6 + floor(random()*2)::int, 'great'
  FROM generate_series(1, 6) n;
  -- Sophie : 4 séances 14j (avec une session "tough")
  INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
  SELECT '11111111-1111-1111-1111-111111110002'::uuid,
    'Silhouette', 'Sèche 8sem',
    now() - (interval '3 day' * (4 - n)),
    7, CASE WHEN n = 2 THEN 'tough' ELSE 'ok' END
  FROM generate_series(1, 4) n;
  -- Sophie a un signal injury sur 1 séance
  UPDATE public.session_logs SET injury = 'épaule droite', feedback_note = 'sensible sur OHP, je vais éviter cette semaine'
    WHERE client_id = '11111111-1111-1111-1111-111111110002'
    AND mood = 'tough';

  -- Pesées : tous les clients sauf Célia (inactive) ont des poids récents
  DELETE FROM public.weight_logs WHERE client_id IN (
    '11111111-1111-1111-1111-111111110001','11111111-1111-1111-1111-111111110002',
    '11111111-1111-1111-1111-111111110003','11111111-1111-1111-1111-111111110005',
    '11111111-1111-1111-1111-111111110007','11111111-1111-1111-1111-111111110009'
  );
  -- Thomas : prise 78→81 sur 21j
  INSERT INTO public.weight_logs (client_id, date, weight)
  SELECT '11111111-1111-1111-1111-111111110001'::uuid,
    (now() - (interval '1 day' * (21 - n)))::date,
    78.0 + (n * 0.143) + (random() * 0.4 - 0.2)
  FROM generate_series(1, 21) n;
  -- Sophie : sèche 67→64 sur 14j
  INSERT INTO public.weight_logs (client_id, date, weight)
  SELECT '11111111-1111-1111-1111-111111110002'::uuid,
    (now() - (interval '1 day' * (14 - n)))::date,
    67.5 - (n * 0.25) + (random() * 0.6 - 0.3)
  FROM generate_series(1, 14) n;
  -- Pierre : maintien 82±0.5
  INSERT INTO public.weight_logs (client_id, date, weight)
  SELECT '11111111-1111-1111-1111-111111110005'::uuid,
    (now() - (interval '1 day' * (10 - n)))::date,
    82.0 + (random() * 1.0 - 0.5)
  FROM generate_series(1, 10) n;

  -- Bilans hebdo (cette semaine — week_start = lundi)
  DELETE FROM public.weekly_checkins WHERE client_id IN (
    '11111111-1111-1111-1111-111111110001','11111111-1111-1111-1111-111111110002',
    '11111111-1111-1111-1111-111111110005','11111111-1111-1111-1111-111111110007'
  );
  INSERT INTO public.weekly_checkins (client_id, week_start, weight, energy_level, sleep_quality, stress_level, motivation_level, note)
  VALUES
    ('11111111-1111-1111-1111-111111110001', (date_trunc('week', now()))::date, 80.5, 5, 4, 2, 5, 'Top semaine, séances tranquilles, je sens que ça pousse.'),
    ('11111111-1111-1111-1111-111111110002', (date_trunc('week', now()))::date, 64.2, 3, 3, 4, 4, 'Sèche dure mais je tiens, mensurations qui descendent doucement.'),
    ('11111111-1111-1111-1111-111111110005', (date_trunc('week', now()))::date, 82.1, 4, 5, 2, 5, NULL),
    ('11111111-1111-1111-1111-111111110007', (date_trunc('week', now()))::date, NULL, 5, 4, 3, 5, 'Cycle en place, on continue.');

  -- Habits + habit_logs
  -- Pour Pierre (force) : 3 habits actives (sommeil 8h / créatine / stretch)
  DELETE FROM public.habits WHERE client_id = '11111111-1111-1111-1111-111111110005';
  INSERT INTO public.habits (client_id, name, icon, color, ordre, active)
  VALUES
    ('11111111-1111-1111-1111-111111110005', '8h de sommeil', 'ZZ',  '#a78bfa', 0, true),
    ('11111111-1111-1111-1111-111111110005', 'Créatine 5g',   'CR',  '#02d1ba', 1, true),
    ('11111111-1111-1111-1111-111111110005', '10 min étirement', 'ST', '#fbbf24', 2, true);
  -- Habit logs Pierre : compliance ~75% sur 7 jours
  WITH habit_ids AS (SELECT id FROM public.habits WHERE client_id = '11111111-1111-1111-1111-111111110005')
  INSERT INTO public.habit_logs (habit_id, client_id, date)
  SELECT h.id, '11111111-1111-1111-1111-111111110005'::uuid, (now() - (interval '1 day' * d))::date
  FROM habit_ids h, generate_series(0, 6) d
  WHERE random() < 0.75;

  -- Pour Antoine (perf) : 4 habits avec compliance haute
  DELETE FROM public.habits WHERE client_id = '11111111-1111-1111-1111-111111110007';
  INSERT INTO public.habits (client_id, name, icon, color, ordre, active)
  VALUES
    ('11111111-1111-1111-1111-111111110007', '2L d''eau', 'H2O',  '#02d1ba', 0, true),
    ('11111111-1111-1111-1111-111111110007', 'Protéines 1.8g/kg', 'PR', '#34d399', 1, true),
    ('11111111-1111-1111-1111-111111110007', '10 000 pas', '10K', '#fb923c', 2, true),
    ('11111111-1111-1111-1111-111111110007', 'Pas d''écran 1h avant dodo', 'OFF', '#a78bfa', 3, true);
  WITH habit_ids AS (SELECT id FROM public.habits WHERE client_id = '11111111-1111-1111-1111-111111110007')
  INSERT INTO public.habit_logs (habit_id, client_id, date)
  SELECT h.id, '11111111-1111-1111-1111-111111110007'::uuid, (now() - (interval '1 day' * d))::date
  FROM habit_ids h, generate_series(0, 6) d
  WHERE random() < 0.92;

  -- Activity log : quelques PR battus pour dynamiser le feed
  DELETE FROM public.coach_activity_log
  WHERE coach_id = demo_coach_id AND activity_type = 'client_pr'
    AND client_id IN ('11111111-1111-1111-1111-111111110001','11111111-1111-1111-1111-111111110007');
  INSERT INTO public.coach_activity_log (coach_id, client_id, activity_type, details, created_at)
  VALUES
    (demo_coach_id, '11111111-1111-1111-1111-111111110001', 'client_pr', 'Thomas Reynaud a battu son record sur Bench Press : 95kg → 100kg (+5kg)', now() - interval '18 hours'),
    (demo_coach_id, '11111111-1111-1111-1111-111111110007', 'client_pr', 'Antoine Beaufort a battu son record sur Squat : 140kg → 145kg (+5kg)', now() - interval '4 days');

END$$;

-- =========================================================
-- VERIFICATION — affiche un resume
-- =========================================================
SELECT
  'demo seed loaded' AS status,
  (SELECT count(*) FROM public.client_measurements WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS measurements,
  (SELECT count(*) FROM public.sessions WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS sessions,
  (SELECT count(*) FROM public.client_badges WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS badges,
  (SELECT count(*) FROM public.messages WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid) AS messages;
