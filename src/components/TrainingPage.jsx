import React, { useState, useCallback, useEffect, useRef } from "react";
import { SeanceVivante } from "./SeanceVivante";
import { supabase } from "../lib/supabase";
import { ExerciseCard } from "./ExerciseCard";

const G = "#02d1ba";
const G_DIM = "rgba(2,209,186,0.1)";
const G_BORDER = "rgba(2,209,186,0.25)";

function getProgressStatus(history) {
  if (!history || history.length < 2) return "neutral";
  const last = history[history.length - 1]?.weight;
  const prev = history[history.length - 2]?.weight;
  if (!last || !prev) return "neutral";
  if (last > prev) return "green";
  if (last < prev) return "red";
  return "yellow";
}

function StatusDot({ status }) {
  const colors = { green: G, yellow: "#fbbf24", red: "#ef4444", neutral: "rgba(255,255,255,0.15)" };
  return <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || colors.neutral, flexShrink: 0 }} />;
}

export default function TrainingPage({ client, programme, activeWeek, setActiveWeek, activeSession, setActiveSession, getHistory, getLatest, saveLog, getDelta }) {
  const [showRessenti, setShowRessenti] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedRessenti, setSelectedRessenti] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [exercisesOrder, setExercisesOrder] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const longPressRef = useRef({});
  const [sessionTerminee, setSessionTerminee] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`rb_session_w${activeWeek}_s${activeSession}`) || "{}");
      return saved.status === "done";
    } catch { return false; }
  });

  // Detecter seance partielle au chargement
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `sets_done_${activeWeek}_${activeSession}_0_${today}`;
    try {
      const val = localStorage.getItem(key);
      if (val && parseInt(val) > 0) setShowResume(true);
    } catch {}
  }, [activeWeek, activeSession]);
  // CHRONO — bouton Demarrer manuel, pause, resume, persistant
  const SESSION_KEY = `rb_session_w${activeWeek}_s${activeSession}`;
  const intervalRef = useRef(null);

  const getSession = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}"); } catch { return {}; }
  }, [SESSION_KEY]);

  const saveSession = useCallback((patch) => {
    try {
      const existing = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...existing, ...patch }));
    } catch {}
  }, [SESSION_KEY]);

  const [chrono, setChrono] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_session_w${activeWeek}_s${activeSession}`) || "{}");
      if (s.status === "done") return s.totalTime || 0;
      if (s.chronoStart && !s.paused) return Math.floor((Date.now() - s.chronoStart) / 1000) + (s.baseElapsed || 0);
      if (s.baseElapsed) return s.baseElapsed;
    } catch {}
    return 0;
  });

  const [chronoStarted, setChronoStarted] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_session_w${activeWeek}_s${activeSession}`) || "{}");
      return !!(s.chronoStart || s.baseElapsed || s.status === "done");
    } catch { return false; }
  });

  const [chronoPaused, setChronoPaused] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_session_w${activeWeek}_s${activeSession}`) || "{}");
      return !!s.paused;
    } catch { return false; }
  });

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  // Tick chrono
  useEffect(() => {
    const s = getSession();
    if (!s.chronoStart || s.paused || s.status === "done") return;
    const base = s.baseElapsed || 0;
    intervalRef.current = setInterval(() => {
      const sess = getSession();
      if (sess.chronoStart && !sess.paused) {
        setChrono(Math.floor((Date.now() - sess.chronoStart) / 1000) + (sess.baseElapsed || base));
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [chronoPaused, chronoStarted, SESSION_KEY]);

  const startChrono = useCallback(() => {
    const now = Date.now();
    saveSession({ chronoStart: now, startedAt: now, status: "active", baseElapsed: 0, paused: false });
    setChronoStarted(true);
    setChronoPaused(false);
    setChrono(0);
  }, [saveSession]);

  const pauseChrono = useCallback(() => {
    clearInterval(intervalRef.current);
    const sess = getSession();
    const elapsed = Math.floor((Date.now() - (sess.chronoStart || Date.now())) / 1000) + (sess.baseElapsed || 0);
    saveSession({ paused: true, chronoStart: 0, baseElapsed: elapsed });
    setChronoPaused(true);
    setChrono(elapsed);
  }, [getSession, saveSession]);

  const resumeChrono = useCallback(() => {
    const now = Date.now();
    saveSession({ paused: false, chronoStart: now });
    setChronoPaused(false);
  }, [saveSession]);

  const stopChrono = useCallback((totalTime) => {
    clearInterval(intervalRef.current);
    saveSession({ status: "done", totalTime, chronoStart: 0, paused: false });
  }, [saveSession]);

  const currentWeek = programme?.weeks?.[activeWeek];
  const currentSession = currentWeek?.sessions?.[activeSession];
  const totalSessions = programme?.weeks?.reduce((a, w) => a + (w.sessions?.length || 0), 0) || 0;
  const doneSessions = programme?.weeks?.slice(0, activeWeek).reduce((a, w) => a + (w.sessions?.length || 0), 0) + activeSession || 0;
  const globalPct = totalSessions > 0 ? Math.min(Math.round((doneSessions / totalSessions) * 100), 100) : 0;
  const totalEx = currentSession?.exercises?.length || 0;
  const doneEx = (currentSession?.exercises || []).filter((_, ei) => (getHistory(activeWeek, activeSession, ei) || []).length > 0).length;
  const sessionPct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;

  const volumeTotal = (currentSession?.exercises || []).reduce((tot, ex, ei) => {
    const h = getHistory(activeWeek, activeSession, ei) || [];
    if (h.length === 0) return tot;
    return tot + (parseFloat(h[h.length - 1]?.weight) || 0) * (parseInt(ex.sets) || 1) * (parseInt(ex.reps) || 1);
  }, 0);

  const seriesDone = (currentSession?.exercises || []).reduce((tot, ex, ei) => {
    const h = getHistory(activeWeek, activeSession, ei) || [];
    return tot + (h.length > 0 ? parseInt(ex.sets) || 1 : 0);
  }, 0);

  const handleBilan = async () => {
    if (!client?.id || sessionTerminee) return;
    setSessionTerminee(true);
    stopChrono(chrono);
    await supabase.from("session_logs").insert({
      client_id: client.id,
      session_name: currentSession?.name || "Seance",
      programme_name: programme?.name || "Programme",
      logged_at: new Date().toISOString(),
    });
    if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 150]);
    setShowRessenti(true);
  };

  const handleRessenti = async (idx) => {
    setSelectedRessenti(idx);
    await supabase.from("session_rpe").insert({
      client_id: client?.id,
      session_name: currentSession?.name,
      rpe: idx + 1,
      date: new Date().toISOString().split("T")[0],
    });
    setTimeout(() => setShowRessenti(false), 800);
  };

  if (!programme || !currentWeek || !currentSession) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Aucun programme charge</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: 120 }}>
      <SeanceVivante clientId={client?.id} sessionName={currentSession?.name} />

      {/* HERO */}
      <div style={{ padding: "0px 20px 16px" }}>
        <div style={{ fontSize: 9, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6 }}>Programme</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.9, marginBottom: 10 }}>
          Train<span style={{ color: G }}>.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{programme.name}</div>
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize: 13, color: G, fontWeight: 600 }}>Semaine {activeWeek + 1}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase" }}>Avancement</div>
          <div style={{ fontSize: 11, color: G, fontWeight: 700 }}>{doneSessions}/{totalSessions} seances</div>
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, marginBottom: 16 }}>
          <div style={{ height: "100%", width: globalPct + "%", background: G, borderRadius: 1, transition: "width 0.6s ease" }} />
        </div>

        {/* Stats + Chrono */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 200, color: "#fff", letterSpacing: "-1px" }}>{Math.round(volumeTotal)}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>kg</span></div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>Volume</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 200, color: G, letterSpacing: "-1px" }}>{seriesDone}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>series</span></div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>Completees</div>
            </div>
          </div>

          {/* CHRONO */}
          {sessionTerminee ? (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 100, color: "rgba(255,255,255,0.4)", letterSpacing: "-2px" }}>{fmt(chrono)}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 2 }}>Duree totale</div>
            </div>
          ) : !chronoStarted ? (
            <button onClick={startChrono} style={{ background: G, color: "#000", border: "none", borderRadius: 100, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ▶ Démarrer
            </button>
          ) : (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 100, color: chronoPaused ? "rgba(255,255,255,0.3)" : "#fff", letterSpacing: "-2px", lineHeight: 1 }}>{fmt(chrono)}</div>
              <button onClick={chronoPaused ? resumeChrono : pauseChrono} style={{ fontSize: 9, color: chronoPaused ? G : "rgba(255,255,255,0.3)", background: "transparent", border: "none", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", padding: 0, marginTop: 3 }}>
                {chronoPaused ? "▶ Reprendre" : "⏸ Pause"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SEMAINES */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, padding: "0 20px" }}>Semaines</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 4px" }}>
          {programme.weeks.map((w, i) => {
            const isDone = i < activeWeek;
            const isActive = i === activeWeek;
            return (
              <div key={i} onClick={() => { setActiveWeek(i); setActiveSession(0); setShowResume(false); setSessionTerminee(false); setChrono(0); setChronoOn(false); }} style={{ flexShrink: 0, width: 76, padding: "14px 10px", borderRadius: 18, textAlign: "center", cursor: "pointer", background: isActive ? G_DIM : "rgba(255,255,255,0.02)", border: isActive ? `1.5px solid ${G}` : "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
                {isDone && <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: G }} />}
                <div style={{ fontSize: 22, fontWeight: isActive ? 800 : 200, color: isActive ? G : isDone ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)", letterSpacing: "-1px" }}>S{i + 1}</div>
                <div style={{ fontSize: 7, color: isActive ? "rgba(2,209,186,0.6)" : "rgba(255,255,255,0.2)", marginTop: 4, letterSpacing: "1px" }}>{isDone ? "FAIT" : isActive ? "EN COURS" : "A VENIR"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEANCES */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, padding: "0 20px" }}>Seances</div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 4px" }}>
          {currentWeek.sessions.map((s, i) => {
            const isDone = i < activeSession;
            const isActive = i === activeSession;
            const sexs = s.exercises?.length || 0;
            const doneS = (s.exercises || []).filter((_, ei) => (getHistory(activeWeek, i, ei) || []).length > 0).length;
            const pct = sexs > 0 ? Math.round((doneS / sexs) * 100) : 0;
            return (
              <div key={i} onClick={() => { setActiveSession(i); setShowResume(false); setSessionTerminee(false); setChrono(0); setChronoOn(false); }} style={{ flexShrink: 0, width: 128, padding: "16px 14px", borderRadius: 20, cursor: "pointer", background: isActive ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)", border: isActive ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: 8, color: isDone ? G : isActive ? "rgba(2,209,186,0.7)" : "rgba(255,255,255,0.2)", letterSpacing: "1px", marginBottom: 8, fontWeight: 700 }}>{isDone ? "✓ COMPLETE" : isActive ? "AUJOURD HUI" : "A VENIR"}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: isDone ? "rgba(255,255,255,0.5)" : isActive ? "#fff" : "rgba(255,255,255,0.3)", marginBottom: 3 }}>{s.name || `Seance ${i + 1}`}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>{sexs} exercices</div>
                <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
                  <div style={{ height: "100%", width: pct + "%", background: G, borderRadius: 1 }} />
                </div>
              </div>
            );
          })}
          <div onClick={() => setShowOptions(true)} style={{ flexShrink: 0, width: 80, borderRadius: 20, cursor: "pointer", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 10px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.4 }}>Options</div>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ height: 1, background: `linear-gradient(90deg, rgba(2,209,186,0.4) 0%, rgba(255,255,255,0.03) 100%)`, margin: "0 20px 16px" }} />

      {/* PROGRESSION SEANCE */}
      <div style={{ padding: "0 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>{currentSession.name || "Seance"}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{doneEx} <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 300 }}>/ {totalEx} exercices</span></div>
          </div>
          <div style={{ position: "relative", width: 52, height: 52 }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
              <circle cx="26" cy="26" r="21" fill="none" stroke={G} strokeWidth="4" strokeLinecap="round"
                strokeDasharray="132" strokeDashoffset={132 - (132 * sessionPct / 100)} transform="rotate(-90 26 26)"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}/>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: G }}>{sessionPct}%</div>
          </div>
        </div>
      </div>

      {/* FANTOME */}
      {activeWeek > 0 && (
        <div style={{ margin: "0 20px 14px", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Fantome S{activeWeek} visible sur chaque exercice</div>
        </div>
      )}

      {/* EXERCICES */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>Exercices</div>
        {getExercises().map((ex, ei) => {
          const history = getHistory(activeWeek, activeSession, ei) || [];
          const status = getProgressStatus(history);
          const isDone = history.length > 0;
          const ghostData = activeWeek > 0 ? getLatest(activeWeek - 1, activeSession, ei) : null;
          const bandColor = isDone ? G : status === "green" ? "rgba(2,209,186,0.5)" : status === "yellow" ? "rgba(251,191,36,0.5)" : status === "red" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)";
          const isDragging = dragIdx === ei;
          const isDragOver = dragOverIdx === ei;
          return (
            <div key={ei}
              onTouchStart={() => !isDone && handleLongPress(ei)}
              onTouchEnd={() => { handleLongPressEnd(ei); if (dragIdx !== null) handleDrop(ei); }}
              onTouchMove={() => handleLongPressEnd(ei)}
              onMouseEnter={() => handleDragOver(ei)}
              style={{
                marginBottom: 10,
                opacity: isDragging ? 0.4 : isDone ? 1 : (getHistory(activeWeek, activeSession, ei - 1) || []).length > 0 || ei === 0 ? 1 : 0.4,
                transform: isDragOver && !isDone ? "translateY(-4px)" : "none",
                transition: "transform 0.15s ease, opacity 0.2s ease",
                cursor: isDone ? "default" : "grab",
              }}>
              {!isDone && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, paddingLeft: 4 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "1px" }}>MAINTENIR POUR DEPLACER</span>
                </div>
              )}
              <ExerciseCard
                ex={ex}
                weekIdx={activeWeek}
                sessionIdx={activeSession}
                exIdx={ei}
                globalIndex={ei}
                getHistory={getHistory}
                getLatest={getLatest}
                saveLog={saveLog}
                getDelta={getDelta}
                nextExName={(currentSession.exercises || [])[ei + 1]?.name}
                ghostData={ghostData}
                bandColor={bandColor}
              />
            </div>
          );
        })}
      </div>

      {/* BOUTON TERMINER */}
      <div style={{ padding: "20px 20px 0" }}>
        <div onClick={() => !sessionTerminee && setShowConfirm(true)} style={{ padding: "16px 20px", background: sessionTerminee ? "rgba(255,255,255,0.03)" : G_DIM, border: `1px solid ${sessionTerminee ? "rgba(255,255,255,0.06)" : G_BORDER}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: sessionTerminee ? "not-allowed" : "pointer", opacity: sessionTerminee ? 0.5 : 1, transition: "all 0.3s ease" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: sessionTerminee ? "rgba(255,255,255,0.3)" : G }}>{sessionTerminee ? "Seance terminee ✓" : "Terminer la seance"}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{sessionTerminee ? `Duree : ${fmt(chrono)}` : `${doneEx}/${totalEx} · +40 XP`}</div>
        </div>
      </div>

      {/* MODAL OPTIONS */}
      {showOptions && (
        <div onClick={() => setShowOptions(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 20px calc(env(safe-area-inset-bottom,0px) + 24px)", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Options</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>{currentSession?.name}</div>

            {/* Reporter */}
            <div onClick={async () => {
              await supabase.from("session_logs").insert({
                client_id: client?.id,
                session_name: (currentSession?.name || "Seance") + " (Reportee)",
                programme_name: programme?.name,
                logged_at: new Date().toISOString(),
                note: "REPORTEE",
              });
              setShowOptions(false);
              alert("Seance reportee. Ton coach est notifie.");
            }} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#60a5fa", marginBottom: 2 }}>Reporter la seance</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Notifie ton coach automatiquement</div>
              </div>
            </div>

            {/* Repos */}
            <div onClick={async () => {
              await supabase.from("daily_tracking").upsert({
                client_id: client?.id,
                date: new Date().toISOString().split("T")[0],
                repos: true,
              }, { onConflict: "client_id,date" });
              setShowOptions(false);
              alert("Journee de repos enregistree.");
            }} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa", marginBottom: 2 }}>Journee de repos</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Repos actif — visible par ton coach</div>
              </div>
            </div>

            {/* Remplacer exercice */}
            <div onClick={() => {
              const nom = prompt("Nom de l exercice de remplacement ?");
              if (nom) {
                try {
                  const key = `rb_replace_w${activeWeek}_s${activeSession}`;
                  const existing = JSON.parse(localStorage.getItem(key) || "[]");
                  existing.push(nom);
                  localStorage.setItem(key, JSON.stringify(existing));
                } catch {}
                setShowOptions(false);
              }
            }} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#34d399", marginBottom: 2 }}>Remplacer un exercice</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Sauvegarde pour cette seance uniquement</div>
              </div>
            </div>

            <button onClick={() => setShowOptions(false)} style={{ width: "100%", padding: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION */}
      {showConfirm && (
        <div onClick={() => setShowConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "28px 20px calc(env(safe-area-inset-bottom,0px) + 28px)", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.5px" }}>Terminer la seance ?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>{doneEx}/{totalEx} exercices · +40 XP</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer" }}>Continuer</button>
              <button onClick={() => { setShowConfirm(false); handleBilan(); }} style={{ flex: 1, padding: 16, background: G, border: "none", borderRadius: 14, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Terminer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESSENTI */}
      {showRessenti && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "28px 20px calc(env(safe-area-inset-bottom,0px) + 28px)", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-1px" }}>Seance terminee.</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Comment tu t es senti ?</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {["😤", "😐", "🙂", "💪", "🔥"].map((e, i) => (
                <div key={i} onClick={() => handleRessenti(i)} style={{ flex: 1, padding: "14px 0", borderRadius: 16, textAlign: "center", cursor: "pointer", background: selectedRessenti === i ? G_DIM : "rgba(255,255,255,0.02)", border: `1.5px solid ${selectedRessenti === i ? G : "rgba(255,255,255,0.05)"}`, transition: "all 0.15s" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{e}</div>
                  <div style={{ fontSize: 8, color: selectedRessenti === i ? G : "rgba(255,255,255,0.2)" }}>{["Dur", "Ok", "Bien", "Fort", "Top"][i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
