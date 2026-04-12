-- =============================================
-- 007 : Backfill coach_notes.coach_id depuis clients.coach_id
-- =============================================
-- Les anciennes coach_notes creees avant l'ajout du coach_id
-- dans le code ne l'ont pas. On les rattache au coach du client.

UPDATE coach_notes cn
SET coach_id = cl.coach_id
FROM clients cl
WHERE cn.client_id = cl.id
  AND cn.coach_id IS NULL
  AND cl.coach_id IS NOT NULL;
