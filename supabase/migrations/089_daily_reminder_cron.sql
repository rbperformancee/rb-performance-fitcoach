-- 089_daily_reminder_cron.sql
-- Notification du matin : pg_cron appelle l'Edge Function daily-reminder.
--
-- Le cron tape à 06:00 ET 07:00 UTC ; la function ne fait quelque chose
-- que si l'heure de Paris est 8h (robuste au changement d'heure été/hiver).
-- Clé publishable (anon) — publique par nature, déjà dans le bundle.

CREATE EXTENSION IF NOT EXISTS pg_cron;
--@SPLIT@
CREATE EXTENSION IF NOT EXISTS pg_net;
--@SPLIT@
SELECT cron.schedule(
  'daily-training-reminder',
  '0 6,7 * * *',
  $$SELECT net.http_post(
      url := 'https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/daily-reminder',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud'),
      body := '{}'::jsonb
    );$$
);
