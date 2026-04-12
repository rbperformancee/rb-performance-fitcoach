-- =============================================
-- MIGRATION 001 : Gestion Abonnements + Multi-Tenant
-- A executer dans Supabase Dashboard > SQL Editor
-- =============================================

-- ===== ETAPE 3 : GESTION ABONNEMENTS =====
-- Ajout des colonnes de suivi d'abonnement sur la table clients

ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_plan text; -- "8sem", "3m", "6m", "12m"
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_duration_months integer; -- 2, 3, 6, 12
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone; -- auto-set a l'upload du programme
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone; -- calcule: start + duration
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'pending'; -- pending, active, expiring, expired

-- ===== ETAPE 6 : MULTI-TENANT =====
-- Table coaches pour stocker les infos de chaque coach
CREATE TABLE IF NOT EXISTS coaches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  brand_name text, -- nom de marque visible par les clients (ex: "RB Perform")
  logo_url text, -- URL du logo du coach
  accent_color text DEFAULT '#02d1ba', -- couleur d'accent personnalisable
  created_at timestamp with time zone DEFAULT now(),
  stripe_customer_id text,
  is_active boolean DEFAULT true
);

-- Ajout du lien coach -> client
ALTER TABLE clients ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES coaches(id);

-- Creer le coach initial (Rayan) automatiquement
INSERT INTO coaches (email, full_name, brand_name)
VALUES ('rb.performancee@gmail.com', 'Rayan Bonte', 'RB Perform')
ON CONFLICT (email) DO NOTHING;

-- Lier tous les clients existants au coach Rayan
UPDATE clients
SET coach_id = (SELECT id FROM coaches WHERE email = 'rb.performancee@gmail.com')
WHERE coach_id IS NULL;

-- Index pour les requetes filtrees par coach
CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_subscription_end ON clients(subscription_end_date);

-- ===== FIN MIGRATION =====
-- Apres execution, verifier que :
-- 1. La table coaches existe avec 1 row (Rayan)
-- 2. La table clients a les nouvelles colonnes (subscription_*, coach_id)
-- 3. Tous les clients existants ont coach_id rempli
