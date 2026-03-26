import React, { useState, useEffect, useRef, useCallback } from "react";

const GREEN = "#02d1ba";
const GREEN_DIM = "rgba(2,209,186,0.12)";
const GREEN_GLOW = "rgba(2,209,186,0.4)";

/* Parse "2 min", "1 min 30", "90s", "3 min", etc. → secondes */
function parseRestSeconds(rest) {
  if (!rest) return null;
  const s = String(rest).toLowerCase().trim();
  // "2 min 30" ou "2 min 30s"
  const m30 = s.match(/(\d+)\s*min\s*(\d+)/);
  if (m30) return parseInt(m30[1]) * 60 + parseInt(m30[2]);
  // "2 min"
  const m = s.match(/(\d+)\s*min/);
  if (m) return parseInt(m[1]) * 60;
  // "90s" ou "90 sec"
  const sec = s.match(/(\d+)\s*s/);
  if (sec) return parseInt(sec[1]);
  // "4-5 min" → prendre la valeur haute
  const range = s.match(/(\d+)-(\d+)\s*min/);
  if (range) return parseInt(range[2]) * 60;
  // nombre seul → secondes
  const num = s.match(/^(\d+)$/);
  if (num) return parseInt(num[1]);
  return null;
}

/* Arc SVG pour le ring */
function Arc({ radius, progress, size, strokeWidth, color, glowColor }) {
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress);
  const cx = size / 2;
  const cy = size / 2;
  return (
    <>
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none" stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        filter={`drop-shadow(0 0 8px ${glowColor})`}
      />
    </>
  );
}

export function RestTimer({ restSeconds, onDismiss, exName }) {
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const [running, setRunning] = useState(true);
  const [extra, setExtra] = useState(0);          // secondes ajoutées manuellement
  const [phase, setPhase] = useState("rest");     // "rest" | "done"
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());
  const totalRef = useRef(restSeconds);

  // Vibration à la fin (si supporté)
  const vibrate = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const remaining = totalRef.current - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        setPhase("done");
        setRunning(false);
        vibrate();
        clearInterval(intervalRef.current);
      } else {
        setTimeLeft(remaining);
      }
    }, 250);
    return () => clearInterval(intervalRef.current);
  }, [running, vibrate]);

  const addTime = (secs) => {
    totalRef.current += secs;
    setExtra(e => e + secs);
    if (phase === "done") {
      setPhase("rest");
      setRunning(true);
      startRef.current = Date.now();
      totalRef.current = secs;
      setTimeLeft(secs);
    }
  };

  const pause = () => {
    if (running) {
      clearInterval(intervalRef.current);
      // Figer le temps restant
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      totalRef.current = totalRef.current - elapsed;
      startRef.current = Date.now();
      setRunning(false);
    } else {
      startRef.current = Date.now();
      setRunning(true);
    }
  };

  const progress = phase === "done" ? 0 : timeLeft / totalRef.current;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, "0")}`
    : `${secs}`;

  // Couleur selon urgence
  const ringColor = phase === "done"
    ? GREEN
    : timeLeft <= 10
    ? "#ef4444"
    : timeLeft <= 20
    ? "#f97316"
    : GREEN;
  const ringGlow = phase === "done"
    ? GREEN_GLOW
    : timeLeft <= 10
    ? "rgba(239,68,68,0.5)"
    : timeLeft <= 20
    ? "rgba(249,115,22,0.4)"
    : GREEN_GLOW;

  const SIZE = 200;
  const RADIUS = 82;
  const STROKE = 6;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px",
      animation: "fadeIn 0.25s ease",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes ringPop { 0% { transform: scale(1); } 40% { transform: scale(1.06); } 100% { transform: scale(1); } }
      `}</style>

      {/* Titre */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "2.5px",
        textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
        marginBottom: 6,
      }}>
        Récupération
      </div>

      {/* Nom exercice suivant */}
      {exName && (
        <div style={{
          fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)",
          marginBottom: 32, maxWidth: 260, textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          Prochain : {exName}
        </div>
      )}

      {/* Ring principal */}
      <div style={{
        position: "relative", width: SIZE, height: SIZE,
        marginBottom: 32,
        animation: phase === "done" ? "ringPop 0.5s ease" : undefined,
      }}>
        <svg width={SIZE} height={SIZE} style={{ position: "absolute", inset: 0 }}>
          <Arc
            radius={RADIUS} progress={progress}
            size={SIZE} strokeWidth={STROKE}
            color={ringColor} glowColor={ringGlow}
          />
        </svg>

        {/* Centre */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 4,
        }}>
          {phase === "done" ? (
            <>
              <div style={{ fontSize: 38, color: GREEN, animation: "pulse 1.5s infinite" }}>✓</div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: GREEN,
                letterSpacing: "2px", textTransform: "uppercase",
              }}>Prêt !</div>
            </>
          ) : (
            <>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: timeLeft >= 60 ? 44 : 56,
                fontWeight: 600,
                color: ringColor,
                letterSpacing: "-2px",
                lineHeight: 1,
                transition: "color 0.3s",
              }}>
                {timeStr}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace" }}>
                {running ? "en cours" : "en pause"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contrôles ajouter temps */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 20,
      }}>
        {[15, 30, 60].map(s => (
          <button
            key={s}
            onClick={() => addTime(s)}
            style={{
              padding: "7px 14px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 100,
              color: "rgba(255,255,255,0.5)",
              fontSize: 11.5, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
              fontFamily: "'JetBrains Mono',monospace",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(2,209,186,0.3)"; e.currentTarget.style.color = GREEN; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            +{s}s
          </button>
        ))}
      </div>

      {/* Boutons principaux */}
      <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 280 }}>
        {/* Pause/Reprendre */}
        {phase !== "done" && (
          <button
            onClick={pause}
            style={{
              flex: 1, padding: "13px",
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.7)",
              fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {running ? (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                  <rect x="5" y="4" width="3.5" height="12" rx="1.5"/>
                  <rect x="11.5" y="4" width="3.5" height="12" rx="1.5"/>
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                  <polygon points="5,3 17,10 5,17"/>
                </svg>
                Reprendre
              </>
            )}
          </button>
        )}

        {/* C'est parti / Terminer */}
        <button
          onClick={onDismiss}
          style={{
            flex: phase === "done" ? 1 : 1.2,
            padding: "13px",
            background: phase === "done" ? GREEN : "rgba(2,209,186,0.12)",
            border: `1.5px solid ${phase === "done" ? GREEN : "rgba(2,209,186,0.3)"}`,
            borderRadius: 12,
            color: phase === "done" ? "#0d0d0d" : GREEN,
            fontSize: 12, fontWeight: 700,
            cursor: "pointer", transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: phase === "done" ? "0 4px 20px rgba(2,209,186,0.4)" : "none",
          }}
        >
          {phase === "done" ? (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                <polygon points="5,3 17,10 5,17"/>
              </svg>
              C'est parti !
            </>
          ) : (
            "Passer"
          )}
        </button>
      </div>

      {/* Barre de progression linéaire en bas */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 2, background: "rgba(255,255,255,0.04)",
      }}>
        <div style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: ringColor,
          transition: "width 1s linear, background 0.3s",
          boxShadow: `0 0 6px ${ringGlow}`,
        }} />
      </div>
    </div>
  );
}

/* ── Hook pour déclencher le timer depuis ExerciseCard ── */
export { parseRestSeconds };
