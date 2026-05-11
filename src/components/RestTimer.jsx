import React, { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "../lib/i18n";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const GREEN = "#02d1ba";
const GREEN_DIM = "rgba(2,209,186,0.12)";
const GREEN_GLOW = "rgba(2,209,186,0.4)";

/* Parse "2 min", "1 min 30", "90s", "2'30", "1'", etc. → secondes */
function parseRestSeconds(rest) {
  if (!rest) return null;
  const s = String(rest).toLowerCase().trim();
  // "2'30" ou "2'30s" (notation apostrophe = minutes'secondes — utilisé dans le seed)
  const apo30 = s.match(/(\d+)\s*[''']\s*(\d+)/);
  if (apo30) return parseInt(apo30[1]) * 60 + parseInt(apo30[2]);
  // "2'" (juste minutes)
  const apo = s.match(/(\d+)\s*[''']\s*$/);
  if (apo) return parseInt(apo[1]) * 60;
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

  // Son + vibration fin de timer
  const playFinishSound = React.useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.15, 0.3].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = i === 2 ? 880 : 660;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    } catch(e) {}
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
  }, []);

  // Son fin de timer
  const playBeep = React.useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[0, 660], [0.15, 660], [0.3, 880]].forEach(([delay, freq]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.25);
      });
    } catch(e) {}
  }, []);
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

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[0, 660], [0.15, 660], [0.3, 880]].forEach(([delay, freq]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch(e) {}
}

function unlockAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.resume();
  } catch(e) {}
}

export function RestTimer({ restSeconds, onDismiss, exName }) {
  const t = useT();
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  
  // Enregistrer SW et demander permission
  useEffect(() => {
    const setup = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw-timer.js');
        } catch(e) {}
      }
    };
    setup();
  }, []);
  const [running, setRunning] = useState(true);
  const [extra, setExtra] = useState(0);          // secondes ajoutées manuellement
  const [phase, setPhase] = useState("rest");     // "rest" | "done"
  const intervalRef = useRef(null);

  // Persistence localStorage : si on quitte la PWA puis on revient, le timer
  // reprend pile où il en était (start + total figés en timestamp).
  const STORAGE_KEY = "rb_rest_timer_active";
  const initial = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (s.start && s.total && Date.now() - s.start < (s.total + 60) * 1000) {
        return { start: s.start, total: s.total };
      }
    } catch {}
    return { start: Date.now(), total: restSeconds };
  })();
  const startRef = useRef(initial.start);
  const totalRef = useRef(initial.total);

  // Persiste l'état au mount + à chaque ajout d'extra
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: startRef.current, total: totalRef.current })); } catch {}
  }, []);

  // Vibration à la fin (si supporté)
  const vibrate = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  }, []);

  // Gérer visibilité page (arrière-plan)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && running) {
        // Recalculer le temps restant quand on revient
        const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
        const remaining = totalRef.current - elapsed;
        if (remaining <= 0) {
          setTimeLeft(0);
          setPhase("done");
          setRunning(false);
          vibrate();
          playBeep();
        } else {
          setTimeLeft(remaining);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [running, vibrate]);

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
        playBeep();
        clearInterval(intervalRef.current);
      } else {
        setTimeLeft(remaining);
      }
    }, 250);
    return () => clearInterval(intervalRef.current);
  }, [running, vibrate]);

  // Programmer notification via Service Worker (fonctionne en arrière-plan)
  useEffect(() => {
    if (!running) return;
    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg.active) {
          reg.active.postMessage({
            type: 'SCHEDULE_TIMER',
            delay: totalRef.current,
            title: t("rt.notif_title"),
            body: exName ? fillTpl(t("rt.notif_next"), { name: exName }) : t("rt.notif_lets_go"),
          });
        }
      });
      return () => {
        navigator.serviceWorker.ready.then(reg => {
          if (reg.active) reg.active.postMessage({ type: 'CANCEL_TIMER' });
        });
      };
    }
  }, [running, exName]);

  const persist = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: startRef.current, total: totalRef.current })); } catch {}
  };
  const clearPersist = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

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
    persist();
  };

  const pause = () => {
    if (running) {
      clearInterval(intervalRef.current);
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      totalRef.current = totalRef.current - elapsed;
      startRef.current = Date.now();
      setRunning(false);
    } else {
      startRef.current = Date.now();
      setRunning(true);
    }
    persist();
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
    <div onClick={unlockAudio} style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.88)",
      WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)",
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
        {t("rt.section_title")}
      </div>

      {/* Nom exercice suivant */}
      {exName && (
        <div style={{
          fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)",
          marginBottom: 32, maxWidth: 260, textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {fillTpl(t("rt.next"), { name: exName })}
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
              }}>{t("rt.ready")}</div>
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
                {running ? t("rt.running") : t("rt.paused")}
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
                {t("rt.btn_pause")}
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                  <polygon points="5,3 17,10 5,17"/>
                </svg>
                {t("rt.btn_resume")}
              </>
            )}
          </button>
        )}

        {/* C'est parti / Terminer */}
        <button
          onClick={() => { clearPersist(); onDismiss?.(); }}
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
              {t("rt.btn_lets_go")}
            </>
          ) : (
            t("rt.btn_skip")
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
