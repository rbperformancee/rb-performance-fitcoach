-- 106 — Coach virtuel + template HTML pour le flow "ebook self-serve athlète"
--
-- Contexte : achat de l'ebook 60J sur rbperform.com (landing Next.js, hors repo)
-- → webhook Stripe POST vers /api/internal/ebook-grant-access (ce repo)
-- → création d'un client athlète attaché à un coach virtuel "RB Perform Athlètes"
-- → duplication du template HTML dans programmes.html_content
-- → email magic link (OTP) côté rbperform.com
--
-- Pourquoi un coach virtuel : isoler les 30 places ebook du compte coach Rayan.
-- Pas de polution dans la liste de "vrais" clients premium, RLS propre.
--
-- UUIDs fixes (eb00...) — référencés en env :
--   EBOOK_VIRTUAL_COACH_ID = eb000000-0000-4000-8000-000000000001
--   EBOOK_TEMPLATE_ID      = eb000000-0000-4000-8000-000000000002
--
-- DML uniquement (INSERT). Idempotent via ON CONFLICT DO NOTHING.
-- Applicable via PostgREST + service_role_key (cf scripts/setup-ebook-virtual-coach.mjs).

BEGIN;

-- 1) Coach virtuel "RB Perform Athlètes"
INSERT INTO public.coaches (
  id,
  email,
  full_name,
  brand_name,
  accent_color,
  is_active,
  created_at
) VALUES (
  'eb000000-0000-4000-8000-000000000001'::uuid,
  'athletes@rbperform.app',
  'RB Perform Athlètes',
  'RB Perform',
  '#02d1ba',
  true,
  now()
)
ON CONFLICT (email) DO NOTHING;

-- 2) Template programme ebook 60J (HTML placeholder — à remplacer par le vrai contenu)
INSERT INTO public.coach_programme_templates (
  id,
  coach_id,
  name,
  description,
  html_content,
  weeks_count,
  sessions_count,
  exercises_count,
  created_at,
  updated_at
) VALUES (
  'eb000000-0000-4000-8000-000000000002'::uuid,
  'eb000000-0000-4000-8000-000000000001'::uuid,
  'Ebook Athlète 60J — Template',
  'Programme de référence dupliqué à chaque achat de l''ebook 60J. Modifier via le script scripts/update-ebook-template.mjs <chemin.html>.',
  '<!doctype html><html><head><meta charset="utf-8"/><title>Ebook Athlète 60J</title></head><body><input id="prog-name" value="Ebook Athlète 60J"/><input id="client-name" value=""/><input id="prog-duration" value="60 jours"/><div class="week" data-week="1"><h2>Semaine 1</h2><div class="session" data-session="1"><h3>Séance 1 — Full Body</h3><div class="exercise"><input id="en-w1s1e1-name" value="Programme à compléter"/><input id="en-w1s1e1-reps" value="4X10"/><input id="en-w1s1e1-tempo" value=""/><input id="en-w1s1e1-rir" value=""/><input id="en-w1s1e1-rest" value="90s"/></div></div></div></body></html>',
  1,
  1,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
