-- 017_cold_outreach.sql
-- Cold email outreach pipeline

CREATE TABLE IF NOT EXISTS cold_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  instagram TEXT,
  followers INTEGER,
  niche TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'sent_1', 'sent_2', 'sent_3', 'replied', 'converted', 'unsubscribed', 'bounced')),
  emails_sent INTEGER NOT NULL DEFAULT 0,
  last_email_at TIMESTAMPTZ,
  next_email_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cold_prospects_email_unique UNIQUE (email)
);

CREATE INDEX idx_cold_next_email ON cold_prospects(next_email_at) WHERE status IN ('new', 'sent_1', 'sent_2');
CREATE INDEX idx_cold_status ON cold_prospects(status);
