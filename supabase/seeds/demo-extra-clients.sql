-- Seed des 9 clients fictifs supplémentaires (en plus de Lucas existant).
-- À appliquer après que Lucas + demo coach sont en place.

DO $$
DECLARE
  demo_coach_id uuid;
BEGIN
  SELECT id INTO demo_coach_id FROM public.coaches WHERE email = 'demo@rbperform.app';
  IF demo_coach_id IS NULL THEN
    RAISE EXCEPTION 'Coach démo introuvable (email demo@rbperform.app)';
  END IF;

  INSERT INTO public.clients (id, email, full_name, coach_id, subscription_status, onboarding_done, created_at, last_seen_at)
  VALUES
    ('11111111-1111-1111-1111-111111110001', 'thomas.demo@rbperform.app',  'Thomas Reynaud',  demo_coach_id, 'active', true, now() - interval '90 days', now() - interval '12 hours'),
    ('11111111-1111-1111-1111-111111110002', 'sophie.demo@rbperform.app',  'Sophie Lambert',  demo_coach_id, 'active', true, now() - interval '60 days', now() - interval '2 days'),
    ('11111111-1111-1111-1111-111111110003', 'marc.demo@rbperform.app',    'Marc Dupré',      demo_coach_id, 'active', true, now() - interval '45 days', now() - interval '1 day'),
    ('11111111-1111-1111-1111-111111110004', 'julie.demo@rbperform.app',   'Julie Cassan',    demo_coach_id, 'active', true, now() - interval '120 days', now() - interval '8 days'),
    ('11111111-1111-1111-1111-111111110005', 'pierre.demo@rbperform.app',  'Pierre Roussel',  demo_coach_id, 'active', true, now() - interval '30 days', now() - interval '6 hours'),
    ('11111111-1111-1111-1111-111111110006', 'laetitia.demo@rbperform.app','Laetitia Mouret', demo_coach_id, 'active', true, now() - interval '15 days', now() - interval '3 days'),
    ('11111111-1111-1111-1111-111111110007', 'antoine.demo@rbperform.app', 'Antoine Beaufort',demo_coach_id, 'active', true, now() - interval '180 days', now() - interval '4 hours'),
    ('11111111-1111-1111-1111-111111110008', 'celia.demo@rbperform.app',   'Célia Vasseur',   demo_coach_id, 'active', true, now() - interval '75 days', now() - interval '20 days'),
    ('11111111-1111-1111-1111-111111110009', 'nicolas.demo@rbperform.app', 'Nicolas Bertin',  demo_coach_id, 'active', true, now() - interval '20 days', now() - interval '2 hours')
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    last_seen_at = EXCLUDED.last_seen_at,
    subscription_status = 'active',
    onboarding_done = true;

  -- Tags CRM
  UPDATE public.clients SET tags = ARRAY['perf','force']    WHERE email = 'thomas.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE email = 'sophie.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['hybrid','perf']   WHERE email = 'marc.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE email = 'julie.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['force']           WHERE email = 'pierre.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE email = 'laetitia.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['perf','hybrid']   WHERE email = 'antoine.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['silhouette']      WHERE email = 'celia.demo@rbperform.app';
  UPDATE public.clients SET tags = ARRAY['force']           WHERE email = 'nicolas.demo@rbperform.app';

  -- On récupère les IDs réels (au cas où ON CONFLICT ait gardé un id différent)
  DECLARE
    thomas_id uuid; sophie_id uuid; marc_id uuid; pierre_id uuid;
    antoine_id uuid; nicolas_id uuid;
  BEGIN
    SELECT id INTO thomas_id  FROM public.clients WHERE email = 'thomas.demo@rbperform.app';
    SELECT id INTO sophie_id  FROM public.clients WHERE email = 'sophie.demo@rbperform.app';
    SELECT id INTO marc_id    FROM public.clients WHERE email = 'marc.demo@rbperform.app';
    SELECT id INTO pierre_id  FROM public.clients WHERE email = 'pierre.demo@rbperform.app';
    SELECT id INTO antoine_id FROM public.clients WHERE email = 'antoine.demo@rbperform.app';
    SELECT id INTO nicolas_id FROM public.clients WHERE email = 'nicolas.demo@rbperform.app';

    -- Nettoie data précédente
    DELETE FROM public.session_logs WHERE client_id IN (thomas_id, sophie_id, marc_id, pierre_id, antoine_id, nicolas_id);

    -- Thomas : 14 séances sur 21 jours
    INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
    SELECT thomas_id,
      CASE (n % 3) WHEN 0 THEN 'Push' WHEN 1 THEN 'Pull' ELSE 'Legs' END,
      'PPL Force', now() - (interval '1.5 day' * (14 - n)),
      7 + floor(random()*2)::int,
      CASE WHEN random() < 0.7 THEN 'good' ELSE 'great' END
    FROM generate_series(1, 14) n;

    -- Marc : 8 séances
    INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
    SELECT marc_id,
      CASE (n % 4) WHEN 0 THEN 'Force' WHEN 1 THEN 'Hyper' WHEN 2 THEN 'Cardio' ELSE 'Mob' END,
      'Hybrid', now() - (interval '2.5 day' * (8 - n)),
      6 + floor(random()*3)::int, 'good'
    FROM generate_series(1, 8) n;

    -- Pierre : 9 séances
    INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
    SELECT pierre_id,
      CASE (n % 4) WHEN 0 THEN 'Squat' WHEN 1 THEN 'Bench' WHEN 2 THEN 'Deadlift' ELSE 'Accessoires' END,
      'Powerlift Light', now() - (interval '3 day' * (9 - n)),
      8, 'good'
    FROM generate_series(1, 9) n;

    -- Antoine : 18 séances 6 derniers mois
    INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
    SELECT antoine_id,
      CASE (n % 3) WHEN 0 THEN 'Push' WHEN 1 THEN 'Pull' ELSE 'Legs' END,
      'PPL Hyper', now() - (interval '1.2 day' * (18 - n)),
      7 + floor(random()*2)::int,
      CASE WHEN n > 14 THEN 'great' ELSE 'good' END
    FROM generate_series(1, 18) n;

    -- Nicolas : 6 séances 14j
    INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
    SELECT nicolas_id, 'Full Body', 'FB Débutant',
      now() - (interval '2 day' * (6 - n)),
      6 + floor(random()*2)::int, 'great'
    FROM generate_series(1, 6) n;

    -- Sophie : 4 séances avec une "tough" + injury
    INSERT INTO public.session_logs (client_id, session_name, programme_name, logged_at, rpe, mood)
    SELECT sophie_id, 'Silhouette', 'Sèche 8sem',
      now() - (interval '3 day' * (4 - n)),
      7, CASE WHEN n = 2 THEN 'tough' ELSE 'ok' END
    FROM generate_series(1, 4) n;
    UPDATE public.session_logs SET injury = 'épaule droite', feedback_note = 'sensible sur OHP, je vais éviter cette semaine'
      WHERE client_id = sophie_id AND mood = 'tough';

    -- Pesées (weight_logs)
    DELETE FROM public.weight_logs WHERE client_id IN (thomas_id, sophie_id, pierre_id);
    INSERT INTO public.weight_logs (client_id, date, weight)
    SELECT thomas_id,
      (now() - (interval '1 day' * (21 - n)))::date,
      78.0 + (n * 0.143) + (random() * 0.4 - 0.2)
    FROM generate_series(1, 21) n
    ON CONFLICT DO NOTHING;
    INSERT INTO public.weight_logs (client_id, date, weight)
    SELECT sophie_id,
      (now() - (interval '1 day' * (14 - n)))::date,
      67.5 - (n * 0.25) + (random() * 0.6 - 0.3)
    FROM generate_series(1, 14) n
    ON CONFLICT DO NOTHING;
    INSERT INTO public.weight_logs (client_id, date, weight)
    SELECT pierre_id,
      (now() - (interval '1 day' * (10 - n)))::date,
      82.0 + (random() * 1.0 - 0.5)
    FROM generate_series(1, 10) n
    ON CONFLICT DO NOTHING;

    -- Bilans hebdo
    DELETE FROM public.weekly_checkins WHERE client_id IN (thomas_id, sophie_id, pierre_id, antoine_id);
    INSERT INTO public.weekly_checkins (client_id, week_start, weight, energy_level, sleep_quality, stress_level, motivation_level, note)
    VALUES
      (thomas_id,  (date_trunc('week', now()))::date, 80.5, 5, 4, 2, 5, 'Top semaine, séances tranquilles, je sens que ça pousse.'),
      (sophie_id,  (date_trunc('week', now()))::date, 64.2, 3, 3, 4, 4, 'Sèche dure mais je tiens, mensurations qui descendent doucement.'),
      (pierre_id,  (date_trunc('week', now()))::date, 82.1, 4, 5, 2, 5, NULL),
      (antoine_id, (date_trunc('week', now()))::date, NULL, 5, 4, 3, 5, 'Cycle en place, on continue.');

    -- Habits Pierre
    DELETE FROM public.habits WHERE client_id = pierre_id;
    INSERT INTO public.habits (client_id, name, icon, color, ordre, active) VALUES
      (pierre_id, '8h de sommeil', 'ZZ', '#a78bfa', 0, true),
      (pierre_id, 'Créatine 5g', 'CR', '#02d1ba', 1, true),
      (pierre_id, '10 min étirement', 'ST', '#fbbf24', 2, true);
    INSERT INTO public.habit_logs (habit_id, client_id, date)
    SELECT h.id, pierre_id, (now() - (interval '1 day' * d))::date
    FROM public.habits h, generate_series(0, 6) d
    WHERE h.client_id = pierre_id AND random() < 0.75
    ON CONFLICT DO NOTHING;

    -- Habits Antoine
    DELETE FROM public.habits WHERE client_id = antoine_id;
    INSERT INTO public.habits (client_id, name, icon, color, ordre, active) VALUES
      (antoine_id, '2L d''eau', 'H2O', '#02d1ba', 0, true),
      (antoine_id, 'Protéines 1.8g/kg', 'PR', '#34d399', 1, true),
      (antoine_id, '10 000 pas', '10K', '#fb923c', 2, true),
      (antoine_id, 'Pas d''écran 1h avant dodo', 'OFF', '#a78bfa', 3, true);
    INSERT INTO public.habit_logs (habit_id, client_id, date)
    SELECT h.id, antoine_id, (now() - (interval '1 day' * d))::date
    FROM public.habits h, generate_series(0, 6) d
    WHERE h.client_id = antoine_id AND random() < 0.92
    ON CONFLICT DO NOTHING;

    -- Activity log : 2 PR récents
    DELETE FROM public.coach_activity_log
    WHERE coach_id = demo_coach_id AND activity_type = 'client_pr'
      AND client_id IN (thomas_id, antoine_id);
    INSERT INTO public.coach_activity_log (coach_id, client_id, activity_type, details, created_at) VALUES
      (demo_coach_id, thomas_id,  'client_pr', 'Thomas Reynaud a battu son record sur Bench Press : 95kg → 100kg (+5kg)', now() - interval '18 hours'),
      (demo_coach_id, antoine_id, 'client_pr', 'Antoine Beaufort a battu son record sur Squat : 140kg → 145kg (+5kg)', now() - interval '4 days');
  END;
END$$;

SELECT
  'demo extra clients seeded' AS status,
  (SELECT count(*) FROM public.clients WHERE email LIKE '%demo@rbperform.app%') AS clients_total,
  (SELECT count(*) FROM public.session_logs WHERE client_id IN (SELECT id FROM public.clients WHERE email LIKE '%demo@rbperform.app%')) AS session_logs_total,
  (SELECT count(*) FROM public.habits WHERE client_id IN (SELECT id FROM public.clients WHERE email LIKE '%demo@rbperform.app%')) AS habits_total;
