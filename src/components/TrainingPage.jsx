import React, { useState, useCallback, useEffect, useRef } from "react";
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
  const [chrono, setChrono] = useState(0);
  const [chronoOn, setChronoOn] = useState(false);
  const [chronoPaused, setChronoPaused] = useState(false);
  const intervalRef = useRef(null);
  const SESSION_KEY = `rb_chrono_${activeWeek}_${activeSession}`;

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
      if (s.done) { setChrono(s.total || 0); setChronoOn(false); return; }
      if (s.start && !s.paused) {
        setChrono(Math.floor((Date.now() - s.start) / 1000) + (s.base || 0));
        setChronoOn(true); setChronoPaused(false);
      } else if (s.base) {
        setChrono(s.base); setChronoOn(true); setChronoPaused(true);
      }
    } catch {}
  }, [activeWeek, activeSession]);

  useEffect(() => {
    if (!chronoOn || chronoPaused) { clearInterval(intervalRef.current); return; }
    try {
      const start = s.start || Date.now();
      const base = s.base || 0;
      intervalRef.current = setInterval(() => {
        setChrono(Math.floor((Date.now() - start) / 1000) + base);
      }, 1000);
    } catch {}
    return () => clearInterval(intervalRef.current);
  }, [chronoOn, chronoPaused]);

  const startChrono = () => {
    const now = Date.now();
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ start: now, base: 0, paused: false })); } catch {}
    setChrono(0); setChronoOn(true); setChronoPaused(false);
  };

  const pauseChrono = () => {
    clearInterval(intervalRef.current);
    try {
      const elapsed = Math.floor((Date.now() - (s.start || Date.now())) / 1000) + (s.base || 0);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ base: elapsed, paused: true }));
    } catch {}
    setChronoPaused(true);
  };

  const resumeChrono = () => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ start: now, base: s.base || 0, paused: false }));
    } catch {}
    setChronoPaused(false);
  };

  const stopChrono = (total) => {
    clearInterval(intervalRef.current);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ done: true, total })); } catch {}
    setChronoOn(false);
  };

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + ":" + String(m).padStart(2,"0") + ":" + String(sec).padStart(2,"0");
    return String(m).padStart(2,"0") + ":" + String(sec).padStart(2,"0");
  };
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedRessenti, setSelectedRessenti] = useState(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (chronoOn) {
      startRef.current = Date.now() - chrono * 1000;
      intervalRef.current = setInterval(() => {
        setChrono(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [chronoOn]);


  const currentWeek = programme?.weeks?.[activeWeek];
  const currentSession = currentWeek?.sessions?.[activeSession];
  const totalSessions = programme?.weeks?.reduce((a, w) => a + (w.sessions?.length || 0), 0) || 0;
  const doneSessions = programme?.weeks?.slice(0, activeWeek).reduce((a, w) => a + (w.sessions?.length || 0), 0) + activeSession || 0;
  const globalPct = totalSessions > 0 ? Math.min(Math.round((doneSessions / totalSessions) * 100), 100) : 0;
  const totalEx = currentSession?.exercises?.length || 0;
  const doneEx = (currentSession?.exercises || []).filter((_, ei) => (getHistory(activeWeek, activeSession, ei) || []).length > 0).length;
  const sessionPct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;

  const volumeTotal = (currentSession?.exercises || []).reduce((tot, ex, ei) => {
    if (h.length === 0) return tot;
    return tot + (parseFloat(h[h.length - 1]?.weight) || 0) * (parseInt(ex.sets) || 1) * (parseInt(ex.reps) || 1);
  }, 0);

  const seriesDone = (currentSession?.exercises || []).reduce((tot, ex, ei) => {
    return tot + (h.length > 0 ? parseInt(ex.sets) || 1 : 0);
  }, 0);

  const handleBilan = async () => {
    if (!client?.id) return;
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

        {/* Chrono + Stats */}
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
          {chronoOn ? (
            <div onClick={() => setChronoOn(false)} style={{ textAlign: "right", cursor: "pointer" }}>
              <div style={{ fontSize: 28, fontWeight: 100, color: "#fff", letterSpacing: "-2px" }}>
                {fmt(chrono).split(":")[0]}<span style={{ color: "rgba(255,255,255,0.3)" }}>:</span>{fmt(chrono).split(":")[1]}
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>Chrono</div>
            </div>
          ) : (
            <button onClick={() => setChronoOn(true)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "10px 16px", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ▶ Chrono
            </button>
          )}
        </div>
      </div>

      {/* SEMAINES */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, padding: "0 20px" }}>Semaines</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 4px" }}>
          {programme.weeks.map((w, i) => {
            const isWeekDone = i < activeWeek;
            const isActive = i === activeWeek;
            return (
              <div key={i} onClick={() => setActiveWeek(i)} style={{ flexShrink: 0, width: 76, padding: "14px 10px", borderRadius: 18, textAlign: "center", cursor: "pointer", background: isActive ? G_DIM : "rgba(255,255,255,0.02)", border: isActive ? `1.5px solid ${G}` : "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
                {isWeekDone && <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: G }} />}
                <div style={{ fontSize: 22, fontWeight: isActive ? 800 : 200, color: isActive ? G : isWeekDone ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)", letterSpacing: "-1px" }}>S{i + 1}</div>
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
            const sexs = s.exercises?.length || 0;
            const doneS = (s.exercises || []).filter((_, ei) => (getHistory(activeWeek, i, ei) || []).length > 0).length;
            const pct = sexs > 0 ? Math.round((doneS / sexs) * 100) : 0;
            return (
              <div key={i} onClick={() => setActiveSession(i)} style={{ flexShrink: 0, width: 128, padding: "16px 14px", borderRadius: 20, cursor: "pointer", background: isActive ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)", border: isActive ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
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
        {(currentSession.exercises || []).map((ex, ei) => {
          const history = getHistory(activeWeek, activeSession, ei) || [];
          const isDone = history.length > 0;
          const status = getProgressStatus(history);
          const ghostData = activeWeek > 0 ? getLatest(activeWeek - 1, activeSession, ei) : null;
          const bandColor = isDone ? G : status === "green" ? "rgba(2,209,186,0.5)" : status === "yellow" ? "rgba(251,191,36,0.5)" : status === "red" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)";
          return (
            <div key={ei} style={{ marginBottom: 10, opacity: isDone ? 1 : (getHistory(activeWeek, activeSession, ei - 1) || []).length > 0 || ei === 0 ? 1 : 0.4 }}>
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
        <div onClick={() => setShowConfirm(true)} style={{ padding: "16px 20px", background: G_DIM, border: `1px solid ${G_BORDER}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: G }}>Terminer la seance</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{doneEx}/{totalEx} · +40 XP</div>
        </div>
      </div>

      {/* MODAL OPTIONS */}
      {showOptions && (
        <div onClick={() => setShowOptions(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 20px calc(env(safe-area-inset-bottom,0px) + 24px)", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Options de seance</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Reporter", sub: "Au lendemain" },
                { label: "Repos", sub: "Journee de repos" },
                { label: "Remplacer", sub: "Un exercice" },
                { label: "Reordonner", sub: "Les exercices" },
              ].map(({ label, sub }) => (
                <div key={label} onClick={() => setShowOptions(false)} style={{ padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, cursor: "pointer" }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{sub}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowOptions(false)} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer" }}>Annuler</button>
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
