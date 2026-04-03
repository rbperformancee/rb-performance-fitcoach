import React, { useState, useRef } from "react";
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
          background: 'rgba(255,255,255,0.03)', border: "1px solid rgba(255,255,255,0.06)",
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
        borderRadius: 12, overflow: "hidden", background: "#050505",
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
          <svg viewBox="0 0 24 24" fill="#050505" style={{ width: 22, height: 22, marginLeft: 3 }}>
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: GREEN, marginBottom: 2 }}>Démonstration</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exName}</div>
        </div>
        <div style={{ flexShrink: 0, background: 'rgba(255,255,255,0.03)', border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(4px)" }}>
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 10, height: 10 }}><polygon points="4,2 12,8 4,14" fill="#fff"/></svg>
          Lancer
        </div>
      </div>
    </button>
  );
}


function SetInput({ index, done, defaultW, defaultR, placeholder, onDone }) {
  const [w, setW] = useState(defaultW || "");
  const [r, setR] = useState(defaultR || "");
  const validate = () => {
    if (!w || done) return;
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
    onDone(w, r, index);
  };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"22px 1fr 1fr 34px", gap:4, marginBottom:4, alignItems:"center", opacity: done ? 0.4 : 1, transition:"opacity 0.25s" }}>
      <div style={{ textAlign:"center", fontSize:11, fontWeight:700, color: done ? "#02d1ba" : "#555", fontFamily:"monospace", transition:"all 0.2s", transform: done ? "scale(1.2)" : "scale(1)" }}>{done ? "✓" : index+1}</div>
      <input type="number" inputMode="decimal" value={w} onChange={e => setW(e.target.value)} disabled={done} placeholder="0" onKeyDown={e => e.key==="Enter" && validate()}
        style={{ boxSizing:"border-box", background: done ? "rgba(2,209,186,0.06)" : "transparent", border: "1px solid " + (done ? "rgba(2,209,186,0.25)" : "rgba(255,255,255,0.1)"), borderRadius: 10, padding: "10px 6px", color: done ? "#02d1ba" : "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 300, fontFamily: "monospace", outline: "none", textAlign: "center", width: "100%" }} />
      <input type="text" value={r} onChange={e => setR(e.target.value)} disabled={done} placeholder={placeholder} onKeyDown={e => e.key==="Enter" && validate()}
        style={{ boxSizing:"border-box", background: done ? "rgba(2,209,186,0.06)" : "transparent", border: "1px solid " + (done ? "rgba(2,209,186,0.25)" : "rgba(255,255,255,0.1)"), borderRadius: 10, padding: "10px 6px", color: done ? "#02d1ba" : "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 300, fontFamily: "monospace", outline: "none", textAlign: "center", width: "100%" }} />
      <button onClick={validate} disabled={done || !w} style={{ width:34, height:34, borderRadius:9, border:"none", cursor: done||!w ? "not-allowed":"pointer", background: done?"rgba(2,209,186,0.12)":w?"#02d1ba":"rgba(255,255,255,0.06)", color: done?"#02d1ba":w?"#050505":"#555", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s", transform: done ? "scale(0.95)" : "scale(1)" }}>
        <svg viewBox="0 0 20 20" fill="none" style={{ width:13, height:13 }}><polyline points="4,10 8,14 16,6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

export function ExerciseCard({ ex, weekIdx, sessionIdx, exIdx, globalIndex, getHistory, getLatest, saveLog, getDelta, nextExName }) {
  const [expanded,   setExpanded]   = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showTimer,  setShowTimer]  = useState(false);


  const today = new Date().toISOString().slice(0, 10);
  const storageKey = 'sets_done_' + weekIdx + '_' + sessionIdx + '_' + exIdx + '_' + today;
  const [resetKey, setResetKey] = useState(0);
  const [doneCount, setDoneCount] = useState(() => {
    try { return parseInt(localStorage.getItem('sets_done_' + weekIdx + '_' + sessionIdx + '_' + exIdx + '_' + new Date().toISOString().slice(0,10)) || '0'); } catch { return 0; }
  });
  const completedSetsRef = useRef([]);
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

  const setsCount = (typeof ex.sets === 'number' && ex.sets > 0) ? ex.sets : 1;

  const handleSetDone = (weight, reps, idx) => {
    completedSetsRef.current = [...completedSetsRef.current, { weight, reps, index: idx }];
    const n = completedSetsRef.current.length;
    setDoneCount(n);
    try { localStorage.setItem(storageKey, String(n)); } catch {}
    if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
    if (n >= setsCount) {
      const avg = completedSetsRef.current.reduce((a, s) => a + (parseFloat(s.weight) || 0), 0) / n;
      saveLog(weekIdx, sessionIdx, exIdx, avg, completedSetsRef.current[n-1].reps, completedSetsRef.current);
      if (navigator.vibrate) navigator.vibrate([30, 20, 60]);
      if (restSecs) setTimeout(() => setShowTimer(true), 600);
    } else if (restSecs) {
      setTimeout(() => setShowTimer(true), 400);
    }
  };

  const handleReset = () => {
    completedSetsRef.current = [];
    setDoneCount(0);
    setResetKey(k => k + 1);
    try { localStorage.removeItem(storageKey); } catch {}
  };

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
      {showTimer && restSecs && (
        <RestTimer restSeconds={restSecs} exName={nextExName} onDismiss={() => setShowTimer(false)} />
      )}

      <div style={{
        marginBottom: 10,
        background: allDone ? "rgba(2,209,186,0.04)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${allDone ? "rgba(2,209,186,0.18)" : "rgba(255,255,255,0.07)"}`,
        borderLeft: `3px solid ${allDone ? GREEN : ex.group ? GREEN : "rgba(255,255,255,0.15)"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.25s ease",
      }}>
        {ex.group && (
          <div style={{ fontSize: 9, color: GREEN, letterSpacing: "1.5px", textTransform: "uppercase", padding: "6px 16px 0", fontWeight: 700 }}>
            {ex.groupType || "Superset"} {ex.group}
          </div>
        )}

        {/* HEADER */}
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? GREEN : "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                {allDone ? "✓" : String(globalIndex + 1).padStart(2, "0")}
              </span>
              <div style={{ fontSize: 15, fontWeight: 700, color: allDone ? "rgba(255,255,255,0.6)" : "#fff", letterSpacing: "-0.3px" }}>{ex.name}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {chipsReps && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 100 }}>{chipsReps}</span>
              )}
              {ex.tempo && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 100 }}>Tempo {ex.tempo}</span>
              )}
              {ex.rir != null && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 100 }}>RIR {ex.rir}</span>
              )}
              {ex.rest && (
                <span onClick={() => restSecs && setShowTimer(true)} style={{ fontSize: 11, color: restSecs ? GREEN : "rgba(255,255,255,0.3)", background: restSecs ? "rgba(2,209,186,0.08)" : "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 100, cursor: restSecs ? "pointer" : "default" }}>
                  ⏱ {ex.rest}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {hasVideo && (
              <button onClick={() => setShowVideo(v => !v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: showVideo ? "rgba(2,209,186,0.15)" : "rgba(2,209,186,0.07)", border: `1px solid ${showVideo ? "rgba(2,209,186,0.4)" : "rgba(2,209,186,0.2)"}`, borderRadius: 100, color: GREEN, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                <svg viewBox="0 0 16 16" fill="none" style={{ width: 10, height: 10 }}><rect x="1" y="3" width="14" height="10" rx="2" stroke="#02d1ba" strokeWidth="1.5"/><polygon points="6,6 6,10 11,8" fill="#02d1ba"/></svg>
                {showVideo ? "Fermer" : "Video"}
              </button>
            )}
            <button onClick={() => setExpanded(v => !v)} style={{ width: 30, height: 30, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 12, height: 12, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} stroke="currentColor" strokeWidth="2.2">
                <polyline points="4 7 10 13 16 7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Vidéo ── */}
        {hasVideo && showVideo && <VideoCard vidUrl={ex.vidUrl} thumbUrl={ex.thumbUrl} exName={ex.name} />}

        {/* GRILLE SERIES */}
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 34px", gap: 6, marginBottom: 8 }}>
            {["#", "kg", "Reps", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</div>
            ))}
          </div>
          {Array.from({ length: setsCount }, (_, i) => (
            <SetInput
              key={resetKey + "-" + i}
              index={i}
              done={i < doneCount}
              defaultW={latest?.sets?.[i]?.weight ?? (latest?.weight ? String(latest.weight) : "")}
              defaultR={latest?.sets?.[i]?.reps ?? (ex.reps || "")}
              placeholder={ex.reps || "—"}
              onDone={handleSetDone}
            />
          ))}
          {doneCount > 0 && doneCount < setsCount && (
            <button onClick={handleReset} style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer" }}>↺ Recommencer</button>
          )}
          {doneCount >= setsCount && setsCount > 0 && (
            <div style={{ textAlign: "center", marginTop: 8, padding: "8px", background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 10, fontSize: 12, color: GREEN, fontWeight: 700 }}>✓ Toutes les series completees !</div>
          )}
        </div>

        {/* PROGRESSION */}
        {(latest || history.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Dernier</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{latest?.weight} kg</span>
              {delta !== null && (
                <span style={{ fontSize: 11, fontWeight: 700, color: deltaPos ? GREEN : deltaNeg ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
                  {deltaPos ? "+" : ""}{delta !== 0 ? delta.toFixed(1) + " kg" : "="}
                </span>
              )}
            </div>
            {history.length >= 2 && <Sparkline data={history} width={56} height={18}/>}
            <button onClick={() => setExpanded(v => !v)} style={{ fontSize: 10, color: GREEN, background: "transparent", border: "none", cursor: "pointer", fontWeight: 600 }}>
              {expanded ? "Fermer" : `${history.length} seance${history.length > 1 ? "s" : ""}`}
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
