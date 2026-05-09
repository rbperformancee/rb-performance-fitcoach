-- 011_live_sessions.sql
-- Enregistrement granulaire des seances clients avec Realtime pour
-- alimenter la vue "Seance vivante" cote coach (feed en temps reel
-- pendant que le client s'entraine).
--
-- 2 tables:
--   sessions        — la seance entiere (start/end/duree/RPE moyen)
--   session_sets    — chaque set loggue pendant la seance (charge, reps, RPE)
--
-- Realtime ENABLE sur session_sets INSERT → le coach voit chaque set
-- apparaitre en live dans la fiche client.
--
-- NB: il existe deja une table `session_logs` utilisee par la
-- TransformationView. Cette migration ne touche pas a cette table;
-- elle introduit un modele plus granulaire (par set) qui fera
-- remonter `session_logs` au moment du Terminer.

BEGIN;

-- =========================================================
-- SESSIONS (1 ligne par seance)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  seance_nom text NOT NULL,                   -- "Push" / "Pull" / "Legs" / ...
  week_number int,
  session_index int,                          -- ordre dans la semaine
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes int,
  rpe_moyen numeric(3,1),
  sets_completes int NOT NULL DEFAULT 0,
  sets_total int,
  status text NOT NULL DEFAULT 'active'       -- 'active' | 'completed' | 'abandoned'
);
CREATE INDEX IF NOT EXISTS sessions_client_idx    ON public.sessions (client_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_active_idx    ON public.sessions (client_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS sessions_programme_idx ON public.sessions (programme_id);

-- =========================================================
-- SESSION_SETS (chaque set loggue)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.session_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  exercice_nom text NOT NULL,
  exercice_index int NOT NULL DEFAULT 0,
  numero_set int NOT NULL,
  charge_kg numeric(6,2),
  reps int,
  rpe int CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  tempo text,
  note text,
  is_pr boolean NOT NULL DEFAULT false,       -- record personnel (calcule cote client)
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_sets_sess_idx ON public.session_sets (session_id, logged_at);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;

-- Client CRUD sur ses propres sessions
CREATE POLICY sessions_client_all ON public.sessions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));

-- Coach lecture seule sur les sessions de ses clients (feed vivant)
CREATE POLICY sessions_coach_read ON public.sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.coach_id = auth.uid()));

-- Session_sets idem
CREATE POLICY ssets_client_all ON public.session_sets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = session_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = session_id AND c.user_id = auth.uid()
  ));

CREATE POLICY ssets_coach_read ON public.session_sets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.clients c ON c.id = s.client_id
    WHERE s.id = session_id AND c.coach_id = auth.uid()
  ));

-- =========================================================
-- REALTIME
-- Ajouter sessions + session_sets a la publication supabase_realtime
-- pour que le coach recoive les events INSERT/UPDATE en live.
-- =========================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_sets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
