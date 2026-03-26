import React, { useMemo } from "react";

const GREEN = "#02d1ba";

export function SessionReport({ session, weekIdx, sessionIdx, getHistory, onClose, onExportPDF }) {
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    let prs = [];
    let exercises = [];

    session.exercises.forEach((ex, ei) => {
      const history = getHistory(weekIdx, sessionIdx, ei);
      if (!history.length) return;
      const latest = history[history.length - 1];
      const prev = history.length >= 2 ? history[history.length - 2] : null;
      const setsN = ex.sets || 3;
      const vol = (latest.weight || 0) * setsN;

      totalVolume += vol;
      totalSets += setsN;

      const isPR = history.length === 1 || (prev && latest.weight > prev.weight);
      if (isPR && history.length > 1) prs.push(ex.name);

      exercises.push({
        name: ex.name,
        weight: latest.weight,
        reps: latest.reps || ex.reps,
        sets: setsN,
        delta: prev ? latest.weight - prev.weight : null,
        isPR: history.length > 1 && (prev && latest.weight > prev.weight),
      });
    });

    return { totalVolume, totalSets, prs, exercises, exDone: exercises.length, exTotal: session.exercises.length };
  }, [session, weekIdx, sessionIdx, getHistory]);

  const completion = stats.exTotal > 0 ? Math.round((stats.exDone / stats.exTotal) * 100) : 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 998,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      overflowY: "auto", padding: "32px 20px 40px",
      animation: "fadeIn 0.3s ease",
    }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: GREEN, marginBottom: 4 }}>Bilan de séance</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f5f5f5", letterSpacing: "-0.4px" }}>{session.name}</div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 36, height: 36, color: "#888", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>

      {/* Stats principales */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Volume total", value: stats.totalVolume > 1000 ? `${(stats.totalVolume/1000).toFixed(1)}t` : `${stats.totalVolume} kg`, sub: "levé cette séance" },
          { label: "Complétion", value: `${completion}%`, sub: `${stats.exDone} / ${stats.exTotal} exercices` },
          { label: "Séries", value: stats.totalSets, sub: "séries effectuées" },
          { label: "Records", value: stats.prs.length, sub: stats.prs.length > 0 ? "PR battus 🔥" : "continue comme ça" },
        ].map((s, i) => (
          <div key={i} style={{
            background: "#141414",
            border: `1px solid ${i === 3 && stats.prs.length > 0 ? "rgba(2,209,186,0.3)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 12, padding: "14px 12px",
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#555", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: i === 3 && stats.prs.length > 0 ? GREEN : "#f5f5f5", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* PRs */}
      {stats.prs.length > 0 && (
        <div style={{ background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: GREEN, marginBottom: 8 }}>🏆 Records battus</div>
          {stats.prs.map((name, i) => (
            <div key={i} style={{ fontSize: 12, color: "#f5f5f5", display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ color: GREEN, fontSize: 10 }}>▲</span>{name}
            </div>
          ))}
        </div>
      )}

      {/* Liste exercices */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#444", marginBottom: 10 }}>Détail exercices</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats.exercises.map((ex, i) => (
            <div key={i} style={{
              background: "#141414", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10, padding: "10px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f5f5f5", marginBottom: 2 }}>{ex.name}</div>
                <div style={{ fontSize: 10, color: "#555" }}>{ex.sets} × {ex.reps || "—"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {ex.delta !== null && (
                  <span style={{
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600,
                    padding: "2px 7px", borderRadius: 5,
                    background: ex.delta > 0 ? "rgba(2,209,186,0.12)" : ex.delta < 0 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                    color: ex.delta > 0 ? GREEN : ex.delta < 0 ? "#ef4444" : "#555",
                  }}>
                    {ex.delta > 0 ? "+" : ""}{ex.delta !== 0 ? ex.delta.toFixed(1) + " kg" : "="}
                  </span>
                )}
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 600, color: "#f5f5f5" }}>
                  {ex.weight} kg
                </div>
              </div>
            </div>
          ))}
          {stats.exDone < stats.exTotal && (
            <div style={{ fontSize: 11, color: "#444", textAlign: "center", padding: "6px 0" }}>
              {stats.exTotal - stats.exDone} exercice{stats.exTotal - stats.exDone > 1 ? "s" : ""} non enregistré{stats.exTotal - stats.exDone > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onExportPDF} style={{
          flex: 1, padding: "13px",
          background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)",
          borderRadius: 12, color: "#f5f5f5", fontSize: 12, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 14, height: 14 }}>
            <path d="M10 3v10M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="3" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Exporter PDF
        </button>
        <button onClick={onClose} style={{
          flex: 1.2, padding: "13px",
          background: GREEN, border: "none",
          borderRadius: 12, color: "#0d0d0d", fontSize: 12, fontWeight: 800,
          cursor: "pointer", boxShadow: "0 4px 20px rgba(2,209,186,0.35)",
        }}>
          Continuer 💪
        </button>
      </div>
    </div>
  );
}
