-- Migration 115 — CRM personnel super-admin (Rayan)
--
-- Tables pour un CRM léger qui s'appuie sur les contacts déjà présents
-- dans la base (clients, coaching_applications, waitlist, cold_prospects)
-- + permet d'ajouter des leads manuels (DM Instagram, contacts terrain).
--
-- Modèle : clé d'unicité = email lowercased. Les notes, tags, reminders
-- sont rattachés par email — pas besoin de table "contacts" centralisée
-- (la vue agrégée est calculée côté JS au mount du CRM tab).
--
-- Sécurité : super_admin only via RLS — invisible et inaccessible pour
-- tous les autres coachs qui prendront le SaaS.

--@SPLIT@

-- ─── Stage pipeline + notes liées à un contact (par email) ────────────
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  email TEXT PRIMARY KEY,
  stage TEXT NOT NULL DEFAULT 'cold'
    CHECK (stage IN ('cold', 'warm', 'hot', 'call_booked', 'in_progress', 'closed_won', 'closed_lost')),
  source_primary TEXT,                      -- ex: 'candidature', 'waitlist', 'instagram', 'cold_prospect'
  display_name TEXT,
  phone TEXT,
  instagram_handle TEXT,
  notes_summary TEXT,                        -- résumé court pour list view (le détail = crm_notes)
  last_contacted_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--@SPLIT@

-- ─── Notes timeline (multiple notes par contact, horodatées) ──────────
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES public.crm_contacts(email) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_notes_email ON public.crm_notes(email);
CREATE INDEX IF NOT EXISTS idx_crm_notes_created ON public.crm_notes(created_at DESC);

--@SPLIT@

-- ─── Tags (free-form, multi par contact) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES public.crm_contacts(email) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, tag)
);
CREATE INDEX IF NOT EXISTS idx_crm_tags_email ON public.crm_tags(email);
CREATE INDEX IF NOT EXISTS idx_crm_tags_tag ON public.crm_tags(tag);

--@SPLIT@

-- ─── Reminders (rappels datés, type "relancer Victor le 30/06") ──────
CREATE TABLE IF NOT EXISTS public.crm_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES public.crm_contacts(email) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  done_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_email ON public.crm_reminders(email);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_due ON public.crm_reminders(due_at) WHERE done = FALSE;

--@SPLIT@

-- ─── Leads manuels (DM Insta, contacts terrain, qui n'apparaissent ────
--     pas dans coaching_applications / waitlist / clients) ────────────
CREATE TABLE IF NOT EXISTS public.crm_manual_leads (
  email TEXT PRIMARY KEY REFERENCES public.crm_contacts(email) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'instagram',  -- 'instagram' | 'whatsapp' | 'phone' | 'event' | 'autre'
  context TEXT,                               -- "DM 12/06 — répond à ma story marque protein"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--@SPLIT@

-- ─── RLS : super_admin only sur les 5 tables ──────────────────────────
ALTER TABLE public.crm_contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_reminders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_manual_leads  ENABLE ROW LEVEL SECURITY;

--@SPLIT@

-- Helper inline : check si l'auth.jwt email est dans super_admins.
-- Réutilisé par les 5 policies.
CREATE POLICY crm_contacts_super_admin ON public.crm_contacts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

--@SPLIT@

CREATE POLICY crm_notes_super_admin ON public.crm_notes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

--@SPLIT@

CREATE POLICY crm_tags_super_admin ON public.crm_tags
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

--@SPLIT@

CREATE POLICY crm_reminders_super_admin ON public.crm_reminders
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

--@SPLIT@

CREATE POLICY crm_manual_leads_super_admin ON public.crm_manual_leads
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE super_admins.email = (auth.jwt() ->> 'email')
  ));

--@SPLIT@

-- Trigger updated_at sur crm_contacts.
CREATE OR REPLACE FUNCTION public.crm_contacts_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--@SPLIT@

DROP TRIGGER IF EXISTS trg_crm_contacts_updated_at ON public.crm_contacts;
CREATE TRIGGER trg_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_contacts_touch_updated_at();
