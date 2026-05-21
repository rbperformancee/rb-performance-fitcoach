-- 099 — Fix RLS facturation : utiliser des helpers qui matchent la convention
-- d'auth du repo (coaches.id ≠ auth.uid mais coaches.email = auth.jwt email,
-- clients.user_id = auth.uid).
--
-- Bug détecté : les migrations 095, 098 utilisaient `coach_id = auth.uid()`
-- comme check RLS. Or les uuid coaches.id et auth.users.id sont distincts
-- dans ce projet — la jointure se fait via email pour le coach et via
-- clients.user_id pour le client. Sans ce fix :
--   - le coach (Rayan) ne peut pas insérer/lire ses propres schedules/factures
--     depuis l'app côté frontend (l'ANON key passe la session JWT mais
--     auth.uid() retourne l'auth.users.id, pas coaches.id)
--   - le client ne peut pas voir ses propres factures (client_id = clients.id
--     ≠ auth.uid)
--
-- Helpers SECURITY DEFINER pour centraliser la logique.

CREATE OR REPLACE FUNCTION public.is_my_coach(p_coach_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coaches
    WHERE id = p_coach_id
    AND (
      id::text = auth.uid()::text
      OR email = auth.jwt() ->> 'email'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_my_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id
    AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_my_coach(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_client(uuid) TO authenticated;

-- ===== payment_schedules (correction 095) =====
DROP POLICY IF EXISTS "coach manages own schedules" ON public.payment_schedules;
CREATE POLICY "coach manages own schedules" ON public.payment_schedules
  FOR ALL
  USING (public.is_my_coach(coach_id))
  WITH CHECK (public.is_my_coach(coach_id));

-- ===== invoices (correction 098) =====
DROP POLICY IF EXISTS "coach manages own invoices" ON public.invoices;
CREATE POLICY "coach manages own invoices" ON public.invoices
  FOR ALL
  USING (public.is_my_coach(coach_id))
  WITH CHECK (public.is_my_coach(coach_id));

DROP POLICY IF EXISTS "client reads own invoices" ON public.invoices;
CREATE POLICY "client reads own invoices" ON public.invoices
  FOR SELECT
  USING (public.is_my_client(client_id));

-- ===== receipts (correction 098) =====
DROP POLICY IF EXISTS "coach manages own receipts" ON public.receipts;
CREATE POLICY "coach manages own receipts" ON public.receipts
  FOR ALL
  USING (public.is_my_coach(coach_id))
  WITH CHECK (public.is_my_coach(coach_id));

DROP POLICY IF EXISTS "client reads own receipts" ON public.receipts;
CREATE POLICY "client reads own receipts" ON public.receipts
  FOR SELECT
  USING (public.is_my_client(client_id));

-- ===== Fix next_invoice_number / next_receipt_number =====
-- Ces RPC checkaient `auth.uid() = p_coach_id` ce qui ne marche pas
-- (auth.uid = auth.users.id ≠ coaches.id). On remplace par is_my_coach.

DROP FUNCTION IF EXISTS public.next_invoice_number(uuid);
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_coach_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $f$
DECLARE
  v_next integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
BEGIN
  IF NOT public.is_my_coach(p_coach_id) THEN
    RAISE EXCEPTION 'Forbidden: caller is not the coach owning this counter';
  END IF;
  UPDATE public.coaches SET invoice_counter = invoice_counter + 1 WHERE id = p_coach_id RETURNING invoice_counter INTO v_next;
  IF v_next IS NULL THEN RAISE EXCEPTION 'Coach not found'; END IF;
  RETURN 'INV-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$f$;

DROP FUNCTION IF EXISTS public.next_receipt_number(uuid);
CREATE OR REPLACE FUNCTION public.next_receipt_number(p_coach_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $f$
DECLARE
  v_next integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
BEGIN
  IF NOT public.is_my_coach(p_coach_id) THEN
    RAISE EXCEPTION 'Forbidden: caller is not the coach owning this counter';
  END IF;
  UPDATE public.coaches SET receipt_counter = receipt_counter + 1 WHERE id = p_coach_id RETURNING receipt_counter INTO v_next;
  IF v_next IS NULL THEN RAISE EXCEPTION 'Coach not found'; END IF;
  RETURN 'REC-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$f$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(uuid) TO authenticated;

-- ===== Storage policies pour coach-invoices =====
-- L'ancien check `(storage.foldername(name))[1] = auth.uid()::text` ne marche
-- pas pour la même raison. On joint via la table coaches.

DROP POLICY IF EXISTS "coach uploads own invoices" ON storage.objects;
CREATE POLICY "coach uploads own invoices" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'coach-invoices'
    AND EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.id::text = auth.uid()::text OR c.email = auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "coach reads own invoices" ON storage.objects;
CREATE POLICY "coach reads own invoices" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'coach-invoices'
    AND (
      -- Le coach lui-même
      EXISTS (
        SELECT 1 FROM public.coaches c
        WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.id::text = auth.uid()::text OR c.email = auth.jwt() ->> 'email')
      )
      -- OU un client autorisé via invoice ou receipt
      OR EXISTS (
        SELECT 1 FROM public.invoices i
        JOIN public.clients cl ON cl.id = i.client_id
        WHERE i.pdf_url = name AND cl.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.receipts r
        JOIN public.clients cl ON cl.id = r.client_id
        WHERE r.pdf_url = name AND cl.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "coach updates own invoices" ON storage.objects;
CREATE POLICY "coach updates own invoices" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'coach-invoices'
    AND EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.id::text = auth.uid()::text OR c.email = auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "coach deletes own invoices" ON storage.objects;
CREATE POLICY "coach deletes own invoices" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'coach-invoices'
    AND EXISTS (
      SELECT 1 FROM public.coaches c
      WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.id::text = auth.uid()::text OR c.email = auth.jwt() ->> 'email')
    )
  );
