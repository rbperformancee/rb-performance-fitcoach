// src/components/RunSession.jsx
//
// Tracker de course LIVE — Phases 1+2+3.
//
// Phase 1 — MVP GPS :
//   • Distance + chrono + pace + cadence live, splits par km
//   • Contrôles Start/Pause/Resume/Stop, audio cues TTS FR par km
//   • Sauvegarde run_logs Supabase (route_coords + splits)
//
// Phase 2 — Coach-aware :
//   • Prop `prescribedTarget` = run prescrit par le coach (cible distance,
//     durée, allure, bpm, HIIT). Briefing screen avant le start.
//   • Pendant le run : pace delta chip vs cible (vert / jaune / rouge)
//   • Après le stop : bloc comparaison Cible vs Réalisé + verdict
//   • Sauvegarde avec programme_id + tags pour visibilité coach
//
// Phase 3 — Premium polish :
//   • HealthKit : workout running enregistré (distance, durée, route GPS)
//   • Live Activity : Dynamic Island + Lock Screen avec stats live
//
// Le composant gère son state interne. Le parent fournit `client`,
// `onClose` et optionnellement `prescribedTarget`.

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  requestPermission, startRun, pauseRun, resumeRun, stopRun,
  onLocation, onKm, onAutoPause, onCadence,
  onGpsQuality, onAutomotiveDetected,
  exportGPX, getStrideLength, setIndoorMode,
  formatPace, formatDuration, formatDistance,
} from "../lib/runTracker";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";
import { isNative } from "../lib/native";
import haptic from "../lib/haptic";
// RunShareStory retiré : share simplifié à text-copy + GPX seulement.
import { saveRunWorkout, requestWorkoutPermission, requestHeartRatePermission, startHeartRateStream } from "../lib/health";
import runActivity from "../lib/runLiveActivity";
import { parseTarget, compareToTarget } from "../lib/runTarget";
import { fetchCurrentWeather } from "../lib/weather";
import { buildSchedule, nextPhase as nextIntervalPhase, parseSegment, announceText } from "../lib/runIntervals";
// Camera retiré : plus de selfie finish.

import { todayLocal } from "../lib/date";
const G = "#02d1ba";
const RED = "#ef4444";

// Audio cue voix FR au franchissement d'un km
function speakKmAudio(km, paceSec) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(
    `${km} kilomètre${km > 1 ? "s" : ""}. Allure ${Math.floor(paceSec / 60)} minutes ${Math.round(paceSec % 60)} secondes par kilomètre.`
  );
  utterance.lang = "fr-FR";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  try { window.speechSynthesis.speak(utterance); } catch (_) {}
}

