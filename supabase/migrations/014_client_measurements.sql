-- 014_client_measurements.sql
-- Pesées et mesures client. Alimente le graphe poids de ClientSuivi.
--
-- NB: une table `weight_logs` existe deja (utilisee par TransformationView).
-- On l'etend via un nouvel objet `client_measurements` qui accepte plus
-- de mesures (tour de taille, etc.) mais pour l'instant se contente du poids.
-- Cette table coexiste avec weight_logs; ClientSuivi utilise celle-ci.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  weight_kg numeric(5,2),
  waist_cm numeric(5,2),          -- futur
  hips_cm numeric(5,2),           -- futur
  body_fat_pct numeric(4,1),      -- futur
  note text,
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_meas_client_idx ON public.client_measurements (client_id, measured_at DESC);

ALTER TABLE public.client_measurements ENABLE ROW LEVEL SECURITY;

-- Client CRUD sur ses propres mesures
CREATE POLICY client_meas_self_all ON public.client_measurements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));

-- Coach lecture seule sur les mesures de ses clients
CREATE POLICY client_meas_coach_read ON public.client_measurements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.coach_id = auth.uid()));

COMMIT;
