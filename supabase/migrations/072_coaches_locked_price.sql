-- Fix bug critique pre-launch : webhook-stripe.js écrit `locked_price` et `plan`
-- sur la table coaches, mais ces colonnes n'existent pas.
--
-- Effet actuel : tout checkout Stripe complète OK côté Stripe + 200 au webhook,
-- mais l'upsert public.coaches échoue silencieusement (captureException puis
-- continue). Coach paye 199€ mais reste sur subscription_plan='free'.
--
-- Fix :
--  1. Ajoute la colonne `locked_price` (text, display du tarif verrouillé founders)
--  2. Le code applicatif sera patché en parallèle pour utiliser
--     `subscription_plan` (colonne existante depuis 062/066) au lieu de `plan`.
--
-- Pas de backfill nécessaire (founders existants étaient toujours sur Stripe
-- avec leur metadata locked_price, le webhook va resync au prochain
-- customer.subscription.updated).

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS locked_price text;

COMMENT ON COLUMN public.coaches.locked_price IS
  'Tarif verrouillé à vie pour les founders (ex: "199"). NULL pour les coachs en plans Pro/Elite standards.';
