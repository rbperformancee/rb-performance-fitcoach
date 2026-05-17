-- 087_checkin_frequency.sql
-- Fréquence du bilan réglable par le coach, par client.
-- 'weekly' (défaut) | 'biweekly' (toutes les 2 semaines) | 'monthly'.
-- La colonne weekly_checkins.week_start sert d'ancre de période :
-- lundi de la semaine/quinzaine, ou 1er du mois.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS checkin_frequency text NOT NULL DEFAULT 'weekly';
--@SPLIT@
ALTER TABLE public.clients
  ADD CONSTRAINT clients_checkin_frequency_chk
  CHECK (checkin_frequency IN ('weekly', 'biweekly', 'monthly'));
