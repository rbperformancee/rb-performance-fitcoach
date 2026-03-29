import React, { useState } from "react";
import { Sparkline } from "./Sparkline";
import { RestTimer, parseRestSeconds } from "./RestTimer";

const GREEN = "#02d1ba";
const GREEN_DIM = "rgba(2,209,186,0.12)";

function ytId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
      if (u.pathname.includes("/embed/"))  return u.pathname.split("/embed/")[1].split("?")[0];
      return u.searchParams.get("v");
    }
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
  } catch {}
  return null;
}

function ThumbWithFallback({ id, thumbUrl, alt }) {
  const [idx, setIdx] = useState(0);
  const srcs = [
    ...(thumbUrl ? [thumbUrl] : []),
    ...(id ? [
      `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${id}/sddefault.jpg`,
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    ] : []),
  ];
  if (!srcs.length) return null;
  return (
    <img src={srcs[idx]} alt={alt}
      onError={() => idx < srcs.length - 1 && setIdx(i => i + 1)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function VideoCard({ vidUrl, thumbUrl, exName }) {
  const [playing, setPlaying] = useState(false);
  const id = ytId(vidUrl);

  if (playing && id) {
    return (
      <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", position: "relative" }}>
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
          allow="autoplay; encrypted-media; fullscreen" allowFullScreen
        />
        <button onClick={() => setPlaying(false)} style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "50%", width: 30, height: 30, color: "#fff",
          fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => id ? setPlaying(true) : window.open(vidUrl, "_blank")}
      style={{
        display: "block", width: "100%", position: "relative",
        borderRadius: 12, overflow: "hidden", background: "#111",
        cursor: "pointer", border: "none", padding: 0, aspectRatio: "16/9",
      }}
    >
      {(id || thumbUrl) && <ThumbWithFallback id={id} thumbUrl={thumbUrl} alt={exName} />}
      {!id && !thumbUrl && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1c2820,#111)" }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 45%, transparent 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 54, height: 54, background: "rgba(2,209,186,0.92)", backdropFilter: "blur(4px)",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(2,209,186,0.45), 0 0 0 6px rgba(2,209,186,0.15)",
        }}>
          <svg viewBox="0 0 24 24" fill="#0d0d0d" style={{ width: 22, height: 22, marginLeft: 3 }}>
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: GREEN, marginBottom: 2 }}>Démonstration</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exName}</div>
        </div>
        <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(4px)" }}>
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 10, height: 10 }}><polygon points="4,2 12,8 4,14" fill="#fff"/></svg>
          Lancer
        </div>
      </div>
    </button>
  );
}

