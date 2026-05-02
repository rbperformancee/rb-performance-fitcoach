import React, { useState, useRef } from "react";
import { Sparkline } from "./Sparkline";
import { RestTimer, parseRestSeconds } from "./RestTimer";
import haptic from "../lib/haptic";
import { useT, getLocale } from "../lib/i18n";
import { findVideo } from "../data/exerciseVideos";
import { findFallbackVideo } from "../data/fallbackVideos";

const GREEN = "#02d1ba";
const GREEN_DIM = "rgba(2,209,186,0.12)";

// Style global injecte une seule fois : placeholder REPS tres dim + italic
// pour eviter qu il ressemble a une valeur tapee (ex. "8-10").
if (typeof document !== "undefined" && !document.getElementById("rb-reps-input-style")) {
  const _st = document.createElement("style");
  _st.id = "rb-reps-input-style";
  _st.textContent = `
    .rb-reps-input::placeholder { color: rgba(255,255,255,0.15) !important; font-style: italic; font-weight: 200; }
    .rb-reps-input::-webkit-input-placeholder { color: rgba(255,255,255,0.15) !important; font-style: italic; font-weight: 200; }
  `;
  document.head.appendChild(_st);
}

const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

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

// Extrait un timestamp (?t=Xs ou ?t=X ou ?start=X) d'une URL YouTube.
// Retourne le nombre de secondes ou null. Supporte les formats "1m30s",
// "90s", "90" — convertit tout en secondes.
function ytStart(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const raw = u.searchParams.get("t") || u.searchParams.get("start");
    if (!raw) return null;
    // Format "1m30s" → 90s
    const m = String(raw).match(/^(?:(\d+)m)?(?:(\d+)s?)?$/);
    if (m) {
      const minutes = parseInt(m[1] || "0", 10);
      const seconds = parseInt(m[2] || "0", 10);
      const total = minutes * 60 + seconds;
      return total > 0 ? total : null;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
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
      loading="lazy"
      decoding="async"
      onError={() => idx < srcs.length - 1 && setIdx(i => i + 1)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function VideoCard({ vidUrl, thumbUrl, exName }) {
  const [playing, setPlaying] = useState(false);
  const id = ytId(vidUrl);
  const start = ytStart(vidUrl);
  if (playing && id) {
    // Si l'URL contient un timestamp (?t=Xs), on l'ajoute au param `start`
    // de l'iframe pour ouvrir la vidéo au bon moment (ex: chapitre dans
    // une vidéo compilation).
    const startParam = start ? `&start=${start}` : "";
    return (
      <div style={{ borderRadius: 14, overflow: "hidden", background: "#000", margin: "0 0 12px", position: "relative" }}>
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1${startParam}`}
          style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
          allow="autoplay; encrypted-media; fullscreen" allowFullScreen
        />
        <button onClick={() => setPlaying(false)} style={{
          position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none",
          borderRadius: "50%", width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      </div>
    );
  }
  // Video HTML5 pour les URLs non-YouTube (mp4, webm, etc.)
  if (playing && !id && vidUrl) {
    return (
      <div style={{ borderRadius: 14, overflow: "hidden", background: "#000", margin: "0 0 12px", position: "relative" }}>
        <video src={vidUrl} controls autoPlay playsInline style={{ width: "100%", aspectRatio: "16/9", display: "block" }} />
        <button onClick={() => setPlaying(false)} style={{
          position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none",
          borderRadius: "50%", width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      </div>
    );
  }
  return (
    <button onClick={() => vidUrl ? setPlaying(true) : null} style={{
      display: "block", width: "100%", position: "relative", borderRadius: 14, overflow: "hidden",
      background: "#050505", cursor: "pointer", border: "none", padding: 0, aspectRatio: "16/9", margin: "0 0 12px",
    }}>
      {(id || thumbUrl) && <ThumbWithFallback id={id} thumbUrl={thumbUrl} alt={exName} />}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 52, height: 52, background: "rgba(2,209,186,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" fill="#050505" style={{ width: 20, height: 20, marginLeft: 3 }}><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </button>
  );
}

function SetRow({ index, done, defaultW, defaultR, placeholder, onDone, isActive }) {
  const [w, setW] = useState(defaultW || "");
  const [r, setR] = useState(defaultR || "");
  const validate = () => {
    // Bloque la validation si la serie n est pas done OU si ce n est PAS la serie active.
    // Garantit l ordre sequentiel : on ne peut pas "sauter" une serie pour valider l exo.
    if (!w || done || !isActive) return;
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
    onDone(w, r, index);
  };

  const opacity = done ? 1 : isActive ? 1 : 0.2;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px", gap: 8, marginBottom: 10, alignItems: "center", opacity, transition: "opacity 0.3s" }}>
      <div style={{ textAlign: "center" }}>
        {done ? (
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: GREEN, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="3" strokeLinecap="round" style={{ width: 11, height: 11 }}><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)" }}>{index + 1}</span>
        )}
      </div>
      <input type="number" inputMode="decimal" value={w} onChange={e => setW(e.target.value)} disabled={done} placeholder="0"
        onKeyDown={e => e.key === "Enter" && validate()}
        style={{
          background: done ? "rgba(2,209,186,0.06)" : isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
          border: `${done ? 1 : isActive ? 2 : 1}px solid ${done ? "rgba(2,209,186,0.15)" : isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)"}`,
          borderRadius: 14, padding: "16px 8px", textAlign: "center",
          fontSize: 28, fontWeight: 100, color: done ? GREEN : isActive ? "#fff" : "rgba(255,255,255,0.1)",
          letterSpacing: "-1.5px", outline: "none", fontFamily: "-apple-system,Inter,sans-serif",
          width: "100%", boxSizing: "border-box",
        }}
      />
      <input type="text" value={r} onChange={e => setR(e.target.value)} disabled={done} placeholder={placeholder || "—"}
        className="rb-reps-input"
        onKeyDown={e => e.key === "Enter" && validate()}
        style={{
          background: done ? "rgba(2,209,186,0.06)" : isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
          border: `${done ? 1 : isActive ? 2 : 1}px solid ${done ? "rgba(2,209,186,0.15)" : isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)"}`,
          borderRadius: 14, padding: "16px 8px", textAlign: "center",
          fontSize: 28, fontWeight: 100, color: done ? GREEN : isActive ? "#fff" : "rgba(255,255,255,0.1)",
          letterSpacing: "-1.5px", outline: "none", fontFamily: "-apple-system,Inter,sans-serif",
          width: "100%", boxSizing: "border-box",
        }}
      />
      <button onClick={validate} disabled={done || !w} style={{
        width: 48, height: 48, borderRadius: 14, border: "none", cursor: done || !w ? "not-allowed" : "pointer",
        background: done ? "rgba(2,209,186,0.08)" : w ? GREEN : "rgba(255,255,255,0.03)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        transition: "all 0.2s", transform: done ? "scale(0.95)" : "scale(1)",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={done ? GREEN : w ? "#050505" : "rgba(255,255,255,0.08)"} strokeWidth="3" strokeLinecap="round" style={{ width: 16, height: 16 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>
  );
}

export function ExerciseCard({ ex, weekIdx, sessionIdx, exIdx, globalIndex, getHistory, getLatest, saveLog, getDelta, nextExName, ghostData, bandColor, isActive }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const storageKey = "sets_done_" + weekIdx + "_" + sessionIdx + "_" + exIdx + "_" + today;
  const [resetKey, setResetKey] = useState(0);
  const [doneCount, setDoneCount] = useState(() => {
    try { return parseInt(localStorage.getItem(storageKey) || "0"); } catch { return 0; }
  });
  const completedSetsRef = useRef([]);
  const history = getHistory(weekIdx, sessionIdx, exIdx);
  const latest = getLatest(weekIdx, sessionIdx, exIdx);
  const delta = getDelta(weekIdx, sessionIdx, exIdx);

  // Extraire le nombre de series — depuis ex.sets, ou depuis rawReps "3x5", ou fallback 1
  const parsedSets = (() => {
    if (typeof ex.sets === "number" && ex.sets > 0) return ex.sets;
    if (ex.rawReps) {
      const m = ex.rawReps.match(/^(\d+)\s*[xX×]/);
      if (m) return parseInt(m[1], 10);
    }
    return 1;
  })();
  const allDone = doneCount >= parsedSets && doneCount > 0;
  const deltaPos = delta !== null && delta > 0;
  const deltaNeg = delta !== null && delta < 0;
  // Cascade fallback :
  //   1. ex.vidUrl explicite (programme HTML)
  //   2. findVideo() — lib perso Rayan (EXERCISE_VIDEOS)
  //   3. findFallbackVideo() — créateurs externes (FALLBACK_VIDEOS), avec attribution
  const fallbackHit = !ex.vidUrl && !findVideo(ex.name) ? findFallbackVideo(ex.name) : null;
  const effectiveVidUrl = ex.vidUrl || findVideo(ex.name) || (fallbackHit && fallbackHit.url) || null;
  const fallbackCreator = fallbackHit ? fallbackHit.creator : null;
  const hasVideo = !!effectiveVidUrl;
  const chipsReps = ex.rawReps || (ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.reps) || null;
  const restSecs = parseRestSeconds(ex.rest);
  const setsCount = parsedSets;

  // Calcul du volume de l exercice
  const volume = completedSetsRef.current.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);

  const handleSetDone = (weight, reps, idx) => {
    completedSetsRef.current = [...completedSetsRef.current, { weight, reps, index: idx }];
    const n = completedSetsRef.current.length;
    setDoneCount(n);
    try { localStorage.setItem(storageKey, String(n)); } catch {}
    haptic.medium(); // Set valide
    if (n >= setsCount) {
      const avg = completedSetsRef.current.reduce((a, s) => a + (parseFloat(s.weight) || 0), 0) / n;
      saveLog(weekIdx, sessionIdx, exIdx, avg, completedSetsRef.current[n - 1].reps, completedSetsRef.current);
      haptic.success(); // Exercice termine
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

  // DESIGN : exercice a venir (pas encore actif, pas complete)
  // L exercice est "ouvert/actif" SI :
  //   - le parent l a marque comme actif (premier exercice non-complete de la liste), OU
  //   - l utilisateur a deja commence a logger des series dessus.
  const isNextActive = (isActive === true) || (doneCount > 0 && !allDone);
  // Si pas fait et pas le prochain actif -> bande coloree fermee
  if (!allDone && !isNextActive) {
    const bc = bandColor || "rgba(255,255,255,0.15)";
    return (
      <>
        {showTimer && restSecs && <RestTimer restSeconds={restSecs} exName={nextExName} onDismiss={() => setShowTimer(false)} />}
        <div style={{ marginBottom: 8 }} onClick={() => setExpanded(v => !v)}>
          <div style={{ display: "flex", alignItems: "stretch", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
            <div style={{ width: 5, background: bc, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", width: 22, flexShrink: 0 }}>{String(globalIndex + 1).padStart(2, "0")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "-0.3px" }}>{ex.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 3 }}>{chipsReps}{ex.rest ? ` · ⏱ ${ex.rest}` : ""}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: bc, flexShrink: 0 }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // DESIGN : exercice ferme (complete ou a venir)
  if (allDone) {
    return (
      <>
        {showTimer && restSecs && <RestTimer restSeconds={restSecs} exName={nextExName} onDismiss={() => setShowTimer(false)} />}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "stretch", borderRadius: 18, overflow: "hidden", background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.12)", cursor: "pointer" }}
            onClick={() => setExpanded(v => !v)}>
            <div style={{ width: 5, background: GREEN, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="3" strokeLinecap="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "-0.3px" }}>{ex.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  {latest && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{latest.weight} kg · {chipsReps}</span>}
                  {deltaPos && <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, background: "rgba(2,209,186,0.08)", padding: "2px 8px", borderRadius: 100 }}>+{delta?.toFixed(1)} kg</span>}
                  {deltaNeg && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: 100 }}>{delta?.toFixed(1)} kg</span>}
                </div>
              </div>
              {volume > 0 && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 200, color: "rgba(2,209,186,0.5)", letterSpacing: "-0.5px" }}>{Math.round(volume)}<span style={{ fontSize: 9 }}>kg</span></div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", letterSpacing: "1px" }}>VOLUME</div>
                </div>
              )}
            </div>
          </div>
          {/* Historique expandable */}
          {expanded && history.length > 0 && (
            <div style={{ margin: "6px 0 0", padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>{t("ec.history")}</div>
              {[...history].reverse().slice(0, 5).map((entry, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{new Date(entry.date).toLocaleDateString(intlLocale(), { day: "2-digit", month: "short" })}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{entry.weight} kg</span>
                  {entry.reps && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>× {entry.reps}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // DESIGN : exercice actif ouvert
  return (
    <>
      {showTimer && restSecs && <RestTimer restSeconds={restSecs} exName={nextExName} onDismiss={() => setShowTimer(false)} />}

      <div style={{ marginBottom: 8, borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "2px solid #02d1ba" }}>

        {/* Header exercice actif */}
        <div style={{ padding: "20px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: GREEN, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                {fillTpl(t("ec.active_badge"), { n: String(globalIndex + 1).padStart(2, "0") })}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 10 }}>{ex.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {chipsReps && <span style={{ fontSize: 11, color: "rgba(2,209,186,0.8)", background: "rgba(2,209,186,0.08)", padding: "5px 12px", borderRadius: 100, fontWeight: 600 }}>{chipsReps}</span>}
                {ex.rest && <span onClick={() => restSecs && setShowTimer(true)} style={{ fontSize: 11, color: "rgba(255,165,0,0.7)", background: "rgba(255,165,0,0.07)", padding: "5px 12px", borderRadius: 100, cursor: restSecs ? "pointer" : "default" }}>⏱ {ex.rest}</span>}
                {ex.tempo && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", padding: "5px 12px", borderRadius: 100 }}>{ex.tempo}</span>}
                {ex.rir != null && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", padding: "5px 12px", borderRadius: 100 }}>RIR {ex.rir}</span>}
                {hasVideo && <button onClick={() => setShowVideo(v => !v)} style={{ fontSize: 11, color: GREEN, background: "rgba(2,209,186,0.07)", border: "1px solid rgba(2,209,186,0.2)", padding: "5px 12px", borderRadius: 100, cursor: "pointer" }}>{showVideo ? t("ec.video_close") : t("ec.video_play")}</button>}
                {!hasVideo && <span title={t("ec.video_soon_tooltip") || "Vidéo perso bientôt — je tourne au fil de l'eau."} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", padding: "5px 12px", borderRadius: 100, cursor: "default", fontStyle: "italic" }}>{t("ec.video_soon") || "📷 Vidéo bientôt"}</span>}
              </div>
            </div>
            {/* Anneau de serie */}
            <div style={{ flexShrink: 0, textAlign: "center" }}>
              <div style={{ position: "relative", width: 56, height: 56 }}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
                  <circle cx="28" cy="28" r="22" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray="138" strokeDashoffset={138 - (138 * doneCount / setsCount)}
                    transform="rotate(-90 28 28)" style={{ transition: "stroke-dashoffset 0.4s ease" }}/>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: GREEN, lineHeight: 1 }}>{doneCount}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>/{setsCount}</div>
                </div>
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 4, letterSpacing: "1px" }}>{t("ec.serie")}</div>
            </div>
          </div>

          {/* Video */}
          {hasVideo && showVideo && (
            <div>
              <VideoCard vidUrl={effectiveVidUrl} thumbUrl={ex.thumbUrl} exName={ex.name} />
              {fallbackCreator ? (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textAlign: "right", marginTop: -8, marginBottom: 12, fontStyle: "italic", letterSpacing: 0.3 }}>
                  Démo externe · {fallbackCreator}
                </div>
              ) : null}
            </div>
          )}

          {/* Fantome semaine precedente */}
          {ghostData && (
            <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "1px", textTransform: "uppercase" }}>{t("ec.ghost_label")}</div>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic", fontWeight: 200 }}>
                {ghostData.weight} kg × {ghostData.reps}
              </div>
            </div>
          )}
        </div>

        {/* Series */}
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px", gap: 8, marginBottom: 10, padding: "0 2px" }}>
            <div></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", letterSpacing: "2px", textTransform: "uppercase" }}>{t("ec.weight_col")}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", letterSpacing: "2px", textTransform: "uppercase" }}>
              {t("ec.reps_col")}{ex.reps ? <span style={{ color: "rgba(2,209,186,0.5)", marginLeft: 4, textTransform: "none", letterSpacing: 0 }}>· {ex.reps}</span> : null}
            </div>
            <div></div>
          </div>
          {Array.from({ length: setsCount }, (_, i) => (
            <SetRow
              key={resetKey + "-" + i}
              index={i}
              done={i < doneCount}
              isActive={i === doneCount}
              defaultW={latest?.sets?.[i]?.weight ?? (latest?.weight ? String(latest.weight) : "")}
              defaultR={(() => {
                // N injecter une defaultR que si c est une vraie valeur numerique loggee.
                // Les fourchettes type "8-10" venaient du fallback ex.reps -> pollution DB.
                const r = latest?.sets?.[i]?.reps;
                if (r == null || r === "") return "";
                if (/^\d+$/.test(String(r).trim())) return String(r);
                return "";
              })()}
              placeholder={ex.reps || "—"}
              onDone={handleSetDone}
            />
          ))}
          {doneCount > 0 && doneCount < setsCount && (
            <button onClick={handleReset} style={{ width: "100%", marginTop: 4, padding: "8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer" }}>{t("ec.restart")}</button>
          )}
        </div>

        {/* Footer — Timer + Intelligence progression */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "14px 16px", display: "flex", gap: 10 }}>
          {ex.rest && (
            <div onClick={() => restSecs && setShowTimer(true)} style={{ flex: 1, padding: "10px 14px", background: "rgba(255,165,0,0.04)", border: "1px solid rgba(255,165,0,0.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: restSecs ? "pointer" : "default" }}>
              <div style={{ fontSize: 9, color: "rgba(255,165,0,0.4)", letterSpacing: "1px", textTransform: "uppercase" }}>{t("ec.rest_label")}</div>
              <div style={{ fontSize: 18, fontWeight: 100, color: "rgba(255,165,0,0.6)", letterSpacing: "-1px" }}>{ex.rest}</div>
            </div>
          )}
          {history.length >= 2 && (
            <div style={{ flex: 1, padding: "10px 14px", background: "rgba(2,209,186,0.03)", border: "1px solid rgba(2,209,186,0.08)", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: delta > 0 ? GREEN : delta < 0 ? "#ef4444" : "#fbbf24", flexShrink: 0 }} />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1.3 }}>
                {delta > 0 ? fillTpl(t("ec.delta_up"), { v: delta?.toFixed(1) }) : delta < 0 ? fillTpl(t("ec.delta_down"), { v: delta?.toFixed(1) }) : t("ec.delta_stable")}
              </div>
              {history.length >= 2 && <div style={{ marginLeft: "auto" }}><Sparkline data={history} width={48} height={16}/></div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