// Voix FR pour annoncer une phase d'intervalle
function speakIntervalPhase(text) {
  if (!("speechSynthesis" in window) || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR"; u.rate = 1.0; u.volume = 1.0;
  try { window.speechSynthesis.speak(u); } catch (_) {}
}

// Calcule la zone HR à partir d'un bpm (FCM Karvonen simplifié, base 220-30).
// On ne demande pas l'âge à l'athlète pour l'instant — défaut 30 ans.
function computeHrZone(bpm, age = 30) {
  if (!(bpm > 0)) return 0;
  const max = 220 - age;
  const pct = bpm / max;
  if (pct < 0.6) return 1;   // Z1 récup
  if (pct < 0.7) return 2;   // Z2 fondamental
  if (pct < 0.8) return 3;   // Z3 tempo
  if (pct < 0.9) return 4;   // Z4 seuil
  return 5;                   // Z5 max
}
function zoneColor(z) {
  return ["#71717a", "#71717a", "#02d1ba", "#fbbf24", "#fb923c", "#ef4444"][z] || "#71717a";
}

// Génère le timing d'une phase d'interval (target en time ou distance).
function computeIntervalPhaseTiming(phaseInfo, schedule, startedAtMs, currentDistM) {
  if (!phaseInfo || phaseInfo.phase === "done") return phaseInfo;
  const seg = phaseInfo.phase === "work" ? schedule.work : schedule.rest;
  if (!seg) return phaseInfo;
  if (seg.kind === "time") {
    return {
      ...phaseInfo,
      endTimeMs: Date.now() + seg.value * 1000,
      durationS: seg.value,
    };
  }
  // distance-based
  return {
    ...phaseInfo,
    lapStartDistM: currentDistM,
    targetDistM: currentDistM + seg.value,
    distanceLeftM: seg.value,
  };
}

function announceIntervalPhase(phaseInfo, schedule) {
  if (!phaseInfo) return;
  const isFinal = phaseInfo.phase === "work" && phaseInfo.rep === schedule.repeats;
  const text = announceText(phaseInfo, phaseInfo.rep, schedule.repeats, isFinal);
  if (text) speakIntervalPhase(text);
}

export default function RunSession({ client, onClose, prescribedTarget = null }) {
  const target = useMemo(() => parseTarget(prescribedTarget), [prescribedTarget]);

  const [phase, setPhase] = useState("idle"); // idle | requesting | active | paused | stopping | done
  // eslint-disable-next-line no-unused-vars
  const [permLevel, setPermLevel] = useState(null);
  const [distance, setDistance] = useState(0); // meters
  const [duration, setDuration] = useState(0); // s (computed locally from startedAt)
  const [pace, setPace] = useState(0); // s/km
  const [cadence, setCadence] = useState(0); // spm
  const [gpsQuality, setGpsQuality] = useState(null); // strong | good | medium | weak
  const [strideM, setStrideM] = useState(null); // foulée moyenne mètres
  const [indoorMode, setIndoorModeState] = useState(false); // treadmill
  // HIIT : laps enregistrés à chaque fin de phase work (pour chart post-run)
  const [intervalLaps, setIntervalLaps] = useState([]); // [{rep, kind:"work"|"rest", durationS, distanceM, paceSPerKm}]
  const intervalLapStartRef = useRef({ atMs: 0, atDistM: 0 }); // début de la phase courante
  // Layout actif : ring (PACE1) ou map (PACE3). Persisté localStorage.
  const [runLayout, setRunLayout] = useState(() => {
    try { return localStorage.getItem("rb-run-layout") || "ring"; }
    catch { return "ring"; }
  });
  const toggleRunLayout = useCallback(() => {
    const next = runLayout === "ring" ? "map" : "ring";
    setRunLayout(next);
    haptic.medium();
    try { localStorage.setItem("rb-run-layout", next); } catch (_) {}
  }, [runLayout]);
  const [splits, setSplits] = useState([]); // [{km, time, pace}]
  const [autoPaused, setAutoPaused] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [audioCues, setAudioCues] = useState(true);
  const [route, setRoute] = useState([]); // [{lat, lng, t}]
  const [summary, setSummary] = useState(null);
  // showShare retiré (plus d'éditeur image).
  // Phase 4 :
  const [hrBpm, setHrBpm] = useState(0);          // dernière valeur HR live
  const [hrSamples, setHrSamples] = useState([]); // pour calcul avg/max
  const [weather, setWeather] = useState(null);   // {tempC, windKmh, ...}
  const [intervalPhase, setIntervalPhase] = useState(null); // {phase, rep, block, endTime?, targetDistM?, lapStartDist?}
  // finishPhoto retiré (plus de selfie finish).

  const startedAtRef = useRef(null);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef(null);
  const unsubsRef = useRef([]);
  const tickIntervalRef = useRef(null);
  // Refs miroir pour Live Activity (évite stale closures dans le setInterval)
  const distanceRef = useRef(0);
  const paceRef = useRef(0);
  const isPausedRef = useRef(false);
  const hrUnsubRef = useRef(null);
  const intervalPhaseRef = useRef(null);
  const intervalScheduleRef = useRef(null);
  const lastLapDistRef = useRef(0);
  const intervalAdvanceRef = useRef(null);
  const weatherRef = useRef(null);

  // Schedule HIIT (si target est HIIT exploitable)
  const intervalSchedule = useMemo(() => {
    if (!target.isHiit) return null;
    return buildSchedule(prescribedTarget || {});
  }, [target.isHiit, prescribedTarget]);

  // ── Permission ──
  const askPermission = useCallback(async () => {
    setPhase("requesting");
    const res = await requestPermission();
    setPermLevel(res.level);
    if (!res.granted) {
      toast.error("Permission GPS refusée. Active-la dans Réglages > RB Perform.");
      setPhase("idle");
      return false;
    }
    return true;
  }, []);

  // ── Start ──
  const start = useCallback(async () => {
    const ok = await askPermission();
    if (!ok) return;
    haptic.medium();
    const res = await startRun();
    startedAtRef.current = res?.startedAt ? res.startedAt * 1000 : Date.now();
    pausedTotalRef.current = 0;
    pausedAtRef.current = null;
    setDistance(0); setDuration(0); setPace(0); setCadence(0);
    setSplits([]); setRoute([]); setSummary(null); setAutoPaused(false);
    setPhase("active");

    // Live Activity (Dynamic Island + Lock Screen) — best effort
    runActivity.start({
      targetDistanceM: target.distanceM || 0,
      targetPaceSPerKm: target.paceSPerKm || 0,
      startedAtMs: startedAtRef.current,
    });

    // Phase 4.a : HR stream (Apple Watch). Best effort — pas critique si refusé
    (async () => {
      try {
        if (!isNative()) return;
        await requestHeartRatePermission();
        hrUnsubRef.current = await startHeartRateStream((bpm) => {
          setHrBpm(bpm);
          setHrSamples((prev) => prev.length < 5000 ? [...prev, bpm] : prev);
        });
      } catch (e) { /* silencieux */ }
    })();

    // Phase 4.b : Intervals scheduler (auto-démarre si target HIIT)
    if (intervalSchedule) {
      intervalScheduleRef.current = intervalSchedule;
      const first = nextIntervalPhase(null, intervalSchedule);
      const phaseInfo = computeIntervalPhaseTiming(first, intervalSchedule, startedAtRef.current, 0);
      intervalPhaseRef.current = phaseInfo;
      setIntervalPhase(phaseInfo);
      // Init du tracker de lap : début de la 1re phase = maintenant, dist = 0.
      intervalLapStartRef.current = { atMs: Date.now(), atDistM: 0 };
      announceIntervalPhase(first, intervalSchedule);
      haptic.success();
    }

    // Tick local pour le chrono (1 hz) + update Live Activity (toutes les 3s)
    // + tick scheduler intervals time-based
    distanceRef.current = 0; paceRef.current = 0; isPausedRef.current = false;
    let liveTick = 0;
    tickIntervalRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const now = Date.now();
      const dur = (now - startedAtRef.current - pausedTotalRef.current - (pausedAtRef.current ? now - pausedAtRef.current : 0)) / 1000;
      setDuration(Math.max(0, dur));
      liveTick = (liveTick + 1) % 3;
      if (liveTick === 0) {
        runActivity.update({
          distanceM: distanceRef.current,
          durationS: Math.max(0, dur),
          paceSPerKm: paceRef.current,
          isPaused: isPausedRef.current,
        });
      }
      // Time-based intervals : si la phase courante a un endTimeMs et qu'on l'a dépassé → avance
      const cur = intervalPhaseRef.current;
      if (cur && cur.endTimeMs && now >= cur.endTimeMs) {
        advanceIntervalPhase();
      }
    }, 1000);

    // Helper local : avance le scheduler interval à la phase suivante
    function advanceIntervalPhase() {
      const schedule = intervalScheduleRef.current;
      const prev = intervalPhaseRef.current;
      if (!schedule || !prev) return;
      // Enregistre le lap qui vient de se terminer (pour chart post-run).
      // Skip si pas de start tracking (premier passage) ou prev = done.
      const lapStart = intervalLapStartRef.current;
      if (prev.phase && prev.phase !== "done" && lapStart.atMs > 0) {
        const lapDurS = (Date.now() - lapStart.atMs) / 1000;
        const lapDistM = Math.max(0, distanceRef.current - lapStart.atDistM);
        const lapPace = lapDistM > 30 ? lapDurS / (lapDistM / 1000) : null;
        setIntervalLaps((prev2) => [...prev2, {
          rep: prev.rep,
          block: prev.block,
          kind: prev.phase, // "work" | "rest"
          durationS: lapDurS,
          distanceM: lapDistM,
          paceSPerKm: lapPace,
        }]);
      }
      const next = nextIntervalPhase(prev, schedule);
      if (!next || next.phase === "done") {
        intervalPhaseRef.current = { phase: "done" };
        setIntervalPhase({ phase: "done" });
        speakIntervalPhase(announceText({ phase: "done" }, prev.rep, schedule.repeats, false));
        haptic.success();
        return;
      }
      const phaseInfo = computeIntervalPhaseTiming(next, schedule, startedAtRef.current, distanceRef.current);
      intervalPhaseRef.current = phaseInfo;
      setIntervalPhase(phaseInfo);
      // Reset le tracker de lap pour la nouvelle phase.
      intervalLapStartRef.current = { atMs: Date.now(), atDistM: distanceRef.current };
      announceIntervalPhase(next, schedule);
      haptic.success();
    }
    // Expose pour onLocation distance-based advance
    intervalAdvanceRef.current = advanceIntervalPhase;

    // Listeners
    unsubsRef.current = [
      onLocation((d) => {
        const distM = d.distanceM || 0;
        setDistance(distM);
        distanceRef.current = distM;
        setRoute((prev) => [...prev, { lat: d.lat, lng: d.lng, t: d.t, alt: d.alt }]);
        // Pace live (lissé sur durée totale)
        const dur = (Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000;
        if (distM > 100 && dur > 5) {
          const p = dur / (distM / 1000);
          setPace(p);
          paceRef.current = p;
        }
        // Phase 4.c : Météo au premier GPS lock
        if (!weatherRef.current && d.lat && d.lng) {
          fetchCurrentWeather({ lat: d.lat, lng: d.lng })
            .then((w) => { if (w) { weatherRef.current = w; setWeather(w); } })
            .catch(() => {});
        }
        // Phase 4.d : Avance scheduler intervals si distance-based target atteint
        const cur = intervalPhaseRef.current;
        if (cur && cur.targetDistM && distM >= cur.targetDistM && intervalAdvanceRef.current) {
          intervalAdvanceRef.current();
        }
      }),
      onKm((d) => {
        haptic.success();
        setSplits((prev) => [...prev, { km: d.km, time: d.splitDurationS, pace: d.paceSPerKm }]);
        // Sur native, le plugin Swift parle déjà via AVSpeechSynthesizer
        // (qui survit au lock screen, contrairement au Web Speech). On évite
        // le double-TTS en ne parlant côté JS qu'en web.
        if (audioCues && !isNative()) speakKmAudio(d.km, d.paceSPerKm);
      }),
      onAutoPause(() => {
        setAutoPaused(true);
        toast.info("Auto-pause activée (immobile)");
        pausedAtRef.current = Date.now();
      }),
      onCadence((d) => {
        setCadence(d.stepsPerMinute || 0);
      }),
      onGpsQuality((d) => {
        setGpsQuality(d.quality || null);
      }),
      onAutomotiveDetected(() => {
        toast.info("Système détecte un déplacement motorisé — vérifie ton run");
      }),
    ];
  }, [askPermission, audioCues]);

  // ── Pause / Resume ──
  const togglePause = useCallback(async () => {
    if (phase === "active") {
      haptic.medium();
      pausedAtRef.current = Date.now();
      isPausedRef.current = true;
      await pauseRun();
      runActivity.update({
        distanceM: distanceRef.current,
        durationS: duration,
        paceSPerKm: paceRef.current,
        isPaused: true,
      });
      setPhase("paused");
    } else if (phase === "paused") {
      haptic.medium();
      if (pausedAtRef.current) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      isPausedRef.current = false;
      setAutoPaused(false);
      await resumeRun();
      runActivity.update({
        distanceM: distanceRef.current,
        durationS: duration,
        paceSPerKm: paceRef.current,
        isPaused: false,
      });
      setPhase("active");
    }
  }, [phase, duration]);

  // ── Stop + save Supabase + HealthKit + end Live Activity ──
  const stop = useCallback(async () => {
    haptic.heavy();
    setPhase("stopping");
    if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null; }
    unsubsRef.current.forEach((u) => u?.());
    unsubsRef.current = [];

    const s = await stopRun();
    setSummary(s);
    setPhase("done");

    // Stride length post-run — CMPedometer queryPedometerData. Métrique
    // affichée dans le summary à côté de cadence. Best-effort, silent fail.
    try {
      const stride = await getStrideLength();
      if (stride?.available && stride?.strideM) setStrideM(stride.strideM);
    } catch (_) {}

    // Live Activity : fermeture avec auto-dismiss 2s
    runActivity.end();

    // Phase 4 : ferme HR stream
    try { (await hrUnsubRef.current)?.(); } catch (_) {}
    hrUnsubRef.current = null;

    // Sauvegarde Supabase. Toast explicite quand on saute la save (course
    // trop courte ou pas de client) → user comprend pourquoi rien n'apparaît
    // dans l'historique. Seuil 30m (au lieu de 50m) car test sur place peut
    // donner 35-45m de drift GPS.
    if (!client?.id) {
      toast.error("Pas de compte client — course non sauvegardée");
    } else if (!s || s.distanceM <= 30) {
      toast.error(`Course trop courte (${Math.round(s?.distanceM || 0)}m) — pas sauvegardée`);
    } else if (client?.id && s && s.distanceM > 30) {
      try {
        const distanceKm = Number((s.distanceM / 1000).toFixed(2));
        const durationS = Math.round(s.durationS || 0);
        const paceMinPerKm = s.paceSPerKm ? (s.paceSPerKm / 60) : null;

        // Match schema run_logs : distance_km (number), duree_min (number),
        // allure_min_km (string "M:SS"). Le code Phase 1 envoyait à tort
        // distance/duration → silent fail PGRST204 sur tous les GPS runs.
        const allureStr = s.paceSPerKm && isFinite(s.paceSPerKm)
          ? `${Math.floor(s.paceSPerKm / 60)}:${String(Math.round(s.paceSPerKm % 60)).padStart(2, "0")}`
          : null;
        const payload = {
          client_id: client.id,
          date: todayLocal(),
          distance_km: distanceKm,
          duree_min: Math.round(durationS / 60),
          allure_min_km: allureStr,
          source: isNative() ? "gps_native" : "gps_web",
          started_at: s.startedAt ? new Date(s.startedAt * 1000).toISOString() : null,
          ended_at: s.endedAt ? new Date(s.endedAt * 1000).toISOString() : null,
          paused_duration_s: s.pausedDurationS || 0,
          route_coords: route,
          splits: splits,
        };

        // Tags programme si run prescrit
        if (prescribedTarget) {
          payload.programme_id = prescribedTarget.programmeId || null;
          payload.programme_week = prescribedTarget.programmeWeek || prescribedTarget.viewWeek || null;
          payload.programme_session = prescribedTarget.sessionIndex ?? null;
          payload.programme_run_index = prescribedTarget.runIndex ?? null;
          payload.target_label = prescribedTarget.name || null;
          payload.target_distance = prescribedTarget.distance || null;
          payload.target_duration = prescribedTarget.duration || null;
          payload.target_bpm = prescribedTarget.bpm || null;
          payload.programme_name = "Move";
        }

        // Phase 4 metrics — colonnes nullables ajoutées par migration 112.
        // Si migration pas encore appliquée, l'insert va échouer → retry sans
        // ces colonnes pour ne pas perdre la save de base.
        const phase4Cols = {};
        if (hrSamples.length > 0) {
          phase4Cols.bpm_avg = Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length);
          phase4Cols.bpm_max = Math.max(...hrSamples);
        }
        if (weatherRef.current) phase4Cols.weather = weatherRef.current;
        if (intervalSchedule) {
          const cur = intervalPhaseRef.current;
          phase4Cols.intervals_total = intervalSchedule.repeats * intervalSchedule.blocks;
          phase4Cols.intervals_completed = cur?.phase === "done"
            ? phase4Cols.intervals_total
            : Math.max(0, ((cur?.block || 1) - 1) * intervalSchedule.repeats + (cur?.rep || 1) - (cur?.phase === "work" ? 1 : 0));
        }

        const fullPayload = { ...payload, ...phase4Cols };
        let { error } = await supabase.from("run_logs").insert(fullPayload);
        if (error && Object.keys(phase4Cols).length > 0) {
          // Fallback : migration 112 pas appliquée, on insert sans Phase 4 metrics
          console.warn("[runSession] Phase 4 columns missing, fallback insert");
          ({ error } = await supabase.from("run_logs").insert(payload));
        }
        if (error) {
          console.error("[runSession] save failed:", error.message);
          toast.error("Sauvegarde échouée : " + error.message);
        } else {
          toast.success("Course enregistrée !");
        }
      } catch (e) {
        console.error("[runSession] save exception:", e);
        toast.error("Erreur sauvegarde");
      }
    }

    // Phase 3 : HealthKit workout save (natif iOS uniquement, best effort).
    // Même seuil 30m que la save Supabase.
    if (isNative() && s && s.distanceM > 30) {
      try {
        await requestWorkoutPermission();
        await saveRunWorkout({
          distanceM: s.distanceM,
          durationS: s.durationS,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          routeCoords: route,
        });
      } catch (e) {
        console.warn("[runSession] HealthKit save failed:", e?.message || e);
      }
    }
  }, [client?.id, route, splits, prescribedTarget]);

  // ── Cleanup unmount : kill tick + listeners + Live Activity dangling ──
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      unsubsRef.current.forEach((u) => u?.());
      runActivity.end();
    };
  }, []);

  // ── Comparaison verdict pour done screen ──
  const verdict = useMemo(() => {
    if (!summary || !target.hasTarget) return null;
    return compareToTarget(summary, target);
  }, [summary, target]);

  // Photo finish retirée — l'athlète veut juste copier les stats (Strava-style).

  // ── Pace delta vs cible (chip live) ──
  const paceDelta = useMemo(() => {
    if (!target.paceSPerKm || !pace) return null;
    const delta = Math.round(pace - target.paceSPerKm);
    let color;
    if (delta < -5) color = G;        // plus rapide que cible
    else if (delta > 15) color = RED;  // significativement plus lent
    else color = "#fbbf24";            // dans la zone (±15s)
    const sign = delta < 0 ? "−" : "+";
    return { delta, color, label: `${sign}${Math.abs(delta)}s vs cible` };
  }, [pace, target.paceSPerKm]);

  // ===== RENDER =====

  if (phase === "idle" || phase === "requesting") {
    return (
      <div style={S.wrap}>
        <div style={S.idleInner}>
          {target.hasTarget ? (
            <>
              <div style={S.briefingEyebrow}>Aujourd'hui</div>
              <div style={S.briefingTitle}>{target.name || "Run prescrit"}</div>
              <div style={S.briefingSub}>
                Cible coach. Démarre quand tu es prêt.
                {isNative() ? " GPS actif en arrière-plan." : ""}
              </div>
              <div style={S.targetCard}>
                {target.distanceM ? (
                  <TargetMetric label="Distance" value={`${(target.distanceM / 1000).toFixed(target.distanceM % 1000 ? 1 : 0)} km`} />
                ) : null}
                {target.durationS ? (
                  <TargetMetric label="Durée" value={formatDuration(target.durationS)} />
                ) : null}
                {target.paceSPerKm ? (
                  <TargetMetric label="Allure" value={`${formatPace(target.paceSPerKm)} /km`} accent />
                ) : null}
                {target.bpm ? (
                  <TargetMetric label="BPM" value={`${target.bpm}`} />
                ) : null}
                {target.isHiit ? (
                  <TargetMetric label="HIIT" value={target.hiitLabel} accent />
                ) : null}
              </div>
              {weather && (
                <div style={S.weatherChip}>
                  <span style={{ fontSize: 18 }}>{weather.emoji}</span>
                  <span style={{ fontWeight: 700 }}>{weather.tempC}°C</span>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>·</span>
                  <span>{weather.windKmh} km/h</span>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>·</span>
                  <span>{weather.humidityPct}%</span>
                </div>
              )}
              <button style={S.bigBtn(G)} onClick={start} disabled={phase === "requesting"}>
                {phase === "requesting" ? "Démarrage..." : "Démarrer"}
              </button>
              <button style={S.linkBtn} onClick={onClose}>Annuler</button>
            </>
          ) : (
            <>
              {/* Icône SVG runner (plus de 🏃‍♂️ emoji). Look minimaliste,
                  premium, cohérent avec le reste des icônes du run screen. */}
              <div style={{ marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="13" cy="4" r="2" />
                  <path d="M14.5 17.5L18 19.5 21 16" />
                  <path d="M8 22l2.5-3 2-4 1.5-3.5 4 1.5" />
                  <path d="M9 12l-2 1.5L4 11" />
                </svg>
              </div>
              <div style={S.idleTitle}>Course<span style={{ color: G }}>.</span></div>
              <div style={S.idleSub}>
                Distance, allure et splits trackés en temps réel.
                {isNative() ? " Marche en arrière-plan." : " (Mode web : reste sur cette page pendant la course.)"}
              </div>
              {/* Toggle Indoor (treadmill). En mode indoor, on bascule sur
                  CMPedometer + stride length plutôt que GPS, parce que
                  sur tapis le GPS reste à 0. Seulement natif. */}
              {isNative() && (
                <button
                  style={{
                    marginTop: 16, marginBottom: 8,
                    padding: "10px 16px",
                    borderRadius: 100,
                    border: indoorMode ? "1px solid rgba(2,209,186,0.5)" : "1px solid rgba(255,255,255,0.12)",
                    background: indoorMode ? "rgba(2,209,186,0.1)" : "rgba(255,255,255,0.04)",
                    color: indoorMode ? G : "rgba(255,255,255,0.7)",
                    fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                    display: "inline-flex", alignItems: "center", gap: 8,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    haptic.medium();
                    const next = !indoorMode;
                    setIndoorModeState(next);
                    try { await setIndoorMode(next); } catch (_) {}
                  }}
                >
                  <span style={{ fontSize: 14 }}>{indoorMode ? "✓" : "○"}</span>
                  Indoor (tapis)
                </button>
              )}
              <button style={S.bigBtn(G)} onClick={start} disabled={phase === "requesting"}>
                {phase === "requesting" ? "Démarrage..." : "Démarrer ma course"}
              </button>
              <button style={S.linkBtn} onClick={onClose}>Annuler</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === "done" && summary) {
    return (
      <div style={S.wrap}>
        {/* Done screen — scrollable depuis le haut, padding safe-area bas pour
            que les boutons Partager / Retour restent toujours atteignables
            sur petit écran (iPhone SE) même avec verdict + splits + photo. */}
        <div style={{
          ...S.idleInner,
          justifyContent: "flex-start",
          padding: "calc(env(safe-area-inset-top, 0px) + 28px) 22px calc(env(safe-area-inset-bottom, 0px) + 32px)",
        }}>
          <div style={{ fontSize: 11, color: G, letterSpacing: "3px", textTransform: "uppercase", fontWeight: 800, marginBottom: 14 }}>
            Course terminée
          </div>
          {/* HERO triple — Distance + Allure + Durée. Allure passe en grand
              (typo 56px) parce qu'avant en stat box 24px elle était noyée. */}
          <div style={S.bigStat}>{formatDistance(summary.distanceM)}</div>
          <div style={S.bigStatLabel}>Distance</div>
          <div style={{ width: "100%", maxWidth: 420, marginTop: 24, display: "flex", gap: 14, justifyContent: "center", alignItems: "flex-end" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1, color: G }}>
                {formatPace(summary.paceSPerKm)}
              </div>
              <div style={{ ...S.bigStatLabel, marginTop: 6 }}>Allure /km</div>
            </div>
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)", alignSelf: "center" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1, color: "#fff" }}>
                {formatDuration(summary.durationS)}
              </div>
              <div style={{ ...S.bigStatLabel, marginTop: 6 }}>Durée</div>
            </div>
          </div>
          {verdict && (
            <div style={{ ...S.verdictBox, borderColor: verdict.status === "ok" ? "rgba(2,209,186,0.3)" : verdict.status === "over" ? "rgba(2,209,186,0.3)" : "rgba(251,191,36,0.3)", background: verdict.status === "ok" || verdict.status === "over" ? "rgba(2,209,186,0.06)" : "rgba(251,191,36,0.06)" }}>
              <div style={{ ...S.verdictLabel, color: verdict.status === "ok" || verdict.status === "over" ? G : "#fbbf24" }}>
                {verdict.status === "ok" ? "✓ " : verdict.status === "over" ? "📈 " : "▾ "}
                {verdict.label}
              </div>
              <div style={S.verdictGrid}>
                {target.distanceM ? (
                  <VerdictRow
                    metric="Distance"
                    target={`${(target.distanceM / 1000).toFixed(target.distanceM % 1000 ? 1 : 0)} km`}
                    actual={formatDistance(summary.distanceM)}
                    delta={verdict.deltaM ? `${verdict.deltaM >= 0 ? "+" : "−"}${Math.abs(Math.round(verdict.deltaM))} m` : null}
                    deltaPositive={verdict.deltaM >= 0}
                  />
                ) : null}
                {target.durationS ? (
                  <VerdictRow
                    metric="Durée"
                    target={formatDuration(target.durationS)}
                    actual={formatDuration(summary.durationS)}
                    delta={verdict.deltaS ? `${verdict.deltaS >= 0 ? "+" : "−"}${formatDuration(Math.abs(Math.round(verdict.deltaS)))}` : null}
                    deltaPositive={verdict.deltaS <= 0}
                  />
                ) : null}
                {target.paceSPerKm ? (
                  <VerdictRow
                    metric="Allure"
                    target={`${formatPace(target.paceSPerKm)} /km`}
                    actual={`${formatPace(summary.paceSPerKm)} /km`}
                    delta={verdict.deltaPaceS ? `${verdict.deltaPaceS >= 0 ? "+" : "−"}${Math.abs(Math.round(verdict.deltaPaceS))}s /km` : null}
                    deltaPositive={verdict.deltaPaceS <= 0}
                  />
                ) : null}
              </div>
            </div>
          )}
          {splits.length > 0 && (
            <div style={{ width: "100%", maxWidth: 420, marginTop: 24 }}>
              <div style={S.sectionLabel}>Splits</div>
              {splits.map((s) => (
                <div key={s.km} style={S.splitRow}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Km {s.km}</div>
                  <div style={{ fontSize: 14, color: G, fontWeight: 700 }}>{formatPace(s.pace)} /km</div>
                </div>
              ))}
            </div>
          )}
          {/* Chart HIIT — barres allure par rep, meilleur rep highlighted. */}
          <HiitLapChart laps={intervalLaps} />
          {/* Métrique stride length (foulée). Indicateur pro de forme :
              ~1.20m amateur, 1.50m+ élite. Affichée seulement si CMPedometer
              a au moins 50 pas pour calculer. */}
          {strideM && (
            <div style={{
              width: "100%", maxWidth: 420, marginTop: 18,
              display: "flex", justifyContent: "space-between",
              padding: "12px 16px",
              background: "rgba(2,209,186,0.06)",
              border: "1px solid rgba(2,209,186,0.2)",
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase" }}>
                Foulée moyenne
              </div>
              <div style={{ fontSize: 14, color: G, fontWeight: 800 }}>
                {strideM.toFixed(2)} m
              </div>
            </div>
          )}
          {/* Copier stats format texte — pour Insta story où l'athlète colle
              juste les stats sur sa propre image (sans passer par l'éditeur
              Strava-style RunShareStory). 1 tap = clipboard ready. */}
          <button
            style={{
              ...S.photoFinishBtn,
              marginTop: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px dashed rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.85)",
            }}
            onClick={async () => {
              const km = (summary.distanceM / 1000).toFixed(2);
              const dur = formatDuration(summary.durationS);
              const pace = formatPace(summary.paceSPerKm);
              const txt = `🏃 ${km} km · ${dur} · ${pace}/km`;
              try {
                await navigator.clipboard.writeText(txt);
                haptic.success();
                toast.success("Stats copiées — colle sur ta story");
              } catch {
                // Fallback : prompt() pour iOS WKWebView sans HTTPS context
                try { window.prompt("Copie tes stats :", txt); } catch (_) {}
              }
            }}
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copier les stats (texte)
          </button>
          {/* Export GPX — uniquement sur native, dispo pour upload Strava /
              Garmin Connect. Écrit le fichier dans le cache app puis ouvre
              la sheet de partage native iOS. */}
          {isNative() && (
            <button
              style={{
                ...S.photoFinishBtn,
                marginTop: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.85)",
              }}
              onClick={async () => {
                try {
                  haptic.medium();
                  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
                  const result = await exportGPX({ name: `RB Perform ${ts}` });
                  const gpx = result?.gpx;
                  if (!gpx) { toast.error("Pas de trace GPS à exporter"); return; }
                  const fileName = `RBPerform-${ts}.gpx`;
                  const written = await Filesystem.writeFile({
                    path: fileName,
                    data: gpx,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8,
                  });
                  await Share.share({
                    title: "Course RB Perform",
                    text: "Trace GPX à importer dans Strava ou Garmin Connect",
                    url: written.uri,
                    dialogTitle: "Partager le GPX",
                  });
                  haptic.success();
                } catch (e) {
                  toast.error("Export GPX impossible");
                }
              }}
            >
              <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              Exporter en GPX (Strava / Garmin)
            </button>
          )}
          {/* Retour — Strava-style : copier stats + GPX + retour. Pas de
              partager d'image éditeur (trop friction, l'athlète veut juste
              copier ses stats et coller dans Insta). */}
          <button
            style={{ ...S.bigBtn("rgba(255,255,255,0.08)"), color: "#fff", marginTop: 14, padding: "16px 14px",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              border: "1px solid rgba(255,255,255,0.12)", width: "100%", maxWidth: 420 }}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Active or paused
  const targetProgress = target.distanceM ? Math.min(100, (distance / target.distanceM) * 100) : 0;
  return (
    <div style={S.wrap}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 24px", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        {/* GPS quality badge live — utile en course pour vérifier que le signal
            est fiable (tunnel, ville dense). Affiché que en native + actif. */}
        {gpsQuality && phase === "active" && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            padding: "4px 9px",
            borderRadius: 100,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 9,
            letterSpacing: 1.5,
            fontWeight: 800,
            textTransform: "uppercase",
            color: gpsQuality === "strong" ? "#02d1ba"
              : gpsQuality === "good" ? "rgba(2,209,186,0.85)"
              : gpsQuality === "medium" ? "#fbbf24" : "#ef4444",
            marginBottom: 10,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "currentColor",
              boxShadow: "0 0 6px currentColor",
            }} />
            GPS · {gpsQuality}
          </div>
        )}
        {autoPaused && (
          <div style={S.autoPauseBanner}>⏸ Auto-pause (tu sembles à l'arrêt)</div>
        )}
        {/* Intervals banner — phase courante HIIT */}
        {/* Le banner classique reste utile si done (résumé) — sinon le layout
            HIIT dédié rend la bannière redondante. */}
        {intervalPhase && intervalPhase.phase === "done" && intervalSchedule && (
          <IntervalsBanner phase={intervalPhase} schedule={intervalSchedule} distanceM={distance} />
        )}
        {/* Progress bar vs cible coach */}
        {target.distanceM ? (
          <div style={S.targetProgressWrap}>
            <div style={S.targetProgressLabel}>
              <span>Cible : {(target.distanceM / 1000).toFixed(target.distanceM % 1000 ? 1 : 0)} km</span>
              <span style={{ color: targetProgress >= 100 ? G : "rgba(255,255,255,0.5)" }}>
                {targetProgress >= 100 ? "✓ Atteint" : `${Math.round(targetProgress)}%`}
              </span>
            </div>
            <div style={S.targetProgressTrack}>
              <div style={{
                ...S.targetProgressFill,
                width: `${targetProgress}%`,
                background: targetProgress >= 100 ? G : "linear-gradient(90deg, #02d1ba, rgba(2,209,186,0.5))",
              }} />
            </div>
          </div>
        ) : null}
        {/* Switcher Ring ↔ Map — caché en mode HIIT (layout dédié auto). */}
        {!intervalSchedule && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <button
              onClick={toggleRunLayout}
              aria-label={`Layout ${runLayout === "ring" ? "Ring" : "Map"} — toucher pour basculer`}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 100,
                padding: "5px 10px",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: "rgba(255,255,255,0.65)",
                textTransform: "uppercase", cursor: "pointer",
              }}
            >
              {runLayout === "ring" ? (
                <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15M15 6v15"/></svg>
              )}
              {runLayout === "ring" ? "Ring" : "Map"}
            </button>
          </div>
        )}
        {intervalSchedule ? (
          <RunActiveHiit
            phaseInfo={intervalPhase}
            schedule={intervalSchedule}
            distance={distance}
            duration={duration}
            pace={pace}
            now={now}
            targetPaceSPerKm={target.paceSPerKm}
            onSkipPhase={() => { haptic.medium(); intervalAdvanceRef.current?.(); }}
          />
        ) : runLayout === "ring" ? (
          <RunActiveRing
            distance={distance}
            duration={duration}
            pace={pace}
            paceDelta={paceDelta}
            targetDistanceM={target.distanceM}
            phase={phase}
          />
        ) : (
          <RunActiveMap
            distance={distance}
            duration={duration}
            pace={pace}
            route={route}
            phase={phase}
          />
        )}
        {/* Cadence + HR + Splits — disponibles en layout Ring (Map montre déjà
            la trace, on garde le bas plus aéré). */}
        {runLayout === "ring" && (
          <>
            {cadence > 0 && (
              <div style={{ ...S.statsRow, marginTop: 12 }}>
                <Stat label="Cadence" value={`${cadence} pas/min`} />
              </div>
            )}
            {hrBpm > 0 && (
              <div style={{ ...S.statsRow, marginTop: 12 }}>
                <HrStat bpm={hrBpm} />
              </div>
            )}
            {splits.length > 0 && (
              <div style={{ marginTop: 20, flex: 1 }}>
                <div style={S.sectionLabel}>Splits</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {splits.slice().reverse().map((s) => (
                    <div key={s.km} style={S.splitRow}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Km {s.km}</div>
                      <div style={{ fontSize: 13, color: G, fontWeight: 700 }}>{formatPace(s.pace)} /km</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!splits.length && <div style={{ flex: 1 }} />}
          </>
        )}
        {runLayout === "map" && <div style={{ flex: 1 }} />}
        <RunControls phase={phase} onTogglePause={togglePause} onStop={stop} />
        </div>
    </div>
  );
}

// ── Controls premium : Pause circulaire neutre, Stop long-press 1.5s ──
// Le bouton Stop demande un appui maintenu (ring progress qui se remplit),
// pour empêcher l'arrêt accidentel pendant une course. Pause reste un tap.
function RunControls({ phase, onTogglePause, onStop }) {
  const HOLD_MS = 1500;
  const [holdPct, setHoldPct] = useState(0);
  const holdStartRef = useRef(0);
  const rafRef = useRef(null);
  const firedRef = useRef(false);

  const cancelHold = useCallback(() => {
    holdStartRef.current = 0;
    firedRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setHoldPct(0);
  }, []);

  const startHold = useCallback(() => {
    if (holdStartRef.current) return;
    holdStartRef.current = Date.now();
    firedRef.current = false;
    haptic.medium();
    const tick = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldPct(pct);
      if (pct >= 100 && !firedRef.current) {
        firedRef.current = true;
        haptic.heavy();
        cancelHold();
        onStop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onStop, cancelHold]);

  // Geometry du SVG ring overlay
  const SZ = 64;
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: 28, marginTop: 14,
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
    }}>
      {/* PAUSE : tap simple, bouton rond neutre */}
      <button
        onClick={onTogglePause}
        aria-label={phase === "paused" ? "Reprendre la course" : "Mettre en pause"}
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background: phase === "paused" ? G : "rgba(255,255,255,0.06)",
          border: "1px solid " + (phase === "paused" ? G : "rgba(255,255,255,0.12)"),
          color: phase === "paused" ? "#050505" : "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: phase === "paused" ? "0 6px 20px rgba(2,209,186,0.35)" : "none",
        }}
      >
        {phase === "paused" ? (
          <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden="true">
            <polygon points="7,4 20,12 7,20" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1.5" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" />
          </svg>
        )}
      </button>
      {/* STOP : long-press 1.5s avec ring de progression */}
      <div style={{ position: "relative", width: SZ, height: SZ }}>
        <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)", pointerEvents: "none" }}>
          <circle cx={SZ/2} cy={SZ/2} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
          <circle
            cx={SZ/2} cy={SZ/2} r={R} fill="none"
            stroke="#ef4444" strokeWidth={3} strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            strokeDashoffset={C * (1 - holdPct / 100)}
            style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.7))", transition: "stroke-dashoffset 60ms linear" }}
          />
        </svg>
        <button
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          aria-label="Arrêter la course (maintenir 1,5 seconde)"
          style={{
            position: "absolute", inset: 6,
            width: SZ - 12, height: SZ - 12, borderRadius: "50%",
            background: "#ef4444", border: "none", color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", touchAction: "none", userSelect: "none",
            transform: holdPct > 0 ? "scale(0.95)" : "scale(1)",
            transition: "transform 0.15s ease",
            boxShadow: "0 6px 20px rgba(239,68,68,0.35)",
          }}
        >
          <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
        {/* Hint mini sous le bouton — la 1re fois seulement, on garde toujours
            par sécurité info pour l'athlète qui découvre le geste. */}
        <div style={{
          position: "absolute", top: SZ + 6, left: "50%", transform: "translateX(-50%)",
          fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, fontWeight: 700,
          whiteSpace: "nowrap", textTransform: "uppercase",
        }}>
          Maintiens
        </div>
      </div>
    </div>
  );
}