export function ExerciseCard({ ex, weekIdx, sessionIdx, exIdx, globalIndex, getHistory, getLatest, saveLog, getDelta, nextExName }) {
  const [expanded,   setExpanded]   = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showTimer,  setShowTimer]  = useState(false);

  const history = getHistory(weekIdx, sessionIdx, exIdx);
  const latest  = getLatest(weekIdx, sessionIdx, exIdx);
  const delta   = getDelta(weekIdx, sessionIdx, exIdx);

  const [inputWeight, setInputWeight] = useState(latest ? String(latest.weight) : "");
  const [inputReps,   setInputReps]   = useState(latest ? String(latest.reps || ex.reps || "") : "");

  // Synchroniser avec les données chargées
  React.useEffect(() => {
    if (latest) {
      setInputWeight(String(latest.weight || ""));
      setInputReps(String(latest.reps || ex.reps || ""));
    }
  }, [latest?.weight, latest?.reps]);

  const allDone  = history.length > 0;
  const deltaPos = delta !== null && delta > 0;
  const deltaNeg = delta !== null && delta < 0;
  const hasVideo = !!ex.vidUrl;
  const chipsReps = ex.rawReps || (ex.sets && ex.reps ? `${ex.sets}X${ex.reps}` : ex.reps) || null;
  const restSecs  = parseRestSeconds(ex.rest);

  const handleSave = () => {
    if (!inputWeight) return;
    saveLog(weekIdx, sessionIdx, exIdx, inputWeight, inputReps);
    setSaved(true);
    // Vibration
    if (navigator.vibrate) navigator.vibrate([30, 20, 60]);
    // Lancer le timer auto si repos configuré
    if (restSecs) {
      setTimeout(() => {
        setSaved(false);
        setShowTimer(true);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
      }, 600);
    } else {
      setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <>
      {/* ── Timer overlay ── */}
      {showTimer && restSecs && (
        <RestTimer
          restSeconds={restSecs}
          exName={nextExName}
          onDismiss={() => setShowTimer(false)}
        />
      )}

      <div className="ex-card" style={{
        borderColor: allDone ? "rgba(2,209,186,0.25)" : undefined,
        borderLeft: ex.group ? `3px solid ${GREEN}` : allDone ? `3px solid rgba(2,209,186,0.5)` : undefined,
      }}>
        {ex.group && <div className="ex-superset-badge">{ex.groupType || "Superset"} {ex.group}</div>}

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div className="ex-num" style={{ background: allDone ? GREEN_DIM : undefined }}>
            <span style={{ color: allDone ? GREEN : undefined }}>{String(globalIndex + 1).padStart(2, "0")}</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ex-name">{ex.name}</div>
            <div className="ex-meta">
              {chipsReps && <span className="ex-chip ex-chip-sets">{chipsReps}</span>}
              {ex.tempo   && <span className="ex-chip ex-chip-tempo">{ex.tempo}</span>}
              {ex.rir != null && <span className="ex-chip ex-chip-rir">RIR {ex.rir}</span>}
              {ex.rest    && (
                <span
                  className="ex-chip ex-chip-rest"
                  style={{ cursor: restSecs ? "pointer" : "default" }}
                  onClick={() => restSecs && setShowTimer(true)}
                  title={restSecs ? "Lancer le timer" : undefined}
                >
                  ⏱ {ex.rest}
                  {restSecs && <span style={{ marginLeft: 3, color: GREEN, fontSize: 9 }}>▶</span>}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {allDone && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: GREEN }}>✓</span>}

            {/* Bouton vidéo */}
            {hasVideo && (
              <button onClick={() => setShowVideo(v => !v)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px",
                background: showVideo ? "rgba(2,209,186,0.18)" : "rgba(2,209,186,0.08)",
                border: `1.5px solid ${showVideo ? "rgba(2,209,186,0.5)" : "rgba(2,209,186,0.25)"}`,
                borderRadius: 100, color: GREEN,
                fontSize: 10.5, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              }}>
                <svg viewBox="0 0 16 16" fill="none" style={{ width: 12, height: 12 }}>
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="#02d1ba" strokeWidth="1.5"/>
                  <polygon points="6,6 6,10 11,8" fill="#02d1ba"/>
                </svg>
                {showVideo ? "Masquer" : "Vidéo"}
              </button>
            )}

            {/* Timer manuel */}
            {restSecs && (
              <button onClick={() => setShowTimer(true)} style={{
                width: 28, height: 28, background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 7,
                color: "#555", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.15s",
              }} title="Lancer le timer de repos"
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(2,209,186,0.3)"; e.currentTarget.style.color = GREEN; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#555"; }}
              >
                <svg viewBox="0 0 20 20" fill="none" style={{ width: 12, height: 12 }}>
                  <circle cx="10" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
                  <line x1="10" y1="11" x2="10" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="10" y1="11" x2="13" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="7.5" y1="2" x2="12.5" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Chevron */}
            <button onClick={() => setExpanded(v => !v)} style={{
              width: 28, height: 28, background: "transparent",
              border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 7,
              color: "#555", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              <svg viewBox="0 0 20 20" fill="none"
                style={{ width: 12, height: 12, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                stroke="currentColor" strokeWidth="2.2">
                <polyline points="4 7 10 13 16 7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Vidéo ── */}
        {hasVideo && showVideo && <VideoCard vidUrl={ex.vidUrl} thumbUrl={ex.thumbUrl} exName={ex.name} />}

        {/* ── Saisie ── */}
        <div className="ex-log-row">
          <div className="ex-input-group">
            <label className="ex-input-label">Charge</label>
            <div className="ex-input-wrap">
              <input type="number" inputMode="decimal" className="ex-input"
                placeholder={latest ? String(latest.weight) : "0"}
                value={inputWeight} onChange={e => setInputWeight(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()} />
              <span className="ex-unit">kg</span>
            </div>
          </div>
          <div className="ex-input-group">
            <label className="ex-input-label">Reps réalisées</label>
            <div className="ex-input-wrap">
              <input type="text" className="ex-input"
                placeholder={ex.reps || chipsReps || "—"}
                value={inputReps} onChange={e => setInputReps(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()} />
            </div>
          </div>
          <button className={`ex-save-btn ${saved ? "saved" : ""}`} onClick={handleSave}>
            {saved ? (
              <svg viewBox="0 0 20 20" fill="none"><polyline points="4,10 8,14 16,6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none">
                <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* ── Progression ── */}
        {(latest || history.length > 0) && (
          <div className="ex-progress-row">
            <div className="ex-last">
              <span className="ex-last-label">Dernier</span>
              <span className="ex-last-val">{latest?.weight} kg</span>
              {delta !== null && (
                <span className={`ex-delta ${deltaPos ? "pos" : deltaNeg ? "neg" : "neu"}`}>
                  {deltaPos ? "+" : ""}{delta !== 0 ? delta.toFixed(1) + " kg" : "="}
                </span>
              )}
            </div>
            {history.length >= 2 && <div className="ex-spark"><Sparkline data={history} width={64} height={20}/></div>}
            <button className="ex-history-toggle" onClick={() => setExpanded(v => !v)}>
              {expanded ? "Fermer" : `${history.length} séance${history.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {/* ── Historique ── */}
        {expanded && history.length > 0 && (
          <div className="ex-history">
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: "1.5px", textTransform: "uppercase", color: "#555", marginBottom: 3 }}>Historique</p>
            {[...history].reverse().slice(0, 8).map((entry, i) => (
              <div key={i} className="ex-history-row">
                <span className="ex-history-date">{new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                <span className="ex-history-weight">{entry.weight} kg</span>
                {entry.reps && <span className="ex-history-reps">× {entry.reps}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
