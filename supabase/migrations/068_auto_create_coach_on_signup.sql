-- 068_auto_create_coach_on_signup.sql
-- Bug critique pre-launch : la SignupPage appelle supabase.auth.signUp() mais
-- ne crée jamais le row dans public.coaches. Conséquence : un nouveau coach
-- s'inscrit, confirme l'email, atterrit sur / → pas de row coaches → isCoach
-- = false → écran client vide / blocage total.
--
-- Solution : trigger sur auth.users qui auto-crée le row coach SI :
--   - aucun coach n'existe déjà avec cet email
--   - aucun client n'existe avec cet email (sinon = client en train de
--     s'inscrire via lien d'invitation, on touche pas)
--
-- Le row créé a juste l'essentiel : id, email, full_name (depuis user_metadata),
-- subscription_plan='free'. Brand_name reste NULL → déclenche le nouvel
-- onboarding 7-step au prochain login (cf. App.jsx:1232).

BEGIN;

CREATE OR REPLACE FUNCTION public.auto_create_coach_on_signup() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  client_exists boolean;
  coach_exists boolean;
  full_name text;
  first_name text;
  last_name text;
BEGIN
  -- Skip si email manquant (cas auth providers atypiques)
  IF NEW.email IS NULL THEN RETURN NEW; END IF;

  -- Skip si déjà coach
  SELECT EXISTS (SELECT 1 FROM public.coaches WHERE LOWER(email) = LOWER(NEW.email)) INTO coach_exists;
  IF coach_exists THEN RETURN NEW; END IF;

  -- Skip si c'est un client (s'inscrit via lien d'invitation)
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE LOWER(email) = LOWER(NEW.email)) INTO client_exists;
  IF client_exists THEN RETURN NEW; END IF;

  -- Récupère les metadata signup (raw_user_meta_data)
  full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  first_name := NEW.raw_user_meta_data->>'first_name';
  last_name := NEW.raw_user_meta_data->>'last_name';

  -- Crée le row coach minimal
  INSERT INTO public.coaches (id, email, full_name, first_name, last_name, is_active, subscription_plan, founding_coach)
  VALUES (NEW.id, NEW.email, full_name, first_name, last_name, true, 'free', false)
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_coach_trigger ON auth.users;
CREATE TRIGGER auto_create_coach_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_coach_on_signup();

COMMIT;
