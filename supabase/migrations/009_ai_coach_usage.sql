-- 009_ai_coach_usage.sql
-- Compteur mensuel d'appels IA par coach (rate limit par plan).
--
-- Starter : 10 appels/mois
-- Pro     : 100 appels/mois
-- Elite   : illimite
--
-- Le reset se fait au 1er de chaque mois — l'Edge Function ai-coach
-- compare `ai_reset_date` et remet a zero si on a change de mois.

BEGIN;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS ai_calls_month int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_reset_date date NOT NULL DEFAULT date_trunc('month', now())::date;

COMMENT ON COLUMN public.coaches.ai_calls_month IS
  'Nombre d''appels Mistral effectues ce mois. Reset au 1er du mois.';
COMMENT ON COLUMN public.coaches.ai_reset_date IS
  'Debut du mois actuel (1er). Compare a now() pour savoir si on doit reset.';

-- Log optionnel des prompts IA (RGPD: audit et debug)
CREATE TABLE IF NOT EXISTS public.ai_coach_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  type text NOT NULL,                    -- 'analyze_client' | 'chat' | 'generate_programme'
  input_tokens int,
  output_tokens int,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  blocked_by_filter boolean NOT NULL DEFAULT false,    -- true si filtre medical a bloque
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_logs_coach_idx ON public.ai_coach_logs (coach_id, created_at DESC);

ALTER TABLE public.ai_coach_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_logs_coach_read ON public.ai_coach_logs
  FOR SELECT TO authenticated USING (coach_id = auth.uid());
-- Les inserts sont faits via Edge Function service role (pas de policy INSERT)

COMMIT;
