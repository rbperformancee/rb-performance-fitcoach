-- 082_message_push_trigger.sql
-- Push notif à CHAQUE message — côté serveur.
--
-- Avant : la notif partait du navigateur de l'expéditeur (fragile : cache
-- PWA, onglet fermé, vieux bundle…). Désormais un trigger Postgres sur
-- INSERT dans `messages` appelle l'Edge Function send-push directement,
-- via pg_net (HTTP async). Indépendant de tout client.
--
-- from_coach = true  → message du coach   → notifie le client
-- from_coach = false → message du client  → notifie le coach
--
-- SÉCURITÉ / ROBUSTESSE : l'appel HTTP est dans un bloc EXCEPTION qui
-- avale toute erreur — un souci de push ne doit JAMAIS bloquer l'insert
-- d'un message. La clé utilisée est la clé *publishable* (anon), publique
-- par nature (déjà dans le bundle frontend).

CREATE EXTENSION IF NOT EXISTS pg_net;
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
  v_body := left(regexp_replace(coalesce(NEW.content, ''), '\s+', ' ', 'g'), 120);

  IF NEW.from_coach IS TRUE THEN
    -- message du coach → notifier le client
    SELECT coalesce(co.coaching_name, co.full_name)
      INTO v_name
      FROM public.clients cl
      JOIN public.coaches co ON co.id = cl.coach_id
     WHERE cl.id = NEW.client_id;
    v_recipient := jsonb_build_object('client_id', NEW.client_id);
    v_title := coalesce('Message de ' || v_name, 'Nouveau message de ton coach');
  ELSE
    -- message du client → notifier le coach
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
    NULL;  -- ne JAMAIS bloquer l'insert du message
  END;

  RETURN NEW;
END;
$func$;
--@SPLIT@
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
--@SPLIT@
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
