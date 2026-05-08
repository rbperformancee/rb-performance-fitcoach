-- 048_push_subscriptions_coach.sql
-- Etend push_subscriptions aux coachs (était client-only depuis 005).
-- Cas d'usage : notifier le coach quand son client bat un PR, atteint un
-- objectif, valide une séance, etc. Sans push, le coach voit uniquement
-- les events s'il ouvre l'app — engagement faible.
--
-- Schéma : ajout colonne coach_id (nullable), client_id devient nullable,
-- CHECK qu'exactement un des deux est set. UNIQUE(coach_id, endpoint) pour
-- supporter le multi-device coach (même endpoint sur 2 navigateurs distincts
-- est impossible, mais la contrainte est cohérente avec celle client).
--
-- RLS coach : pattern email/uid identique à 034 (coaches.id != auth.uid()).

BEGIN;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE;

-- client_id devient nullable maintenant que coach_id existe
ALTER TABLE public.push_subscriptions
  ALTER COLUMN client_id DROP NOT NULL;

-- Exactly one of (client_id, coach_id) must be set
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subs_owner_check'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subs_owner_check
      CHECK ((client_id IS NULL) <> (coach_id IS NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_push_subs_coach
  ON public.push_subscriptions(coach_id)
  WHERE coach_id IS NOT NULL;

-- Unicité (coach_id, endpoint) pour permettre l'upsert depuis le hook
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subs_coach_endpoint_unique'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subs_coach_endpoint_unique
      UNIQUE (coach_id, endpoint);
  END IF;
END $$;

-- RLS : le coach gère ses propres subs (insert/update/delete sur ses rows)
DROP POLICY IF EXISTS push_subs_coach ON public.push_subscriptions;
CREATE POLICY push_subs_coach ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (
    coach_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = push_subscriptions.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  )
  WITH CHECK (
    coach_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id = push_subscriptions.coach_id
        AND (auth.uid()::text = c.id::text
             OR auth.jwt()->>'email' = c.email)
    )
  );

COMMIT;