// ── Layout HIIT dédié : chrono phase XL + rep counter + skip ──
// Auto-activé dès que intervalSchedule existe. En sprint à 400m on regarde
// pas une carte — on regarde le chrono qui descend et la rep en cours.
function RunActiveHiit({ phaseInfo, schedule, distance, duration, pace, now, targetPaceSPerKm, onSkipPhase }) {
  // Calcule le temps restant (time-based) ou la distance restante (distance-based)
  const isWork = phaseInfo?.phase === "work";
  const isRest = phaseInfo?.phase === "rest";
  const isDone = phaseInfo?.phase === "done";
  const phaseColor = isWork ? "#02d1ba" : isRest ? "#fbbf24" : "rgba(255,255,255,0.5)";
  const phaseLabel = isWork ? "TEMPO" : isRest ? "RÉCUP" : "TERMINÉ";

  // Compteur : si endTimeMs → temps restant, si targetDistM → mètres restants
  let countdownLabel = "—";
  let countdownPct = 0;
  if (phaseInfo?.endTimeMs) {
    const remainingMs = Math.max(0, phaseInfo.endTimeMs - now);
    const elapsedMs = (phaseInfo.durationMs || 1) - remainingMs;
    countdownPct = Math.min(100, (elapsedMs / (phaseInfo.durationMs || 1)) * 100);
    countdownLabel = formatDuration(Math.round(remainingMs / 1000));
  } else if (phaseInfo?.targetDistM && phaseInfo?.lapStartDistM != null) {
    const remainingM = Math.max(0, phaseInfo.targetDistM - (distance - phaseInfo.lapStartDistM));
    const elapsedM = phaseInfo.targetDistM - remainingM;
    countdownPct = Math.min(100, (elapsedM / phaseInfo.targetDistM) * 100);
    countdownLabel = remainingM >= 100 ? `${Math.round(remainingM)} m` : `${Math.round(remainingM)} m`;
  }

  // Verdict allure live vs cible (uniquement en phase work avec target défini)
  let paceVerdict = null;
  if (isWork && targetPaceSPerKm && pace > 0) {
    const delta = pace - targetPaceSPerKm; // < 0 = plus rapide
    if (Math.abs(delta) < 8) paceVerdict = { label: "Dans le rythme", color: "#02d1ba" };
    else if (delta > 0) paceVerdict = { label: `▾ ${Math.abs(Math.round(delta))}s/km lent`, color: "#fbbf24" };
    else paceVerdict = { label: `▴ ${Math.abs(Math.round(delta))}s/km vite`, color: "#02d1ba" };
  }

  const repsTotal = schedule?.repeats || 1;
  const blocksTotal = schedule?.blocks || 1;
  const rep = phaseInfo?.rep ?? 1;
  const block = phaseInfo?.block ?? 1;

  return (
    <>
      {/* Phase label + bloc */}
      <div style={{ textAlign: "center", marginTop: 6 }}>
        <div style={{ fontSize: 11, color: phaseColor, letterSpacing: 4, fontWeight: 800, textTransform: "uppercase",
          textShadow: `0 0 12px ${phaseColor}66` }}>
          {phaseLabel}{blocksTotal > 1 ? ` · Bloc ${block}/${blocksTotal}` : ""}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 2.5, fontWeight: 700, marginTop: 4 }}>
          Rep {rep} / {repsTotal}
        </div>
      </div>
      {/* Countdown XL avec ring */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 18, marginBottom: 8 }}>
        <svg width={260} height={260} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle cx={130} cy={130} r={118} stroke="rgba(255,255,255,0.06)" strokeWidth={9} fill="none" />
          <circle cx={130} cy={130} r={118}
            stroke={phaseColor} strokeWidth={9} fill="none" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 118}`}
            strokeDashoffset={`${2 * Math.PI * 118 * (1 - countdownPct / 100)}`}
            style={{ filter: `drop-shadow(0 0 12px ${phaseColor}88)`, transition: "stroke-dashoffset 0.5s ease" }} />
        </svg>
        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: "-4px", lineHeight: 0.95, fontVariantNumeric: "tabular-nums", color: isDone ? "#fff" : phaseColor }}>
            {countdownLabel}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 3, fontWeight: 800, marginTop: 8, textTransform: "uppercase" }}>
            Restant
          </div>
        </div>
      </div>
      {/* Allure live + verdict */}
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "baseline",
        padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums", color: "#02d1ba" }}>
            {formatPace(pace)}<span style={{ fontSize: 13, color: "rgba(2,209,186,0.5)", fontWeight: 700 }}> /km</span>
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: 800, marginTop: 4 }}>ALLURE</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
            {formatDistance(distance)}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: 800, marginTop: 4 }}>DISTANCE</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
            {formatDuration(duration)}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: 800, marginTop: 4 }}>DURÉE</div>
        </div>
      </div>
      {paceVerdict && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 100, background: paceVerdict.color + "22", color: paceVerdict.color, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {paceVerdict.label}
          </span>
        </div>
      )}
      {/* Skip phase button (utile si l'athlète a fini avant que le timer atteigne 0) */}
      {!isDone && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={onSkipPhase} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)", borderRadius: 100, padding: "8px 18px",
            fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
          }}>
            Phase suivante →
          </button>
        </div>
      )}
    </>
  );
}

// ── Lap chart post-run pour HIIT : barres allure par rep ──
function HiitLapChart({ laps }) {
  if (!laps || laps.length === 0) return null;
  const workLaps = laps.filter(l => l.kind === "work" && l.paceSPerKm && l.paceSPerKm > 0);
  if (workLaps.length === 0) return null;
  const minPace = Math.min(...workLaps.map(l => l.paceSPerKm));
  const maxPace = Math.max(...workLaps.map(l => l.paceSPerKm));
  const range = maxPace - minPace || 1;
  // bestRep — laisse la possibilité d'enrichir post-run si on veut.
  // const bestRep = workLaps.find(l => l.paceSPerKm === minPace);
  return (
    <div style={{ width: "100%", maxWidth: 420, marginTop: 18, padding: "14px 16px",
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: 2.5, fontWeight: 800, textTransform: "uppercase" }}>
          Splits par rep
        </div>
        <div style={{ fontSize: 10, color: "#02d1ba", letterSpacing: 1, fontWeight: 700 }}>
          Meilleur · {formatPace(minPace)}/km
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {workLaps.map((l, i) => {
          const isBest = l.paceSPerKm === minPace;
          const widthPct = 25 + ((maxPace - l.paceSPerKm) / range) * 70; // best = 95%, worst = 25%
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", width: 32, letterSpacing: 1 }}>
                R{i + 1}
              </div>
              <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${widthPct}%`,
                  background: isBest ? "#02d1ba" : "rgba(2,209,186,0.55)",
                  boxShadow: isBest ? "0 0 6px rgba(2,209,186,0.5)" : "none",
                  transition: "width 0.3s ease" }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                color: isBest ? "#02d1ba" : "#fff", width: 64, textAlign: "right" }}>
                {formatPace(l.paceSPerKm)}/km
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Layout PACE1 : anneau de progression distance + bloc allure hero ──
function RunActiveRing({ distance, duration, pace, paceDelta, targetDistanceM, phase }) {
  // Si target défini → progression vs cible. Sinon → progression vers le
  // prochain km (ex 2.42 km → 42% du chemin vers 3 km). Donne toujours du
  // sens à l'anneau, jamais figé à 0%.
  const km = distance / 1000;
  const targetKm = targetDistanceM ? targetDistanceM / 1000 : Math.max(1, Math.ceil(km));
  const progressPct = Math.min(100, Math.max(0, (km / targetKm) * 100));
  const radius = 132;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPct / 100);
  const SZ = 290;
  return (
    <>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 6 }}>
        <svg width={SZ} height={SZ} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle cx={SZ/2} cy={SZ/2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={10} fill="none" />
          <circle
            cx={SZ/2} cy={SZ/2} r={radius}
            stroke="#02d1ba" strokeWidth={10} fill="none" strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            style={{ filter: "drop-shadow(0 0 10px rgba(2,209,186,0.5))", transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-3.5px", lineHeight: 0.95, fontVariantNumeric: "tabular-nums" }}>
            {formatDistance(distance)}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 3, fontWeight: 800, marginTop: 8, textTransform: "uppercase" }}>
            {targetDistanceM ? `${Math.round(progressPct)}% · ${targetKm.toFixed(targetKm % 1 ? 1 : 0)} km` : (phase === "paused" ? "EN PAUSE" : "Distance")}
          </div>
        </div>
      </div>
      {/* Allure hero — bordures fines, cyan accent */}
      <div style={{
        textAlign: "center",
        margin: "14px 0 4px",
        padding: "16px 0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          fontSize: 64, fontWeight: 900, letterSpacing: "-3px", lineHeight: 0.9,
          color: "#02d1ba", fontVariantNumeric: "tabular-nums",
          textShadow: "0 0 14px rgba(2,209,186,0.3)",
        }}>
          {formatPace(pace)}<span style={{ fontSize: 22, fontWeight: 700, color: "rgba(2,209,186,0.5)" }}> /km</span>
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 3.5, fontWeight: 800, marginTop: 2, textTransform: "uppercase" }}>
          Allure
        </div>
        {paceDelta && (
          <div style={{
            marginTop: 6, display: "inline-block",
            padding: "3px 8px",
            background: paceDelta.color + "22", color: paceDelta.color,
            borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
          }}>{paceDelta.label}</div>
        )}
      </div>
      <div style={{ textAlign: "center", padding: "10px 0 4px", fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
        Durée <b style={{ color: "#fff", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatDuration(duration)}</b>
      </div>
    </>
  );
}

// ── Layout PACE3 : carte slim avec trace GPS + dual hero distance/allure ──
function RunActiveMap({ distance, duration, pace, route, phase }) {
  // Calcule la trace SVG depuis les points GPS collectés. Bbox normalisé.
  const traceData = useMemo(() => {
    if (!route || route.length < 2) return null;
    const lats = route.map(p => p.lat);
    const lngs = route.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const W = 393, H = 230;
    const pad = 22;
    const w = W - 2 * pad, h = H - 2 * pad;
    const dLat = (maxLat - minLat) || 1e-9;
    const dLng = (maxLng - minLng) || 1e-9;
    const pts = route.map(p => {
      const x = pad + ((p.lng - minLng) / dLng) * w;
      const y = pad + (1 - (p.lat - minLat) / dLat) * h;
      return [x, y];
    });
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    const last = pts[pts.length - 1];
    const first = pts[0];
    return { d, last, first, W, H };
  }, [route]);
  return (
    <>
      {/* Carte slim — trace cyan glow sur grille subtile */}
      <div style={{
        position: "relative", height: 230, marginTop: 4, marginBottom: 14,
        borderRadius: 18, overflow: "hidden",
        background: "linear-gradient(180deg, #0a1218 0%, #050a0c 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(2,209,186,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(2,209,186,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 55% 50%, rgba(2,209,186,0.15), transparent 60%)",
        }} />
        {traceData ? (
          <svg viewBox={`0 0 ${traceData.W} ${traceData.H}`} preserveAspectRatio="xMidYMid meet"
               style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <path d={traceData.d} fill="none" stroke="#02d1ba" strokeWidth={4}
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 0 12px rgba(2,209,186,0.7))" }} />
            <circle cx={traceData.first[0]} cy={traceData.first[1]} r={6} fill="#fff" />
            <circle cx={traceData.last[0]} cy={traceData.last[1]} r={7} fill="#02d1ba" stroke="#fff" strokeWidth={2.5} />
          </svg>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>
            Acquisition GPS…
          </div>
        )}
      </div>
      {/* Dual hero : Distance + Allure même poids */}
      <div style={{ textAlign: "center", padding: "6px 0" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 3.5, fontWeight: 800, textTransform: "uppercase" }}>
          {phase === "paused" ? "En pause · distance" : "— Distance"}
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: "-4.5px", lineHeight: 0.9, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
          {formatDistance(distance)}
        </div>
      </div>
      <div style={{ width: 50, height: 1, background: "rgba(255,255,255,0.1)", margin: "10px auto" }} />
      <div style={{ textAlign: "center", padding: "6px 0" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 3.5, fontWeight: 800, textTransform: "uppercase" }}>
          — Allure
        </div>
        <div style={{
          fontSize: 76, fontWeight: 900, letterSpacing: "-4.5px", lineHeight: 0.9,
          color: "#02d1ba", fontVariantNumeric: "tabular-nums",
          textShadow: "0 0 18px rgba(2,209,186,0.3)",
          marginTop: 4,
        }}>
          {formatPace(pace)}<span style={{ fontSize: 22, fontWeight: 700, color: "rgba(2,209,186,0.5)" }}> /km</span>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
        Durée <b style={{ color: "#fff", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatDuration(duration)}</b>
      </div>
    </>
  );
}

function Stat({ label, value, delta }) {
  return (
    <div style={S.statBox}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
      {delta && (
        <div style={{
          marginTop: 6,
          display: "inline-block",
          padding: "3px 8px",
          background: delta.color + "22",
          color: delta.color,
          borderRadius: 999,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}>
          {delta.label}
        </div>
      )}
    </div>
  );
}

function TargetMetric({ label, value, accent }) {
  return (
    <div style={S.targetMetricBox}>
      <div style={S.targetMetricLabel}>{label}</div>
      <div style={{ ...S.targetMetricValue, color: accent ? G : "#fff" }}>{value}</div>
    </div>
  );
}

// Banner overlay during HIIT intervals (phase: work | rest)
function IntervalsBanner({ phase, schedule, distanceM }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!phase?.endTimeMs) return;
    const id = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(id);
  }, [phase?.endTimeMs]);
  if (!phase || phase.phase === "done") return null;
  const isWork = phase.phase === "work";
  const accent = isWork ? "#ef4444" : G;
  let remainingTxt = "";
  if (phase.endTimeMs) {
    const ms = Math.max(0, phase.endTimeMs - now);
    remainingTxt = formatDuration(Math.ceil(ms / 1000));
  } else if (phase.targetDistM) {
    const left = Math.max(0, phase.targetDistM - distanceM);
    remainingTxt = `${Math.round(left)} m`;
  }
  const total = schedule.repeats * schedule.blocks;
  const currentNum = (phase.block - 1) * schedule.repeats + phase.rep;
  return (
    <div style={{ ...S.intervalsBanner, borderColor: accent + "55", background: accent + "11" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 2, textTransform: "uppercase" }}>
            {isWork ? "Pousse" : "Récup"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", marginTop: 2 }}>
            Round {currentNum}/{total}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: accent, letterSpacing: "-1px", lineHeight: 1, fontFamily: "monospace" }}>
            {remainingTxt}
          </div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginTop: 4 }}>
            Restant
          </div>
        </div>
      </div>
    </div>
  );
}

