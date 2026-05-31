-- 104_session_completions_finisher.sql
-- 24 mai 2026 — Tracking de la durée du finisher en DB.
--
-- Cf. demande Rayan : "dans l'historique j'aimerais voir le temps du finisher".
-- Le client a déjà un bouton "Démarrer le chrono" finisher dans FinisherCard
-- (src/components/TrainingPage.jsx), mais le total est stocké uniquement en
-- localStorage (`rb_finisher_W_S`). On le persiste maintenant en DB pour que
-- le coach le voie dans l'historique du client.
--
-- Logique côté client (TrainingPage.FinisherCard.stop) :
--   - localStorage reste source de vérité UI (offline-first, survit close PWA)
--   - Au stop, on UPSERT session_completions.finisher_seconds (best-effort,
--     sans bloquer l'UX si le réseau est down)
--
-- Logique côté coach (CoachDashboard timeline séances) :
--   - clientCompletions select * inclut maintenant finisher_seconds
--   - Render : "⏱ 1h32 · 🔥 finisher 5:42" si finisher_seconds > 0

ALTER TABLE public.session_completions
  ADD COLUMN IF NOT EXISTS finisher_seconds INTEGER NOT NULL DEFAULT 0;

--@SPLIT@

COMMENT ON COLUMN public.session_completions.finisher_seconds IS
  'Durée du finisher en secondes (chrono client). 0 = pas de finisher fait. Source : src/components/TrainingPage.jsx FinisherCard.stop().';
