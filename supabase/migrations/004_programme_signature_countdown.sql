-- =============================================
-- MIGRATION 004 : Signature programme + Date de debut
-- A executer dans Supabase Dashboard > SQL Editor
-- =============================================

ALTER TABLE programmes ADD COLUMN IF NOT EXISTS programme_accepted_at timestamp with time zone;
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS programme_start_date timestamp with time zone;
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS accepted_by text; -- prenom tape par le client
