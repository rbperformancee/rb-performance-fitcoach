-- =========================================================
-- 111 : run_logs — extension GPS pour le tracker run natif
-- =========================================================
-- Quand l'athlète lance une course depuis l'app native (Phase 1),
-- on log : route GPS complète, splits par km, cadence moyenne,
-- horodatage précis. Ces colonnes restent NULL pour les logs
-- manuels (mode 'manual') = rétro-compat totale.
--
-- source = 'manual' (form web/PWA) | 'gps_native' (iOS Capacitor) | 'gps_web' (navigator.geolocation)
-- =========================================================

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS started_at timestamptz
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS ended_at timestamptz
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS paused_duration_s integer DEFAULT 0
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS route_coords jsonb
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS splits jsonb
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS avg_cadence_spm integer
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS max_speed_mps numeric(5,2)
;

ALTER TABLE public.run_logs
  ADD COLUMN IF NOT EXISTS elevation_gain_m integer
;

COMMENT ON COLUMN public.run_logs.source IS 'manual | gps_native (iOS) | gps_web (navigator.geolocation)'
;

COMMENT ON COLUMN public.run_logs.route_coords IS 'Array of {lat, lng, t (ms since start), alt?, speed?, hAcc?} sampled every ~1-3s by Core Location'
;

COMMENT ON COLUMN public.run_logs.splits IS 'Array of {km, time_s, pace_s_per_km, avg_hr?}'
;
