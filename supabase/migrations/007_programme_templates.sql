-- 007_programme_templates.sql
-- Nouveau systeme de templates de programmes reutilisables +
-- bibliotheque d'exercices partagee.
--
-- Principe:
--   * La table `programmes` existante (client_id + html_content) reste
--     inchangee — c'est ce que le client consomme via l'app.
--   * `programme_templates` introduit un niveau de template coach-level:
--     le coach cree UN programme, puis l'assigne a N clients. A chaque
--     assignation, le builder regenere l'HTML et l'ecrit dans `programmes`.
--   * `exercises_library` offre une base commune de 200+ exercices que
--     tous les coachs peuvent chercher depuis le builder.

BEGIN;

-- =========================================================
-- TEMPLATES DE PROGRAMMES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.programme_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name text NOT NULL,
  objectif text,
  duree_semaines int NOT NULL DEFAULT 8,
  niveau text,
  tagline text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pgtmpl_coach_idx  ON public.programme_templates (coach_id);
CREATE INDEX IF NOT EXISTS pgtmpl_active_idx ON public.programme_templates (coach_id) WHERE archived = false;

-- Semaines / seances / exercices structures (permet le builder et
-- les evolutions futures: drag&drop, preview, PDF structure).
CREATE TABLE IF NOT EXISTS public.template_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.programme_templates(id) ON DELETE CASCADE,
  numero int NOT NULL,
  nom text,
  UNIQUE(template_id, numero)
);
CREATE INDEX IF NOT EXISTS tweek_tmpl_idx ON public.template_weeks (template_id);

CREATE TABLE IF NOT EXISTS public.template_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES public.template_weeks(id) ON DELETE CASCADE,
  nom text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  note_motivation text,
  warmup text,
  finisher text
);
CREATE INDEX IF NOT EXISTS tsess_week_idx ON public.template_sessions (week_id);

CREATE TABLE IF NOT EXISTS public.template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.template_sessions(id) ON DELETE CASCADE,
  library_id uuid,                   -- FK ajoutee apres creation de exercises_library
  nom text NOT NULL,                 -- copie snapshot (survit si library supprime)
  ordre int NOT NULL DEFAULT 0,
  series int NOT NULL DEFAULT 3,
  reps text NOT NULL DEFAULT '10',   -- "8" | "8-12" | "AMRAP"
  tempo text,                        -- "30X0"
  rir int,                           -- reps in reserve 0-5
  charge_kg numeric(6,2),
  rest_sec int,                      -- temps de repos
  note text,
  group_type text,                   -- Superset / Bi-set / Tri-set
  youtube_url text
);

-- =========================================================
-- ASSIGNATIONS CLIENT -> TEMPLATE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.client_programme_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.programme_templates(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  actif boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, client_id)
);
CREATE INDEX IF NOT EXISTS cpa_client_idx ON public.client_programme_assignments (client_id) WHERE actif = true;

-- =========================================================
-- BIBLIOTHEQUE D'EXERCICES (partagee + custom par coach)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.exercises_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  muscle_group text NOT NULL,        -- Pectoraux / Dos / Epaules / Biceps / Triceps / Jambes / Abdos / Cardio / Corps-entier
  equipment text,                    -- Haltere / Barre / Poulie / Machine / Poids du corps / Kettlebell / Elastique
  niveau text,                       -- Debutant / Intermediaire / Avance
  description text,
  youtube_url text,
  image_url text,
  is_custom boolean NOT NULL DEFAULT false,
  coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exlib_muscle_idx ON public.exercises_library (muscle_group);
CREATE INDEX IF NOT EXISTS exlib_coach_idx  ON public.exercises_library (coach_id) WHERE is_custom = true;
-- Recherche texte simple (pour le search-as-you-type du builder)
CREATE INDEX IF NOT EXISTS exlib_nom_trgm_idx ON public.exercises_library USING gin (nom gin_trgm_ops);

