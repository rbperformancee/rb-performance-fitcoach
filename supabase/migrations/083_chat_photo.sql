-- 083_chat_photo.sql
-- Photos dans la messagerie (bilans).
--
-- - messages.media_url / media_type : un message peut porter une photo
--   (media_type='image'). NULL = message texte classique → l'existant
--   n'est pas touché.
-- - Policies storage pour le bucket progress-photos (upload + lecture)
--   par les utilisateurs authentifiés — il n'en avait aucune.
-- - notify_new_message (trigger 082) mis à jour : la push affiche
--   « 📷 Photo » au lieu d'un texte vide.

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
--@SPLIT@
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type text;
--@SPLIT@
DROP POLICY IF EXISTS progress_photos_upload ON storage.objects;
--@SPLIT@
CREATE POLICY progress_photos_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos');
--@SPLIT@
DROP POLICY IF EXISTS progress_photos_read ON storage.objects;
--@SPLIT@
CREATE POLICY progress_photos_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos');
--@SPLIT@
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  v_recipient jsonb;
  v_title text;
  v_body text;
  v_coach_id uuid;
  v_name text;
BEGIN
  -- Corps de la notif : libellé média si photo/audio, sinon le texte.
  IF NEW.media_type = 'image' THEN
    v_body := '📷 Photo';
  ELSIF NEW.media_type = 'audio' THEN
    v_body := '🎤 Message vocal';
  ELSE
    v_body := left(regexp_replace(coalesce(NEW.content, ''), '\s+', ' ', 'g'), 120);
  END IF;

  IF NEW.from_coach IS TRUE THEN
    SELECT coalesce(co.coaching_name, co.full_name)
      INTO v_name
      FROM public.clients cl
      JOIN public.coaches co ON co.id = cl.coach_id
     WHERE cl.id = NEW.client_id;
    v_recipient := jsonb_build_object('client_id', NEW.client_id);
    v_title := coalesce('Message de ' || v_name, 'Nouveau message de ton coach');
  ELSE
    SELECT cl.coach_id, cl.full_name
      INTO v_coach_id, v_name
      FROM public.clients cl
     WHERE cl.id = NEW.client_id;
    IF v_coach_id IS NULL THEN
      RETURN NEW;
    END IF;
    v_recipient := jsonb_build_object('coach_id', v_coach_id);
    v_title := coalesce('Message de ' || v_name, 'Nouveau message');
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud'),
      body := v_recipient || jsonb_build_object('title', v_title, 'body', v_body, 'url', '/app.html')
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$func$;
