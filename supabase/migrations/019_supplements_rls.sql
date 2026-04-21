-- 019_supplements_rls.sql
-- RLS policies pour client_supplements et supplement_logs
-- Permet aux clients de gerer leurs complements et aux coachs de prescrire

-- ===== client_supplements =====
-- Client peut lire/inserer/modifier ses propres complements
CREATE POLICY "client_read_own_supplements" ON client_supplements
  FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "client_insert_own_supplements" ON client_supplements
  FOR INSERT WITH CHECK (client_id IN (SELECT id FROM clients WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "client_update_own_supplements" ON client_supplements
  FOR UPDATE USING (client_id IN (SELECT id FROM clients WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "client_delete_own_supplements" ON client_supplements
  FOR DELETE USING (client_id IN (SELECT id FROM clients WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- Coach peut gerer les complements de ses clients
CREATE POLICY "coach_manage_client_supplements" ON client_supplements
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid()));

-- ===== supplement_logs =====
-- Client peut lire/inserer/modifier ses propres logs
CREATE POLICY "client_read_own_sup_logs" ON supplement_logs
  FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "client_insert_own_sup_logs" ON supplement_logs
  FOR INSERT WITH CHECK (client_id IN (SELECT id FROM clients WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "client_update_own_sup_logs" ON supplement_logs
  FOR UPDATE USING (client_id IN (SELECT id FROM clients WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- Coach peut lire les logs de ses clients
CREATE POLICY "coach_read_sup_logs" ON supplement_logs
  FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid()));