-- FK library sur template_exercises (cree apres coup — PostgreSQL
-- accepte la ref directement puisqu'on est dans la meme transaction
-- mais on le fait explicitement pour la lisibilite):
ALTER TABLE public.template_exercises
  DROP CONSTRAINT IF EXISTS template_exercises_library_id_fkey,
  ADD  CONSTRAINT template_exercises_library_id_fkey
       FOREIGN KEY (library_id) REFERENCES public.exercises_library(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS texrc_sess_idx ON public.template_exercises (session_id);
CREATE INDEX IF NOT EXISTS texrc_lib_idx  ON public.template_exercises (library_id);

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.programme_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_weeks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_programme_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises_library             ENABLE ROW LEVEL SECURITY;

-- Un coach voit / edite uniquement ses propres templates
CREATE POLICY tmpl_coach_all ON public.programme_templates
  FOR ALL TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Semaines / seances / exercices : via JOIN sur le template
CREATE POLICY tweek_coach_all ON public.template_weeks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programme_templates t WHERE t.id = template_id AND t.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programme_templates t WHERE t.id = template_id AND t.coach_id = auth.uid()));

CREATE POLICY tsess_coach_all ON public.template_sessions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.template_weeks w JOIN public.programme_templates t ON t.id = w.template_id WHERE w.id = week_id AND t.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.template_weeks w JOIN public.programme_templates t ON t.id = w.template_id WHERE w.id = week_id AND t.coach_id = auth.uid()));

CREATE POLICY texrc_coach_all ON public.template_exercises
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.template_sessions s
    JOIN public.template_weeks w ON w.id = s.week_id
    JOIN public.programme_templates t ON t.id = w.template_id
    WHERE s.id = session_id AND t.coach_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.template_sessions s
    JOIN public.template_weeks w ON w.id = s.week_id
    JOIN public.programme_templates t ON t.id = w.template_id
    WHERE s.id = session_id AND t.coach_id = auth.uid()));

-- Assignations : coach via template_id ET client via son coach_id
CREATE POLICY cpa_coach_all ON public.client_programme_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programme_templates t WHERE t.id = template_id AND t.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programme_templates t WHERE t.id = template_id AND t.coach_id = auth.uid()));

-- exercises_library : lecture publique pour les exercices communs
-- (is_custom=false), lecture/ecriture pour les customs du coach.
CREATE POLICY exlib_read_shared ON public.exercises_library
  FOR SELECT TO authenticated USING (is_custom = false OR coach_id = auth.uid());
CREATE POLICY exlib_write_own ON public.exercises_library
  FOR INSERT TO authenticated WITH CHECK (is_custom = true AND coach_id = auth.uid());
CREATE POLICY exlib_update_own ON public.exercises_library
  FOR UPDATE TO authenticated USING (is_custom = true AND coach_id = auth.uid());
CREATE POLICY exlib_delete_own ON public.exercises_library
  FOR DELETE TO authenticated USING (is_custom = true AND coach_id = auth.uid());

COMMIT;

-- =========================================================
-- SEED 200+ EXERCICES COMMUNS (is_custom=false, coach_id NULL)
-- =========================================================
-- Appel separe pour eviter de rejouer le seed si la migration est relancee
-- (les ON CONFLICT DO NOTHING protegent).
INSERT INTO public.exercises_library (nom, muscle_group, equipment, niveau) VALUES
-- PECTORAUX (25)
('Developpe couche barre',             'Pectoraux', 'Barre',          'Intermediaire'),
('Developpe couche halteres',          'Pectoraux', 'Haltere',        'Intermediaire'),
('Developpe incline barre',            'Pectoraux', 'Barre',          'Intermediaire'),
('Developpe incline halteres',         'Pectoraux', 'Haltere',        'Intermediaire'),
('Developpe decline barre',            'Pectoraux', 'Barre',          'Intermediaire'),
('Developpe decline halteres',         'Pectoraux', 'Haltere',        'Intermediaire'),
('Ecarte couche halteres',             'Pectoraux', 'Haltere',        'Intermediaire'),
('Ecarte incline halteres',            'Pectoraux', 'Haltere',        'Intermediaire'),
('Ecarte decline halteres',            'Pectoraux', 'Haltere',        'Intermediaire'),
('Ecarte poulie vis-a-vis',            'Pectoraux', 'Poulie',         'Intermediaire'),
('Pec deck',                           'Pectoraux', 'Machine',        'Debutant'),
('Pompes',                             'Pectoraux', 'Poids du corps', 'Debutant'),
('Pompes inclinees',                   'Pectoraux', 'Poids du corps', 'Debutant'),
('Pompes declinees',                   'Pectoraux', 'Poids du corps', 'Intermediaire'),
('Pompes diamant',                     'Pectoraux', 'Poids du corps', 'Avance'),
('Pompes lestees',                     'Pectoraux', 'Poids du corps', 'Avance'),
('Dips barres paralleles',             'Pectoraux', 'Poids du corps', 'Intermediaire'),
('Dips lestes',                        'Pectoraux', 'Poids du corps', 'Avance'),
('Dips machine',                       'Pectoraux', 'Machine',        'Debutant'),
('Pullover halteres',                  'Pectoraux', 'Haltere',        'Intermediaire'),
('Pullover barre',                     'Pectoraux', 'Barre',          'Intermediaire'),
('Cable crossover haut',               'Pectoraux', 'Poulie',         'Intermediaire'),
('Cable crossover bas',                'Pectoraux', 'Poulie',         'Intermediaire'),
('Developpe militaire smith',          'Pectoraux', 'Machine',        'Debutant'),
('Svend press',                        'Pectoraux', 'Haltere',        'Avance'),

