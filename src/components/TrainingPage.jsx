import React, { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ExerciseCard } from "./ExerciseCard";

const GREEN = "#02d1ba";
const G_DIM = "rgba(2,209,186,0.1)";
const G_BORDER = "rgba(2,209,186,0.25)";

// Calcul Intelligence de Progression
function getProgressStatus(history) {
  if (!history || history.length < 2) return "neutral";
  const last = history[history.length - 1]?.weight;
  const prev = history[history.length - 2]?.weight;
  const older = history.length >= 4 ? history[history.length - 4]?.weight : null;
  if (!last || !prev) return "neutral";
  if (last > prev) return "green";
  if (last < prev) return "red";
  if (older && last === prev && prev === older) return "yellow";
  return "yellow";
}

function StatusDot({ status }) {
  const colors = { green: "#02d1ba", yellow: "#fbbf24", red: "#ef4444", neutral: "rgba(255,255,255,0.15)" };
  return (
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || colors.neutral, flexShrink: 0 }} />
  );
}

function WeekSelector({ weeks, activeWeek, onSelect }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, padding: "0 20px" }}>Semaines</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 4px" }}>
        {weeks.map((w, i) => {
          const isDone = i < activeWeek;
          const isActive = i === activeWeek;
          return (
            <div key={i} onClick={() => onSelect(i)} style={{
              flexShrink: 0, width: 76, padding: "14px 10px", borderRadius: 18, textAlign: "center", cursor: "pointer",
              background: isActive ? G_DIM : isDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
              border: isActive ? `1.5px solid ${GREEN}` : isDone ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.03)",
              position: "relative", transition: "all 0.2s ease",
            }}>
              {isDone && <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: GREEN }} />}
              <div style={{ fontSize: 22, fontWeight: isActive ? 800 : 200, color: isActive ? GREEN : isDone ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)", letterSpacing: "-1px" }}>S{i + 1}</div>
              <div style={{ fontSize: 7, color: isActive ? "rgba(2,209,186,0.6)" : "rgba(255,255,255,0.2)", marginTop: 4, letterSpacing: "1px" }}>
                {isDone ? "FAIT" : isActive ? "EN COURS" : "A VENIR"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionCards({ sessions, activeSession, onSelect, weekIdx, getHistory }) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, padding: "0 20px" }}>
        Seances
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 4px" }}>
        {sessions.map((s, i) => {
          const isDone = i < activeSession;
          const isActive = i === activeSession;
          const totalEx = s.exercises?.length || 0;
          const doneEx = s.exercises?.filter((_, ei) => getHistory(weekIdx, i, ei).length > 0).length || 0;
          const pct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;

          return (
            <div key={i} onClick={() => onSelect(i)} style={{
              flexShrink: 0, width: 128, padding: "16px 14px", borderRadius: 20, cursor: "pointer",
              background: isActive ? "rgba(255,255,255,0.04)" : isDone ? "rgba(2,209,186,0.04)" : "rgba(255,255,255,0.015)",
              border: isActive ? `2px solid ${GREEN}` : isDone ? "1px solid rgba(2,209,186,0.15)" : "1px solid rgba(255,255,255,0.04)",
              position: "relative", overflow: "hidden", transition: "all 0.2s ease",
            }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${isActive ? "rgba(2,209,186,0.15)" : "rgba(255,255,255,0.03)"} 0%, transparent 70%)` }} />
              <div style={{ fontSize: 8, color: isDone ? GREEN : isActive ? "rgba(2,209,186,0.7)" : "rgba(255,255,255,0.2)", letterSpacing: "1px", marginBottom: 8, fontWeight: 700 }}>
                {isDone ? "✓ COMPLETE" : isActive ? "AUJOURD HUI" : "A VENIR"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: isDone ? "rgba(255,255,255,0.6)" : isActive ? "#fff" : "rgba(255,255,255,0.3)", marginBottom: 3, letterSpacing: "-0.5px" }}>
                {s.name || `Seance ${i + 1}`}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 10 }}>{totalEx} exercices</div>
              <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
                <div style={{ height: "100%", width: pct + "%", background: GREEN, borderRadius: 1, transition: "width 0.5s ease" }} />
              </div>
              {isActive && pct > 0 && <div style={{ fontSize: 9, color: GREEN, marginTop: 5, fontWeight: 600 }}>{doneEx}/{totalEx} en cours</div>}
            </div>
          );
        })}

        {/* Bouton Reporter */}
        <div onClick={() => setShowOptions(true)} style={{
          flexShrink: 0, width: 88, padding: "16px 12px", borderRadius: 20, cursor: "pointer",
          background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            <polyline points="9 16 11 18 15 14"/>
          </svg>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.4 }}>Options</div>
        </div>
      </div>

      {/* Modal options imprevu */}
      {showOptions && (
        <div onClick={() => setShowOptions(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 20px calc(env(safe-area-inset-bottom,0px) + 24px)", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Options de seance</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM9 16l2 2 4-4", label: "Reporter", sub: "Au lendemain" },
                { icon: "M18 6L6 18M6 6l12 12", label: "Repos", sub: "Journee de repos" },
                { icon: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3", label: "Remplacer", sub: "Un exercice" },
                { icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", label: "Reordonner", sub: "Les exercices" },
              ].map(({ icon, label, sub }) => (
                <div key={label} onClick={() => setShowOptions(false)} style={{
                  padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, cursor: "pointer",
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20, marginBottom: 10 }}>
                    <path d={icon}/>
                  </svg>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>{sub}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowOptions(false)} style={{ width: "100%", padding: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionProgress({ session, weekIdx, sessionIdx, getHistory }) {
  const total = session.exercises?.length || 0;
  const done = session.exercises?.filter((_, ei) => getHistory(weekIdx, sessionIdx, ei).length > 0).length || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ padding: "0 20px", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
            {session.name || "Seance"} · En cours
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>
            {done} <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 300 }}>/ {total} exercices</span>
          </div>
        </div>
        {/* Anneau progression */}
        <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
            <circle cx="26" cy="26" r="21" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round"
              strokeDasharray="132" strokeDashoffset={132 - (132 * pct / 100)} transform="rotate(-90 26 26)"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}/>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: GREEN }}>{pct}%</div>
        </div>
      </div>
    </div>
  );
}

function RessentModal({ onClose, onSave, clientId, sessionName }) {
  const [selected, setSelected] = useState(null);
  const emojis = ["😤", "😐", "🙂", "💪", "🔥"];
  const labels = ["Difficile", "Correct", "Bien", "Fort", "Record"];

  const handleSave = async () => {
    if (!selected) return;
    await supabase.from("session_rpe").insert({
      client_id: clientId,
      session_name: sessionName,
      rpe: selected + 1,
      date: new Date().toISOString().split("T")[0],
    });
    onSave(selected);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "28px 20px calc(env(safe-area-inset-bottom,0px) + 28px)", width: "100%", maxWidth: 420 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-1px" }}>Seance terminee.</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Comment tu t es senti aujourd hui ?</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {emojis.map((e, i) => (
            <div key={i} onClick={() => setSelected(i)} style={{
              flex: 1, padding: "14px 0", borderRadius: 16, textAlign: "center", cursor: "pointer",
              background: selected === i ? G_DIM : "rgba(255,255,255,0.02)",
              border: `1.5px solid ${selected === i ? GREEN : "rgba(255,255,255,0.05)"}`,
              transition: "all 0.15s ease",
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{e}</div>
              <div style={{ fontSize: 8, color: selected === i ? GREEN : "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>{labels[i]}</div>
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={selected === null} style={{
          width: "100%", padding: 16, background: selected !== null ? GREEN : "rgba(255,255,255,0.05)",
          color: selected !== null ? "#000" : "rgba(255,255,255,0.2)", border: "none", borderRadius: 16,
          fontSize: 15, fontWeight: 700, cursor: selected !== null ? "pointer" : "not-allowed", transition: "all 0.2s",
        }}>
          Valider · +40 XP
        </button>
      </div>
    </div>
  );
}

export default function TrainingPage({
  client, programme, activeWeek, setActiveWeek, activeSession, setActiveSession,
  getHistory, getLatest, saveLog, getDelta,
}) {
  const [showRessenti, setShowRessenti] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [chrono, setChrono] = useState(0);
  const [chronoRunning, setChronoRunning] = useState(false);

  // Chrono demarre uniquement quand le client appuie sur "Commencer"
  useEffect(() => {
    if (!chronoRunning) return;
    const start = Date.now() - chrono * 1000;
    const id = setInterval(() => setChrono(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [chronoRunning]);

  const formatChrono = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Calcul progression globale
  // Stats live — calculees depuis les exercices completes
  const totalExSession = currentSession?.exercises?.length || 0;
  const seriesCompletees = (currentSession?.exercises || []).reduce((total, _, ei) => {
    const h = getHistory(activeWeek, activeSession, ei);
    return total + (h.length > 0 ? (currentSession.exercises[ei].sets || 1) : 0);
  }, 0) || 0;
  const volumeTotal = currentSession?.exercises?.reduce((total, ex, ei) => {
    const latest = getLatest(activeWeek, activeSession, ei);
    if (latest && getHistory(activeWeek, activeSession, ei).length > 0) {
      return total + (parseFloat(latest.weight) || 0) * (parseInt(ex.sets || 1)) * (parseInt(ex.reps || 1));
    }
    return total;
  }, 0) || 0;
  const progressionKg = currentSession?.exercises?.reduce((total, _, ei) => {
    const delta = getDelta(activeWeek, activeSession, ei);
    return total + (delta > 0 ? delta : 0);
  }, 0) || 0;

  const totalSessions = programme?.weeks?.reduce((a, w) => a + (w.sessions?.length || 0), 0) || 0;
  const doneSessions = activeWeek * (programme?.weeks?.[0]?.sessions?.length || 0) + activeSession;
  const globalPct = totalSessions > 0 ? Math.min(Math.round((doneSessions / totalSessions) * 100), 100) : 0;

  const currentWeek = programme?.weeks?.[activeWeek];
  const currentSession = currentWeek?.sessions?.[activeSession];

  // Calcul exercices completes dans la seance
  const totalEx = currentSession?.exercises?.length || 0;
  const doneEx = currentSession?.exercises?.filter((_, ei) => getHistory(activeWeek, activeSession, ei).length > 0).length || 0;
  const sessionPct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;

  // Bilan seance — envoyer rapport au coach
  const handleBilan = async () => {
    if (!client?.id) return;
    // Log dans session_logs
    await supabase.from("session_logs").insert({
      client_id: client.id,
      session_name: currentSession?.name || "Seance",
      programme_name: programme?.name || "Programme",
      logged_at: new Date().toISOString(),
    });
    // Vibration
    if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 150]);
    setShowRessenti(true);
  };

  if (!programme || !currentWeek || !currentSession) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Aucun programme charge</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: 120 }}>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "35%", background: "radial-gradient(ellipse at 30% 0%, rgba(2,209,186,0.1) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}
        <div style={{ padding: "20px 20px 16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, rgba(2,209,186,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header avec chrono */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6 }}>Programme</div>
                <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-2.5px", lineHeight: 0.9, marginBottom: 8 }}>
                  Train<span style={{ color: GREEN }}>.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{programme.name}</div>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
                  <div style={{ fontSize: 13, color: GREEN, fontWeight: 600 }}>S{activeWeek + 1}</div>
                </div>
              </div>
              {/* Chrono ou bouton commencer */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {chronoRunning ? (
                  <>
                    <div style={{ fontSize: 36, fontWeight: 100, color: "#fff", letterSpacing: "-2px", lineHeight: 1 }}>
                      {formatChrono(chrono).split(":")[0]}<span style={{ fontSize: 18, color: "rgba(255,255,255,0.3)" }}>:{formatChrono(chrono).split(":")[1]}</span>
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 3 }}>Chrono</div>
                  </>
                ) : (
                  <button onClick={() => setChronoRunning(true)} style={{
                    background: GREEN, color: "#000", border: "none", borderRadius: 100,
                    padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}>▶ Commencer</button>
                )}
              </div>
            </div>

            {/* Stats live - uniquement quand seance commencee */}
            {chronoRunning && <div style={{ display: "flex", gap: 20, marginBottom: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 200, color: "#fff", letterSpacing: "-1px", lineHeight: 1 }}>
                  {Math.round(volumeTotal)}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>kg</span>
                </div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 3 }}>Volume</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 200, color: GREEN, letterSpacing: "-1px", lineHeight: 1 }}>
                  {seriesCompletees}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>series</span>
                </div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 3 }}>Completees</div>
              </div>
              {progressionKg > 0 && (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 200, color: "#fbbf24", letterSpacing: "-1px", lineHeight: 1 }}>
                    +{progressionKg.toFixed(1)}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>kg</span>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 3 }}>Progression</div>
                </div>
              )}
            </div>}

            {/* Progress global */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase" }}>Momentum</div>
              <div style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>{doneSessions}/{totalSessions} seances</div>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", width: globalPct + "%", background: `linear-gradient(90deg, ${GREEN}, rgba(2,209,186,0.5))`, borderRadius: 1, transition: "width 0.6s ease" }} />
            </div>
          </div>
        </div>

        {/* SEMAINES */}
        <WeekSelector weeks={programme.weeks} activeWeek={activeWeek} onSelect={setActiveWeek} />

        {/* SEANCES */}
        <SessionCards
          sessions={currentWeek.sessions}
          activeSession={activeSession}
          onSelect={setActiveSession}
          weekIdx={activeWeek}
          getHistory={getHistory}
        />

        {/* DIVIDER */}
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(2,209,186,0.4) 0%, rgba(255,255,255,0.03) 100%)", margin: "0 20px 18px" }} />

        {/* PROGRESSION SEANCE */}
        <SessionProgress session={currentSession} weekIdx={activeWeek} sessionIdx={activeSession} getHistory={getHistory} />

        {/* FANTOME — info semaine precedente */}
        {activeWeek > 0 && (
          <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
              Fantome S{activeWeek} — Compare tes charges avec la semaine derniere
            </div>
          </div>
        )}

        {/* EXERCICES */}
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>
            Exercices
          </div>

          {currentSession.exercises?.map((ex, ei) => {
            const history = getHistory(activeWeek, activeSession, ei);
            const status = getProgressStatus(history);
            const isDone = history.length > 0;
            const isActive = !isDone && (ei === 0 || getHistory(activeWeek, activeSession, ei - 1).length > 0);

            // Le Fantome — donnees semaine precedente
            const ghostData = activeWeek > 0 ? getLatest(activeWeek - 1, activeSession, ei) : null;

            // Couleur bande selon Intelligence de Progression
            const bandColor = isDone ? "#02d1ba" : status === "green" ? "rgba(2,209,186,0.5)" : status === "yellow" ? "rgba(251,191,36,0.5)" : status === "red" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)";

            return (
              <div key={ei} style={{ marginBottom: 10, opacity: (!isDone && !isActive) ? 0.4 : 1, transition: "opacity 0.3s" }}>
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
                  nextExName={currentSession.exercises?.[ei + 1]?.name}
                  ghostData={ghostData}
                  bandColor={bandColor}
                />
              </div>
            );
          })}
        </div>

        {/* BOUTON BILAN */}
        <div style={{ padding: "20px 20px 0" }}>
          <div onClick={handleBilan} style={{
            padding: "20px", background: G_DIM, border: `1px solid ${G_BORDER}`,
            borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
            transition: "all 0.2s ease",
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: GREEN, letterSpacing: "-0.5px" }}>Terminer la seance</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                {sessionPct === 100 ? "Toutes les series completees · " : `${doneEx}/${totalEx} exercices · `}+40 XP
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" style={{ width: 18, height: 18 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL RESSENTI */}
      {showRessenti && (
        <RessentModal
          onClose={() => setShowRessenti(false)}
          onSave={() => setSessionDone(true)}
          clientId={client?.id}
          sessionName={currentSession?.name}
        />
      )}

    </div>
  );
}
