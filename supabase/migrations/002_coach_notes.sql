-- =============================================
-- MIGRATION 002 : Notes internes coach par client
-- A executer dans Supabase Dashboard > SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES coaches(id),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_notes_client ON coach_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_created ON coach_notes(created_at DESC);