-- DOS (25)
('Souleve de terre barre',             'Dos', 'Barre',          'Avance'),
('Souleve de terre sumo',              'Dos', 'Barre',          'Avance'),
('Souleve de terre roumain',           'Dos', 'Barre',          'Intermediaire'),
('Souleve de terre halteres',          'Dos', 'Haltere',        'Intermediaire'),
('Traction pronation',                 'Dos', 'Poids du corps', 'Avance'),
('Traction supination',                'Dos', 'Poids du corps', 'Avance'),
('Traction prise neutre',              'Dos', 'Poids du corps', 'Avance'),
('Traction lestee',                    'Dos', 'Poids du corps', 'Avance'),
('Traction assistee machine',          'Dos', 'Machine',        'Debutant'),
('Rowing barre buste penche',          'Dos', 'Barre',          'Intermediaire'),
('Rowing yates',                       'Dos', 'Barre',          'Avance'),
('Rowing haltere un bras',             'Dos', 'Haltere',        'Intermediaire'),
('Rowing halteres bilateral',          'Dos', 'Haltere',        'Intermediaire'),
('Rowing T-bar',                       'Dos', 'Barre',          'Intermediaire'),
('Rowing poulie basse',                'Dos', 'Poulie',         'Debutant'),
('Rowing poulie haute',                'Dos', 'Poulie',         'Debutant'),
('Tirage vertical poulie prise large', 'Dos', 'Poulie',         'Debutant'),
('Tirage vertical poulie prise serree','Dos', 'Poulie',         'Debutant'),
('Tirage horizontal poulie',           'Dos', 'Poulie',         'Debutant'),
('Tirage nuque',                       'Dos', 'Poulie',         'Avance'),
('Tirage menton (shrug)',              'Dos', 'Barre',          'Debutant'),
('Shrug halteres',                     'Dos', 'Haltere',        'Debutant'),
('Face pull',                          'Dos', 'Poulie',         'Debutant'),
('Good morning',                       'Dos', 'Barre',          'Avance'),
('Hyperextension',                     'Dos', 'Poids du corps', 'Debutant'),

