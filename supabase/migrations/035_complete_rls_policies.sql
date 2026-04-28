-- Migration 035 — Complete RLS policies for the 9 remaining 🟠 tables
--
-- Apres 034 qui a active RLS partout, il restait 9 tables sans policy.
-- Cette migration les complete avec policies basees sur leur schema reel.
--
-- Apply : Supabase Dashboard → SQL Editor → paste + run

-- ===== 1. bookings (client_id, slot_id, status) =====
-- Pas de coach_id direct → coach_slots est un pool partage de creneaux
-- (probablement reservé au founder Rayan pour appels avec founders).
-- Client peut creer/voir ses propres bookings.
DROP POLICY IF EXISTS bookings_client_own ON bookings;
CREATE POLICY bookings_client_own ON bookings FOR ALL USING (
  auth.uid()::text = client_id::text
);

-- ===== 2. client_badges (client_id, badge_id) =====
DROP POLICY IF EXISTS client_badges_own ON client_badges;
CREATE POLICY client_badges_own ON client_badges FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS client_badges_coach_read ON client_badges;
CREATE POLICY client_badges_coach_read ON client_badges FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = client_badges.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 3. coach_messages_flash (client_id, coach_id text) =====
-- Note : coach_id est text ici (pas uuid), donc cast pour comparer
DROP POLICY IF EXISTS coach_messages_flash_owner ON coach_messages_flash;
CREATE POLICY coach_messages_flash_owner ON coach_messages_flash FOR ALL USING (
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.id::text = coach_messages_flash.coach_id
      AND (auth.uid()::text = coaches.id::text OR auth.jwt()->>'email' = coaches.email)
  )
);

DROP POLICY IF EXISTS coach_messages_flash_recipient ON coach_messages_flash;
CREATE POLICY coach_messages_flash_recipient ON coach_messages_flash FOR ALL USING (
  auth.uid()::text = client_id::text
);

-- ===== 4. coach_slots (date, heure, is_available — pool partage) =====
-- Lecture publique (clients voient les creneaux dispo pour booker).
-- Ecriture : seulement service_role (cron qui regenere les slots).
DROP POLICY IF EXISTS coach_slots_public_read ON coach_slots;
CREATE POLICY coach_slots_public_read ON coach_slots FOR SELECT USING (TRUE);

-- ===== 5. cold_prospects — service_role only =====
-- Pas de policy = service_role bypass uniquement. Cron cold-outreach
-- l'utilise. Aucun acces cote client. SAFE en l'etat.
-- (Pas de policy ajoutée pour confirmer ce design intent.)

-- ===== 6. notification_logs — service_role only =====
-- Crons l'utilisent pour idempotence (pas de double-envoi).
-- Aucun acces cote client. SAFE en l'etat.

-- ===== 7. sentinel_mistral_logs (coach_id uuid) =====
-- Logs des appels AI Mistral par coach. Coach voit ses propres logs.
DROP POLICY IF EXISTS sentinel_mistral_logs_coach_read ON sentinel_mistral_logs;
CREATE POLICY sentinel_mistral_logs_coach_read ON sentinel_mistral_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.id = sentinel_mistral_logs.coach_id
      AND (auth.uid()::text = coaches.id::text OR auth.jwt()->>'email' = coaches.email)
  )
);

-- ===== 8. session_completions (client_id) =====
DROP POLICY IF EXISTS session_completions_client ON session_completions;
CREATE POLICY session_completions_client ON session_completions FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS session_completions_coach_read ON session_completions;
CREATE POLICY session_completions_coach_read ON session_completions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = session_completions.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 9. session_live (client_id) =====
DROP POLICY IF EXISTS session_live_client ON session_live;
CREATE POLICY session_live_client ON session_live FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS session_live_coach_read ON session_live;
CREATE POLICY session_live_coach_read ON session_live FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = session_live.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- ===== 10. transformation_sessions (client_id) =====
DROP POLICY IF EXISTS transformation_sessions_client ON transformation_sessions;
CREATE POLICY transformation_sessions_client ON transformation_sessions FOR ALL USING (
  auth.uid()::text = client_id::text
);

DROP POLICY IF EXISTS transformation_sessions_coach_read ON transformation_sessions;
CREATE POLICY transformation_sessions_coach_read ON transformation_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM coaches c
    JOIN clients cl ON cl.coach_id = c.id
    WHERE cl.id = transformation_sessions.client_id
      AND (auth.uid()::text = c.id::text OR auth.jwt()->>'email' = c.email)
  )
);

-- Apres apply, refaire l'audit. Tout doit etre ✅ (sauf cold_prospects et
-- notification_logs qui restent volontairement 🟠 = service_role only).
