import React, { useState, useCallback, useEffect, useRef } from "react";

/**
 * CountdownBlockCard — carte premium avec countdown lançable + persistance
 * localStorage (timestamp-based, survit close PWA). Variants :
 *   - "amrap" (rouge) : AMRAP, EMOM, Tabata, WOD côté athlète
 *   - "ergo"  (cyan)  : rameur, vélo, ski-erg fin de séance
 *
 * Beep + vibrate à la fin du countdown. Si `minutes` est nul ou 0, affiche
 * juste l'info card sans chrono (utile pour les ergos "objectif distance"
 * sans contrainte de temps).
 *
 * `storageKey` doit être unique par bloc (ex: `rb_amrap_${w}_${s}_${i}`) pour
 * que chaque chrono ait son propre état. Dans un preview/sandbox, passe une
 * clé qui change à chaque édition pour éviter de polluer le storage.
 */

const G = "#02d1ba";

const fmtTime = (s) => {
  const ss = Math.max(0, Math.floor(s));
  return String(Math.floor(ss / 60)).padStart(2, "0") + ":" + String(ss % 60).padStart(2, "0");
};

export default function CountdownBlockCard({
  title,
  minutes,
  description,
  variant = "amrap",
  icon,
  badge,
  storageKey,
}) {
  const ACCENT = variant === "ergo" ? "#38bdf8" : "#ef4444";
  const ACCENT_RGB = variant === "ergo" ? "56,189,248" : "239,68,68";
  const totalSeconds = Math.max(1, (minutes || 0)) * 60;
  const KEY = storageKey;

  const readState = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }, [KEY]);

  const computeRemaining = useCallback(() => {
    const s = readState();
    if (s.done) return 0;
    if (s.start) {
      const elapsed = Math.floor((Date.now() - s.start) / 1000);
      return Math.max(0, totalSeconds - elapsed);
    }
    return totalSeconds;
  }, [readState, totalSeconds]);

  const [remaining, setRemaining] = useState(computeRemaining);
  const [running, setRunning] = useState(() => {
    const s = readState();
    return !!(s.start && !s.done);
  });
  const [done, setDone] = useState(() => !!readState().done);
  const tickRef = useRef(null);

  // Resync quand la clé change (ex : preview du builder qui change d'AMRAP).
  useEffect(() => {
    const s = readState();
    if (s.done) { setRemaining(0); setRunning(false); setDone(true); }
    else if (s.start) {
      const r = computeRemaining();
      setRemaining(r); setDone(r === 0); setRunning(r > 0);
      if (r === 0) try { localStorage.setItem(KEY, JSON.stringify({ ...s, done: true })); } catch {}
    } else {
      setRemaining(totalSeconds); setRunning(false); setDone(false);
    }
  }, [readState, computeRemaining, KEY, totalSeconds]);

  // Tick + resync visibilitychange
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!running) return;
    tickRef.current = setInterval(() => {
      const r = computeRemaining();
      setRemaining(r);
      if (r === 0) {
        const s = readState();
        try { localStorage.setItem(KEY, JSON.stringify({ ...s, done: true })); } catch {}
        setRunning(false); setDone(true);
        try { if (navigator.vibrate) navigator.vibrate([120, 60, 120, 60, 200]); } catch {}
        try {
          const a = new (window.AudioContext || window.webkitAudioContext)();
          const o = a.createOscillator(); const g = a.createGain();
          o.frequency.value = 880; o.connect(g); g.connect(a.destination);
          g.gain.setValueAtTime(0.15, a.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.7);
          o.start(); o.stop(a.currentTime + 0.7);
        } catch {}
      }
    }, 500);
    const onVisible = () => {
      if (document.visibilityState === "visible") setRemaining(computeRemaining());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(tickRef.current); document.removeEventListener("visibilitychange", onVisible); };
  }, [running, computeRemaining, KEY, readState]);

  const start = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ start: Date.now() })); } catch {}
    setRemaining(totalSeconds); setRunning(true); setDone(false);
  };
  const reset = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setRemaining(totalSeconds); setRunning(false); setDone(false);
  };

  const display = fmtTime(remaining);
  const stateLabel = done ? "TERMINÉ" : running ? "CHRONO EN COURS" : "PRÊT À LANCER";
  const stateColor = done ? G : running ? ACCENT : "rgba(255,255,255,0.4)";

  return (
    <div style={{
      background: `linear-gradient(160deg, rgba(${ACCENT_RGB},0.10) 0%, rgba(15,15,15,0.55) 60%, rgba(0,0,0,0.7) 100%)`,
      border: `1px solid rgba(${ACCENT_RGB},0.28)`,
      borderRadius: 18,
      padding: "20px 18px 18px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 6px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, rgba(${ACCENT_RGB},1) 0%, rgba(${ACCENT_RGB},0.5) 50%, transparent 100%)` }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `rgba(${ACCENT_RGB},0.18)`,
          display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid rgba(${ACCENT_RGB},0.4)`, flexShrink: 0 }}>
          {icon || (variant === "ergo" ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M6 13l4-8h4l-2 6 4 6" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 2h6" />
            </svg>
          ))}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: ACCENT }}>
            {title}
          </div>
          {badge ? (
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              {badge}
            </div>
          ) : null}
        </div>
      </div>

      {description ? (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.55, whiteSpace: "pre-wrap", marginBottom: 16, fontWeight: 500 }}>
          {description}
        </div>
      ) : null}

      {minutes ? (
        <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
          <div style={{
            fontSize: 50, fontWeight: 100,
            color: done ? G : running ? "#fff" : "rgba(255,255,255,0.35)",
            letterSpacing: "-2px",
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            lineHeight: 1, marginBottom: 6,
            textShadow: done ? `0 0 28px ${G}55` : running ? `0 0 18px rgba(${ACCENT_RGB},0.3)` : "none",
            transition: "color 0.2s, text-shadow 0.2s",
          }}>
            {display.split(":")[0]}
            <span style={{ color: "rgba(255,255,255,0.2)" }}>:</span>
            {display.split(":")[1]}
          </div>
          <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase",
            color: stateColor, marginBottom: 14, transition: "color 0.2s" }}>
            {stateLabel}{done && " ✓"}
          </div>

          {!running && !done && (
            <button onClick={start} style={{
              background: ACCENT, color: "white", border: "none", borderRadius: 12,
              padding: "12px 26px", fontSize: 12, fontWeight: 800, letterSpacing: "2px",
              textTransform: "uppercase", cursor: "pointer", width: "100%",
              boxShadow: `0 4px 16px rgba(${ACCENT_RGB},0.35)`,
            }}>
              Lancer le chrono
            </button>
          )}
          {running && (
            <button onClick={reset} style={{
              width: "100%", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
              padding: "12px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase", cursor: "pointer",
            }}>
              Stop & Reset
            </button>
          )}
          {done && (
            <button onClick={reset} style={{
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              padding: "10px 22px", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase", cursor: "pointer",
            }}>
              Refaire
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