-- EPAULES (20)
('Developpe militaire barre',          'Epaules', 'Barre',          'Intermediaire'),
('Developpe militaire halteres',       'Epaules', 'Haltere',        'Intermediaire'),
('Developpe Arnold',                   'Epaules', 'Haltere',        'Intermediaire'),
('Developpe nuque',                    'Epaules', 'Barre',          'Avance'),
('Push press',                         'Epaules', 'Barre',          'Avance'),
('Elevations laterales halteres',      'Epaules', 'Haltere',        'Debutant'),
('Elevations laterales poulie',        'Epaules', 'Poulie',         'Debutant'),
('Elevations laterales machine',       'Epaules', 'Machine',        'Debutant'),
('Elevations frontales halteres',      'Epaules', 'Haltere',        'Debutant'),
('Elevations frontales barre',         'Epaules', 'Barre',          'Debutant'),
('Elevations frontales poulie',        'Epaules', 'Poulie',         'Debutant'),
('Oiseau halteres buste penche',       'Epaules', 'Haltere',        'Intermediaire'),
('Oiseau machine',                     'Epaules', 'Machine',        'Debutant'),
('Oiseau poulie',                      'Epaules', 'Poulie',         'Intermediaire'),
('Tirage menton barre',                'Epaules', 'Barre',          'Intermediaire'),
('Tirage menton halteres',             'Epaules', 'Haltere',        'Intermediaire'),
('Handstand push-up',                  'Epaules', 'Poids du corps', 'Avance'),
('Pike push-up',                       'Epaules', 'Poids du corps', 'Intermediaire'),
('Kettlebell windmill',                'Epaules', 'Kettlebell',     'Avance'),
('Cuban press',                        'Epaules', 'Haltere',        'Avance'),

-- BICEPS (18)
('Curl barre',                         'Biceps', 'Barre',     'Debutant'),
('Curl barre EZ',                      'Biceps', 'Barre',     'Debutant'),
('Curl halteres alterne',              'Biceps', 'Haltere',   'Debutant'),
('Curl halteres simultane',            'Biceps', 'Haltere',   'Debutant'),
('Curl marteau',                       'Biceps', 'Haltere',   'Debutant'),
('Curl incline halteres',              'Biceps', 'Haltere',   'Intermediaire'),
('Curl concentre',                     'Biceps', 'Haltere',   'Intermediaire'),
('Curl pupitre (Larry Scott)',         'Biceps', 'Barre',     'Intermediaire'),
('Curl pupitre halteres',              'Biceps', 'Haltere',   'Intermediaire'),
('Curl poulie basse',                  'Biceps', 'Poulie',    'Debutant'),
('Curl poulie haute (crucifix)',       'Biceps', 'Poulie',    'Intermediaire'),
('Curl a la corde',                    'Biceps', 'Poulie',    'Debutant'),
('Curl 21',                            'Biceps', 'Barre',     'Intermediaire'),
('Curl drag',                          'Biceps', 'Barre',     'Intermediaire'),
('Curl spider',                        'Biceps', 'Haltere',   'Intermediaire'),
('Curl Zottman',                       'Biceps', 'Haltere',   'Intermediaire'),
('Tractions supination (chin-up)',     'Biceps', 'Poids du corps', 'Avance'),
('Curl inversed barre',                'Biceps', 'Barre',     'Intermediaire'),

-- TRICEPS (18)
('Dips triceps',                       'Triceps', 'Poids du corps', 'Intermediaire'),
('Barre au front (skull crusher)',     'Triceps', 'Barre',          'Intermediaire'),
('Barre au front halteres',            'Triceps', 'Haltere',        'Intermediaire'),
('Extension verticale halteres',       'Triceps', 'Haltere',        'Intermediaire'),
('Extension verticale barre',          'Triceps', 'Barre',          'Intermediaire'),
('Extension verticale poulie corde',   'Triceps', 'Poulie',         'Debutant'),
('Extension triceps couche',           'Triceps', 'Poulie',         'Intermediaire'),
('Pushdown barre',                     'Triceps', 'Poulie',         'Debutant'),
('Pushdown corde',                     'Triceps', 'Poulie',         'Debutant'),
('Pushdown un bras',                   'Triceps', 'Poulie',         'Debutant'),
('Kickback halteres',                  'Triceps', 'Haltere',        'Debutant'),
('Kickback poulie',                    'Triceps', 'Poulie',         'Debutant'),
('Developpe couche prise serree',      'Triceps', 'Barre',          'Intermediaire'),
('JM press',                           'Triceps', 'Barre',          'Avance'),
('Tate press',                         'Triceps', 'Haltere',        'Avance'),
('Pompes triceps diamant',             'Triceps', 'Poids du corps', 'Avance'),
('Dips bench',                         'Triceps', 'Poids du corps', 'Debutant'),
('California press',                   'Triceps', 'Haltere',        'Avance'),