// HR stat avec zone Karvonen
function HrStat({ bpm }) {
  const zone = computeHrZone(bpm);
  const color = zoneColor(zone);
  return (
    <div style={{ ...S.statBox, gridColumn: "span 2" }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", color }}>{bpm}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>bpm</div>
        <div style={{
          padding: "2px 8px",
          background: color + "22", color,
          borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase",
        }}>
          Zone {zone}
        </div>
      </div>
      <div style={S.statLabel}>Cardio</div>
    </div>
  );
}

function VerdictRow({ metric, target, actual, delta, deltaPositive }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr auto", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{metric}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
        <span style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", display: "block", color: "rgba(255,255,255,0.35)" }}>Cible</span>
        {target}
      </div>
      <div style={{ fontSize: 12, fontWeight: 800 }}>
        <span style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", display: "block", color: "rgba(255,255,255,0.35)", fontWeight: 700 }}>Réalisé</span>
        {actual}
      </div>
      {delta && (
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 0.3,
          padding: "3px 7px",
          background: deltaPositive ? "rgba(2,209,186,0.18)" : "rgba(251,191,36,0.15)",
          color: deltaPositive ? G : "#fbbf24",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}>
          {delta}
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const S = {
  wrap: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "#050505", color: "#fff",
    fontFamily: "-apple-system, Inter, sans-serif",
    overflow: "auto",
  },
  idleInner: {
    minHeight: "100dvh",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "60px 28px 40px", textAlign: "center", gap: 14,
  },
  iconBig: { fontSize: 64, marginBottom: 8 },
  idleTitle: { fontSize: 44, fontWeight: 900, letterSpacing: "-2px", marginBottom: 4 },
  idleSub: { fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, maxWidth: 320, marginBottom: 26 },
  bigBtn: (color) => ({
    padding: "16px 32px", borderRadius: 100,
    background: color, color: color === G ? "#050505" : "#fff",
    border: "none", fontSize: 14, fontWeight: 900, letterSpacing: "1.5px", textTransform: "uppercase",
    cursor: "pointer", fontFamily: "inherit", minWidth: 240,
  }),
  linkBtn: {
    marginTop: 16, padding: "10px 18px", background: "transparent",
    border: "none", color: "rgba(255,255,255,0.45)", fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
  },
  bigStat: {
    fontSize: 72, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1, marginBottom: 6,
  },
  bigStatLabel: {
    fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700,
  },
  statsRow: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
  },
  statBox: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: "14px 16px", textAlign: "center",
  },
  statValue: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" },
  statLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginTop: 3 },
  sectionLabel: {
    fontSize: 10, color: "rgba(2,209,186,0.55)", letterSpacing: "2px", textTransform: "uppercase",
    fontWeight: 800, marginBottom: 10,
  },
  splitRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 14px", background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10,
  },
  controlBtn: (color, primary) => ({
    flex: 1, padding: "16px 12px", borderRadius: 100,
    background: primary ? color : "rgba(255,255,255,0.05)",
    color: primary ? "#fff" : color,
    border: primary ? "none" : `1px solid ${color}`,
    fontSize: 14, fontWeight: 800, letterSpacing: "1px",
    cursor: "pointer", fontFamily: "inherit",
  }),
  autoPauseBanner: {
    padding: "10px 14px", background: "rgba(255,193,7,0.1)",
    border: "1px solid rgba(255,193,7,0.3)", borderRadius: 100,
    fontSize: 12, fontWeight: 700, color: "#fbbf24", textAlign: "center",
    marginTop: 8,
  },
  // ─── Briefing screen (Phase 2) ───
  briefingEyebrow: {
    fontSize: 11, color: G, letterSpacing: "3px", textTransform: "uppercase",
    fontWeight: 800, marginBottom: 10,
  },
  briefingTitle: {
    fontSize: 34, fontWeight: 900, letterSpacing: "-1.2px", lineHeight: 1.05,
    textAlign: "center", marginBottom: 8, maxWidth: 360,
  },
  briefingSub: {
    fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55,
    maxWidth: 320, marginBottom: 22, textAlign: "center",
  },
  targetCard: {
    width: "100%", maxWidth: 360,
    background: "rgba(2,209,186,0.04)",
    border: "1px solid rgba(2,209,186,0.18)",
    borderRadius: 18, padding: 16,
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
    marginBottom: 28,
  },
  targetMetricBox: {
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 12,
  },
  targetMetricLabel: {
    fontSize: 9, color: "rgba(255,255,255,0.45)",
    letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700,
    marginBottom: 4,
  },
  targetMetricValue: {
    fontSize: 18, fontWeight: 900, letterSpacing: "-0.4px",
  },
  // ─── Progress bar vs target (Phase 2 live) ───
  targetProgressWrap: {
    marginTop: 4, marginBottom: 8,
  },
  targetProgressLabel: {
    display: "flex", justifyContent: "space-between",
    fontSize: 10, color: "rgba(255,255,255,0.55)",
    letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700,
    marginBottom: 6,
  },
  targetProgressTrack: {
    height: 4, borderRadius: 999, overflow: "hidden",
    background: "rgba(255,255,255,0.06)",
  },
  targetProgressFill: {
    height: "100%", borderRadius: 999,
    transition: "width 0.4s cubic-bezier(.4,1.6,.5,1)",
  },
  // ─── Verdict block (done screen, Phase 2) ───
  verdictBox: {
    width: "100%", maxWidth: 420,
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14, padding: "14px 16px",
    marginTop: 18,
  },
  verdictLabel: {
    fontSize: 11, letterSpacing: "1.8px", textTransform: "uppercase",
    fontWeight: 800, marginBottom: 8,
  },
  verdictGrid: { display: "flex", flexDirection: "column" },
  // ─── Phase 4 ───
  weatherChip: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "8px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 100,
    fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
    marginTop: -8, marginBottom: 22,
  },
  intervalsBanner: {
    marginTop: 4, marginBottom: 12,
    padding: "12px 16px",
    background: "rgba(2,209,186,0.06)",
    border: "1px solid rgba(2,209,186,0.25)",
    borderRadius: 14,
  },
  photoFinishBtn: {
    width: "100%", maxWidth: 420,
    marginTop: 18,
    padding: "14px 20px",
    background: "rgba(2,209,186,0.06)",
    color: "rgba(2,209,186,0.95)",
    border: "1px dashed rgba(2,209,186,0.35)",
    borderRadius: 14,
    fontSize: 13, fontWeight: 800, letterSpacing: 0.4,
    cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
  },
};
