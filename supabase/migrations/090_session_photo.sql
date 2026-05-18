-- 090_session_photo.sql
-- « BeReal » de fin de séance : après la RPE, l'athlète peut prendre une
-- photo (optionnelle) de sa séance. Stockée sur session_logs ; le coach
-- la voit dans le récap des séances.

ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS photo_url text;
--@SPLIT@
ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS photo_caption text;