-- JAMBES (35)
('Squat barre arriere (back squat)',   'Jambes', 'Barre',          'Intermediaire'),
('Squat barre avant (front squat)',    'Jambes', 'Barre',          'Avance'),
('Squat halteres (goblet squat)',      'Jambes', 'Haltere',        'Debutant'),
('Squat Bulgare',                      'Jambes', 'Haltere',        'Intermediaire'),
('Squat sumo',                         'Jambes', 'Barre',          'Intermediaire'),
('Squat hack',                         'Jambes', 'Machine',        'Intermediaire'),
('Squat smith machine',                'Jambes', 'Machine',        'Debutant'),
('Squat pistol',                       'Jambes', 'Poids du corps', 'Avance'),
('Squat poids du corps',               'Jambes', 'Poids du corps', 'Debutant'),
('Squat saute',                        'Jambes', 'Poids du corps', 'Intermediaire'),
('Leg press 45',                       'Jambes', 'Machine',        'Debutant'),
('Leg press horizontale',              'Jambes', 'Machine',        'Debutant'),
('Fentes avant halteres',              'Jambes', 'Haltere',        'Debutant'),
('Fentes arriere halteres',            'Jambes', 'Haltere',        'Debutant'),
('Fentes laterales halteres',          'Jambes', 'Haltere',        'Intermediaire'),
('Fentes marchees',                    'Jambes', 'Haltere',        'Intermediaire'),
('Fentes sautees',                     'Jambes', 'Poids du corps', 'Avance'),
('Step-up haltere',                    'Jambes', 'Haltere',        'Debutant'),
('Leg extension',                      'Jambes', 'Machine',        'Debutant'),
('Leg curl allonge',                   'Jambes', 'Machine',        'Debutant'),
('Leg curl assis',                     'Jambes', 'Machine',        'Debutant'),
('Leg curl debout',                    'Jambes', 'Machine',        'Debutant'),
('Nordic curl',                        'Jambes', 'Poids du corps', 'Avance'),
('Good morning ischios',               'Jambes', 'Barre',          'Avance'),
('Hip thrust barre',                   'Jambes', 'Barre',          'Intermediaire'),
('Hip thrust haltere',                 'Jambes', 'Haltere',        'Intermediaire'),
('Glute bridge',                       'Jambes', 'Poids du corps', 'Debutant'),
('Kettlebell swing',                   'Jambes', 'Kettlebell',     'Intermediaire'),
('Mollets debout machine',             'Jambes', 'Machine',        'Debutant'),
('Mollets assis machine',              'Jambes', 'Machine',        'Debutant'),
('Mollets un pied haltere',            'Jambes', 'Haltere',        'Debutant'),
('Mollets leg press',                  'Jambes', 'Machine',        'Debutant'),
('Hack squat',                         'Jambes', 'Barre',          'Avance'),
('Adducteur machine',                  'Jambes', 'Machine',        'Debutant'),
('Abducteur machine',                  'Jambes', 'Machine',        'Debutant'),

-- ABDOS (20)
('Crunch',                             'Abdos', 'Poids du corps', 'Debutant'),
('Crunch incline',                     'Abdos', 'Poids du corps', 'Debutant'),
('Crunch decline',                     'Abdos', 'Poids du corps', 'Intermediaire'),
('Crunch poulie (corde)',              'Abdos', 'Poulie',         'Debutant'),
('Crunch bicyclette',                  'Abdos', 'Poids du corps', 'Debutant'),
('Crunch inverse',                     'Abdos', 'Poids du corps', 'Intermediaire'),
('Releve de jambes suspendu',          'Abdos', 'Poids du corps', 'Avance'),
('Releve de jambes allonge',           'Abdos', 'Poids du corps', 'Debutant'),
('Knee raise suspendu',                'Abdos', 'Poids du corps', 'Intermediaire'),
('Planche (gainage)',                  'Abdos', 'Poids du corps', 'Debutant'),
('Planche laterale',                   'Abdos', 'Poids du corps', 'Debutant'),
('Planche dynamique',                  'Abdos', 'Poids du corps', 'Intermediaire'),
('Mountain climbers',                  'Abdos', 'Poids du corps', 'Debutant'),
('Dragon flag',                        'Abdos', 'Poids du corps', 'Avance'),
('Hollow hold',                        'Abdos', 'Poids du corps', 'Intermediaire'),
('Russian twist haltere',              'Abdos', 'Haltere',        'Debutant'),
('Ab wheel (roue abdominale)',         'Abdos', 'Autre',          'Avance'),
('Toes to bar',                        'Abdos', 'Poids du corps', 'Avance'),
('L-sit',                              'Abdos', 'Poids du corps', 'Avance'),
('Flexion laterale haltere',           'Abdos', 'Haltere',        'Debutant'),

