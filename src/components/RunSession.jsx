// src/components/RunSession.jsx
//
// Tracker de course LIVE — Phase 1 MVP.
//
// UI plein écran : distance + chrono + pace + cadence en gros, splits par km
// en dessous, contrôles Start/Pause/Resume/Stop. Audio cues à chaque km
// (Web Speech, marche sur iOS WKWebView).
//
// Pipeline data :
//   1. requestPermission() pour GPS (Always en natif, when_in_use sur web)
//   2. startRun() → événements locationUpdate + kmReached arrivent en push
//   3. On affiche les stats live, on accumule les splits
//   4. stopRun() → on récupère le summary, on save Supabase run_logs
//
// Le composant gère son state interne. Le parent fournit `client` + `onClose`.

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  requestPermission, startRun, pauseRun, resumeRun, stopRun,
  onLocation, onKm, onAutoPause, onCadence,
  formatPace, formatDuration, formatDistance,
} from "../lib/runTracker";
import { supabase } from "../lib/supabase";
import { toast } from "./Toast";
import { isNative } from "../lib/native";
import haptic from "../lib/haptic";
import RunShareStory from "./RunShareStory";

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

export default function RunSession({ client, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | requesting | active | paused | stopping | done
  const [permLevel, setPermLevel] = useState(null);
  const [distance, setDistance] = useState(0); // meters
  const [duration, setDuration] = useState(0); // s (computed locally from startedAt)
  const [pace, setPace] = useState(0); // s/km
  const [cadence, setCadence] = useState(0); // spm
  const [splits, setSplits] = useState([]); // [{km, time, pace}]
  const [autoPaused, setAutoPaused] = useState(false);
  const [audioCues, setAudioCues] = useState(true);
  const [route, setRoute] = useState([]); // [{lat, lng, t}]
  const [summary, setSummary] = useState(null);
  const [showShare, setShowShare] = useState(false);

  const startedAtRef = useRef(null);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef(null);
  const unsubsRef = useRef([]);
  const tickIntervalRef = useRef(null);

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

    // Tick local pour le chrono (1 hz)
    tickIntervalRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const now = Date.now();
      const dur = (now - startedAtRef.current - pausedTotalRef.current - (pausedAtRef.current ? now - pausedAtRef.current : 0)) / 1000;
      setDuration(Math.max(0, dur));
    }, 1000);

    // Listeners
    unsubsRef.current = [
      onLocation((d) => {
        setDistance(d.distanceM || 0);
        setRoute((prev) => [...prev, { lat: d.lat, lng: d.lng, t: d.t, alt: d.alt }]);
        // Pace live (lissé sur durée totale)
        const dur = (Date.now() - startedAtRef.current - pausedTotalRef.current) / 1000;
        if (d.distanceM > 100 && dur > 5) {
          setPace(dur / (d.distanceM / 1000));
        }
      }),
      onKm((d) => {
        haptic.success();
        setSplits((prev) => [...prev, { km: d.km, time: d.splitDurationS, pace: d.paceSPerKm }]);
        if (audioCues) speakKmAudio(d.km, d.paceSPerKm);
      }),
      onAutoPause(() => {
        setAutoPaused(true);
        toast.info("Auto-pause activée (immobile)");
        pausedAtRef.current = Date.now();
      }),
      onCadence((d) => {
        setCadence(d.stepsPerMinute || 0);
      }),
    ];
  }, [askPermission, audioCues]);

  // ── Pause / Resume ──
  const togglePause = useCallback(async () => {
    if (phase === "active") {
      haptic.medium();
      pausedAtRef.current = Date.now();
      await pauseRun();
      setPhase("paused");
    } else if (phase === "paused") {
      haptic.medium();
      if (pausedAtRef.current) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      setAutoPaused(false);
      await resumeRun();
      setPhase("active");
    }
  }, [phase]);

  // ── Stop + save Supabase ──
  const stop = useCallback(async () => {
    haptic.heavy();
    setPhase("stopping");
    if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null; }
    unsubsRef.current.forEach((u) => u?.());
    unsubsRef.current = [];

    const s = await stopRun();
    setSummary(s);
    setPhase("done");

    // Sauvegarde Supabase
    if (client?.id && s && s.distanceM > 50) {
      try {
        const distanceKm = Number((s.distanceM / 1000).toFixed(2));
        const durationS = Math.round(s.durationS || 0);
        const paceMinPerKm = s.paceSPerKm ? (s.paceSPerKm / 60) : null;

        const payload = {
          client_id: client.id,
          date: new Date().toISOString().slice(0, 10),
          distance: distanceKm,
          duration: durationS,
          allure_min_km: paceMinPerKm ? Number(paceMinPerKm.toFixed(2)) : null,
          bpm: null,
          source: isNative() ? "gps_native" : "gps_web",
          started_at: s.startedAt ? new Date(s.startedAt * 1000).toISOString() : null,
          ended_at: s.endedAt ? new Date(s.endedAt * 1000).toISOString() : null,
          paused_duration_s: s.pausedDurationS || 0,
          route_coords: route,
          splits: splits,
        };
        const { error } = await supabase.from("run_logs").insert(payload);
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
  }, [client?.id, route, splits]);

  // ── Cleanup unmount ──
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      unsubsRef.current.forEach((u) => u?.());
    };
  }, []);

  // ===== RENDER =====

  if (phase === "idle" || phase === "requesting") {
    return (
      <div style={S.wrap}>
        <div style={S.idleInner}>
          <div style={S.iconBig}>🏃‍♂️</div>
          <div style={S.idleTitle}>Course<span style={{ color: G }}>.</span></div>
          <div style={S.idleSub}>
            Distance, allure et splits trackés en temps réel.
            {isNative() ? " Marche en arrière-plan." : " (Mode web : reste sur cette page pendant la course.)"}
          </div>
          <button style={S.bigBtn(G)} onClick={start} disabled={phase === "requesting"}>
            {phase === "requesting" ? "Démarrage..." : "Démarrer ma course"}
          </button>
          <button style={S.linkBtn} onClick={onClose}>Annuler</button>
        </div>
      </div>
    );
  }

  if (phase === "done" && summary) {
    return (
      <div style={S.wrap}>
        <div style={S.idleInner}>
          <div style={{ fontSize: 11, color: G, letterSpacing: "3px", textTransform: "uppercase", fontWeight: 800, marginBottom: 14 }}>
            Course terminée
          </div>
          <div style={S.bigStat}>{formatDistance(summary.distanceM)}</div>
          <div style={S.bigStatLabel}>Distance</div>
          <div style={S.statsRow}>
            <Stat label="Durée" value={formatDuration(summary.durationS)} />
            <Stat label="Allure" value={`${formatPace(summary.paceSPerKm)} /km`} />
          </div>
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
          <div style={{ display: "flex", gap: 12, marginTop: 28, width: "100%", maxWidth: 420 }}>
            <button
              style={{ ...S.bigBtn(G), flex: 1 }}
              onClick={() => { haptic.medium(); setShowShare(true); }}
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#050505" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 7, verticalAlign: "middle" }}>
                <path d="M12 3v13" />
                <path d="M7 8l5-5 5 5" />
                <path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
              </svg>
              Partager
            </button>
            <button
              style={{ ...S.bigBtn("rgba(255,255,255,0.1)"), color: "#fff", flex: 1 }}
              onClick={onClose}
            >
              Retour
            </button>
          </div>
        </div>
        {showShare && (
          <RunShareStory
            route={route}
            summary={summary}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    );
  }

  // Active or paused
  return (
    <div style={S.wrap}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 24px", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        {autoPaused && (
          <div style={S.autoPauseBanner}>⏸ Auto-pause (tu sembles à l'arrêt)</div>
        )}
        {/* Distance hero */}
        <div style={{ textAlign: "center", marginTop: 30, marginBottom: 16 }}>
          <div style={S.bigStat}>{formatDistance(distance)}</div>
          <div style={S.bigStatLabel}>{phase === "paused" ? "EN PAUSE" : "Distance"}</div>
        </div>
        {/* Stats row */}
        <div style={S.statsRow}>
          <Stat label="Durée" value={formatDuration(duration)} />
          <Stat label="Allure" value={`${formatPace(pace)} /km`} />
        </div>
        {cadence > 0 && (
          <div style={{ ...S.statsRow, marginTop: 12 }}>
            <Stat label="Cadence" value={`${cadence} pas/min`} />
          </div>
        )}
        {/* Splits live */}
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
        {/* Controls */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
          <button style={S.controlBtn(phase === "paused" ? G : "rgba(255,255,255,0.1)")} onClick={togglePause}>
            {phase === "paused" ? "▶ Reprendre" : "⏸ Pause"}
          </button>
          <button style={S.controlBtn(RED, true)} onClick={stop}>
            ⏹ Stop
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={S.statBox}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
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
};
