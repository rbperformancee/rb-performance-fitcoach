-- =============================================
-- MIGRATION 003 : Super Admin + Multi-Tenant routing
-- A executer dans Supabase Dashboard > SQL Editor
-- =============================================

-- Table super_admins : seuls ces emails ont acces au dashboard plateforme
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Rayan = super admin de la plateforme
INSERT INTO super_admins (email) VALUES ('rb.performancee@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- S'assurer que tous les coaches sont aussi dans la table coaches
-- (deja fait par migration 001, mais on verifie)
INSERT INTO coaches (email, full_name, brand_name)
VALUES ('rb.performancee@gmail.com', 'Rayan Bonte', 'RB Perform')
ON CONFLICT (email) DO NOTHING;
