-- 096 — Ajoute le module 'late_payments' à la contrainte sentinel_cards.module
--
-- Nouveau cron sentinel-late-payments crée des cartes signalant les échéances
-- payment_schedules en retard de 7 jours+. Module dédié pour pouvoir filtrer
-- côté UI (badge spécifique, action "Voir Comptes à recevoir", etc.).

ALTER TABLE public.sentinel_cards
  DROP CONSTRAINT IF EXISTS sentinel_cards_module_check;

ALTER TABLE public.sentinel_cards
  ADD CONSTRAINT sentinel_cards_module_check
  CHECK (module = ANY (ARRAY[
    'price_intel'::text,
    'ranking'::text,
    'daily_playbook'::text,
    'revenue_unblocker'::text,
    'late_payments'::text
  ]));
