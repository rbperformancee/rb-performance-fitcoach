-- =============================================
-- 027 : Validation de semaine (mode hybride calendrier + a la demande)
-- =============================================
-- Le client peut valider une semaine quand tout est fait → debloque la
-- suivante meme si le calendrier n'est pas encore rendu.
-- currentWeek = MAX(calendar_week, validated_until_week + 1)
--
-- 0 = aucune semaine validee (default).
-- 3 = semaines 1, 2 et 3 validees → la 4 est debloquee meme tot.

BEGIN;

ALTER TABLE programmes ADD COLUMN IF NOT EXISTS validated_until_week INTEGER DEFAULT 0;
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

COMMIT;
