-- 088_field_session_logs.sql
-- Séances "terrain" (foot, rugby…) prescrites par le coach dans le
-- programme, rattachées à un jour de séance. La prescription vit dans
-- le HTML du programme ; cette table stocke la COMPLÉTION par l'athlète :
-- coché « fait » + ressenti court (RPE) + note.

CREATE TABLE IF NOT EXISTS public.field_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_idx int NOT NULL,
  session_idx int NOT NULL,
  field_idx int NOT NULL,
  done_at timestamptz NOT NULL DEFAULT now(),
  rpe int,
  note text,
  UNIQUE (client_id, week_idx, session_idx, field_idx)
);
--@SPLIT@
ALTER TABLE public.field_session_logs ENABLE ROW LEVEL SECURITY;
--@SPLIT@
CREATE POLICY field_session_logs_client ON public.field_session_logs
  FOR ALL
  USING (lower(auth.jwt() ->> 'email') IN (
    SELECT lower(c.email) FROM public.clients c WHERE c.id = field_session_logs.client_id))
  WITH CHECK (lower(auth.jwt() ->> 'email') IN (
    SELECT lower(c.email) FROM public.clients c WHERE c.id = field_session_logs.client_id));
--@SPLIT@
CREATE POLICY field_session_logs_coach ON public.field_session_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coaches co
    JOIN public.clients cl ON cl.coach_id = co.id
    WHERE cl.id = field_session_logs.client_id
      AND ((auth.uid())::text = (co.id)::text
        OR lower(auth.jwt() ->> 'email') = lower(co.email))));