-- CARDIO & METABOLIQUE (15)
('Burpees',                            'Cardio', 'Poids du corps', 'Intermediaire'),
('Jumping jacks',                      'Cardio', 'Poids du corps', 'Debutant'),
('High knees',                         'Cardio', 'Poids du corps', 'Debutant'),
('Box jump',                           'Cardio', 'Autre',          'Intermediaire'),
('Battle ropes',                       'Cardio', 'Autre',          'Intermediaire'),
('Rowing (aviron machine)',            'Cardio', 'Machine',        'Debutant'),
('Velo assault',                       'Cardio', 'Machine',        'Intermediaire'),
('Ski erg',                            'Cardio', 'Machine',        'Intermediaire'),
('Tapis course',                       'Cardio', 'Machine',        'Debutant'),
('Velo elliptique',                    'Cardio', 'Machine',        'Debutant'),
('Velo d''appartement',                'Cardio', 'Machine',        'Debutant'),
('Stair master',                       'Cardio', 'Machine',        'Intermediaire'),
('Sled push',                          'Cardio', 'Autre',          'Avance'),
('Farmer walk',                        'Cardio', 'Haltere',        'Intermediaire'),
('Kettlebell snatch',                  'Cardio', 'Kettlebell',     'Avance'),

-- CORPS ENTIER / OLYMPIQUE (15)
('Clean (epaule)',                     'Corps entier', 'Barre',     'Avance'),
('Power clean',                        'Corps entier', 'Barre',     'Avance'),
('Hang clean',                         'Corps entier', 'Barre',     'Avance'),
('Snatch (arrache)',                   'Corps entier', 'Barre',     'Avance'),
('Power snatch',                       'Corps entier', 'Barre',     'Avance'),
('Clean & jerk',                       'Corps entier', 'Barre',     'Avance'),
('Thruster',                           'Corps entier', 'Barre',     'Avance'),
('Overhead squat',                     'Corps entier', 'Barre',     'Avance'),
('Turkish get-up',                     'Corps entier', 'Kettlebell','Avance'),
('Man maker',                          'Corps entier', 'Haltere',   'Avance'),
('Devil press',                        'Corps entier', 'Haltere',   'Avance'),
('Wall ball',                          'Corps entier', 'Autre',     'Intermediaire'),
('Clean deadlift',                     'Corps entier', 'Barre',     'Intermediaire'),
('Sumo deadlift high pull',            'Corps entier', 'Barre',     'Avance'),
('Bear complex',                       'Corps entier', 'Barre',     'Avance'),

-- MOBILITE / GAINAGE AVANCE (10)
('Chat-vache',                         'Mobilite', 'Poids du corps', 'Debutant'),
('90/90 hip',                          'Mobilite', 'Poids du corps', 'Debutant'),
('Pigeon pose',                        'Mobilite', 'Poids du corps', 'Debutant'),
('Cossack squat',                      'Mobilite', 'Poids du corps', 'Intermediaire'),
('Jefferson curl',                     'Mobilite', 'Haltere',        'Intermediaire'),
('Band pull-apart',                    'Mobilite', 'Elastique',      'Debutant'),
('Wall slides',                        'Mobilite', 'Poids du corps', 'Debutant'),
('Y-T-W',                              'Mobilite', 'Haltere',        'Debutant'),
('Serratus push-up',                   'Mobilite', 'Poids du corps', 'Debutant'),
('World''s greatest stretch',          'Mobilite', 'Poids du corps', 'Debutant')
ON CONFLICT DO NOTHING;
