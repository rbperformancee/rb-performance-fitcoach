-- Ajout du champ preferred_slots pour la step 6 du questionnaire /candidature.
-- Le prospect choisit 3 creneaux preferes parmi une fenetre de 7 jours, 9h-20h.
-- Rayan reprend contact via WhatsApp pour caler le creneau definitif.
-- Format JSON: [{"date":"2026-05-02","time":"14:00"}, ...]

ALTER TABLE coaching_applications
  ADD COLUMN IF NOT EXISTS preferred_slots JSONB;

COMMENT ON COLUMN coaching_applications.preferred_slots IS
  '3 creneaux preferes (JSON array of {date, time}) choisis dans le formulaire /candidature. Rayan confirme le creneau final manuellement via WhatsApp.';
