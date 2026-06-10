import React, { useState, useRef } from "react";
import { Sparkline } from "./Sparkline";
import { parseRestSeconds } from "./RestTimer";
import { useRestTimer } from "../lib/restTimer";
import haptic from "../lib/haptic";
import { useT, getLocale } from "../lib/i18n";
import { findVideo } from "../data/exerciseVideos";
import { findFallbackVideo } from "../data/fallbackVideos";
import { detectPletnev, detectPoliquin } from "../utils/parserProgramme";

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

/**
 * Détecte une notation composée dans les reps :
 *  - cluster / rest-pause : "5+5+5"  → un set = 3 mini-blocs au même poids,
 *    courte pause entre chaque (l'athlète logue chaque bloc).
 *  - dégressive / drop set : "10_10" → un set = 2 charges enchaînées sans
 *    repos, la charge descend (l'athlète logue chaque charge).
 * Retourne { type, segments: ["5","5","5"] } ou null.
 */
function parseCompound(reps) {
  const r = String(reps || "").trim();
  if (r.includes("+")) {
    const segs = r.split("+").map((s) => s.trim()).filter(Boolean);
    if (segs.length >= 2) return { type: "cluster", segments: segs };
  }
  if (r.includes("_")) {
    const segs = r.split("_").map((s) => s.trim()).filter(Boolean);
    if (segs.length >= 2) return { type: "degressive", segments: segs };
  }
  return null;
}

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

function SetRow({ index, done, defaultW, defaultR, currentW, currentR, placeholder, onDone, isActive }) {
  // Si la série a déjà été validée dans la session courante (currentW/R fournis
  // depuis le ref parent persisté en localStorage), on initialise avec ces
  // valeurs — sinon iOS qui kill le JS thread efface l'état React et la
  // série affiche "0" (placeholder) à la place du poids tapé.
  const initW = currentW != null && currentW !== "" ? String(currentW) : (defaultW || "");
  const initR = currentR != null && currentR !== "" ? String(currentR) : (defaultR || "");
  const [w, setW] = useState(initW);
  const [r, setR] = useState(initR);
  // Reps valides = nombre entier > 0. Évite que le client valide juste après
  // avoir saisi le poids (sans toucher reps), ce qui produisait des lignes
  // en DB avec reps=0 → coach voyait "⚠ reps non saisis" partout.
  const repsValid = /^\d+$/.test(String(r).trim()) && parseInt(r, 10) > 0;
  const canValidate = !!w && repsValid && !done && isActive;
  const validate = () => {
    if (!canValidate) return;
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
    onDone(w, r, index);
  };

  // Séries non-actives ni faites : on garde une lisibilité correcte (le user
  // a demandé que ça ne devienne pas "de plus en plus transparent").
  const opacity = done ? 1 : isActive ? 1 : 0.55;

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
      <input type="number" inputMode="numeric" pattern="[0-9]*" value={r} onChange={e => setR(e.target.value)} disabled={done} placeholder={placeholder || "—"}
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
      <button onClick={validate} disabled={!canValidate && !done} style={{
        width: 48, height: 48, borderRadius: 14, border: "none", cursor: canValidate || done ? "pointer" : "not-allowed",
        background: done ? "rgba(2,209,186,0.08)" : canValidate ? GREEN : "rgba(255,255,255,0.03)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        transition: "all 0.2s", transform: done ? "scale(0.95)" : "scale(1)",
      }} title={!canValidate && !done ? (w && !repsValid ? "Saisis le nombre de reps" : "Saisis le poids") : ""}>
        <svg viewBox="0 0 24 24" fill="none" stroke={done ? GREEN : canValidate ? "#050505" : "rgba(255,255,255,0.08)"} strokeWidth="3" strokeLinecap="round" style={{ width: 16, height: 16 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>
  );
}

/**
 * TempoExplainModal — décode un tempo de musculation (ex. "3010", "X010")
 * pour le client. La convention 4 chiffres = excentrique / pause basse /
 * concentrique / pause haute. "X" = explosif (vitesse max).
 */
function explainTempo(tempo) {
  const digits = String(tempo || "").trim().split("");
  if (digits.length < 3 || digits.length > 4) return null;
  const phases = [
    { label: "Phase négative", sub: "descente / étirement contrôlé" },
    { label: "Pause en bas", sub: "tension en position d'étirement" },
    { label: "Phase positive", sub: "remontée / contraction" },
    { label: "Pause en haut", sub: "tension en position de contraction" },
  ];
  return digits.map((d, i) => ({
    ...phases[i],
    digit: d,
    display: d.toUpperCase() === "X" ? "Explosif" : `${d} sec`,
  }));
}

function TempoExplainModal({ tempo, onClose }) {
  const phases = explainTempo(tempo);
  if (!phases) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500, padding: 20,
        background: "rgba(0,0,0,0.72)", WebkitBackdropFilter: "blur(6px)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "rbFade .2s ease",
      }}
    >
      <style>{`@keyframes rbFade{from{opacity:0}to{opacity:1}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 380, background: "#0c0c0c",
        border: `1px solid ${GREEN}33`, borderRadius: 18, overflow: "hidden",
      }}>
        <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.3em", color: GREEN, textTransform: "uppercase", marginBottom: 6 }}>Tempo · {tempo}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>
            Chaque chiffre = la durée en secondes d'une phase du mouvement.
          </div>
        </div>
        <div style={{ padding: "10px 14px 16px" }}>
          {phases.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: i < phases.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: `${GREEN}14`, border: `1px solid ${GREEN}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: GREEN, fontFamily: "'JetBrains Mono',monospace" }}>{p.digit}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.label}<span style={{ fontWeight: 500, color: "rgba(255,255,255,0.45)", marginLeft: 6 }}>· {p.display}</span></div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          width: "100%", padding: 14, background: "transparent",
          color: "rgba(255,255,255,0.55)", border: "none", borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          letterSpacing: ".03em",
        }}>Fermer</button>
      </div>
    </div>
  );
}

/**
 * CompoundSetRow — UI guidée pour un set cluster ou dégressif.
 * L'athlète saisit chaque bloc/charge ; une seule validation pour le set.
 */
function CompoundSetRow({ index, done, isActive, type, segments, currentEntry, defaultWeight, onDone, clusterRest }) {
  const isCluster = type === "cluster";
  const N = segments.length;

  const [segVals, setSegVals] = useState(() => {
    if (currentEntry && Array.isArray(currentEntry.segments) && currentEntry.segments.length === N) {
      return currentEntry.segments.map((s) => ({
        w: s.w != null && s.w !== "" ? String(s.w) : "",
        r: s.r != null && s.r !== "" ? String(s.r) : "",
      }));
    }
    const w0 = defaultWeight && Number(defaultWeight) > 0 ? String(defaultWeight) : "";
    return segments.map(() => ({ w: w0, r: "" }));
  });

  const setW = (i, val) => setSegVals((prev) =>
    // Cluster : poids identique sur tous les blocs → on propage.
    isCluster ? prev.map((s) => ({ ...s, w: val })) : prev.map((s, j) => (j === i ? { ...s, w: val } : s))
  );
  const setR = (i, val) => setSegVals((prev) => prev.map((s, j) => (j === i ? { ...s, r: val } : s)));

  const repsOk = segVals.every((s) => /^\d+$/.test(String(s.r).trim()) && parseInt(s.r, 10) > 0);
  const weightOk = isCluster
    ? !!String(segVals[0]?.w || "").trim()
    : segVals.every((s) => !!String(s.w).trim());
  const canValidate = repsOk && weightOk && !done && isActive;

  const validate = () => {
    if (!canValidate) return;
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
    const totalReps = segVals.reduce((a, s) => a + (parseInt(s.r, 10) || 0), 0);
    onDone(String(segVals[0]?.w || ""), String(totalReps), index,
      segVals.map((s) => ({ w: s.w, r: s.r })));
  };

  const opacity = done ? 1 : isActive ? 1 : 0.55;
  const accent = type === "degressive" ? "#f59e0b" : GREEN;
  const accentDim = type === "degressive" ? "rgba(245,158,11,0.12)" : GREEN_DIM;
  const label = isCluster ? "Cluster" : "Dégressive";
  const hint = isCluster
    ? (clusterRest ? `Repos ${clusterRest} entre chaque bloc, même charge` : "Repos court entre les blocs, même charge")
    : "Enchaîné sans repos, la charge descend";

  const inStyle = {
    background: done ? "rgba(2,209,186,0.06)" : "rgba(255,255,255,0.08)",
    border: `${done ? 1 : 2}px solid ${done ? "rgba(2,209,186,0.15)" : "rgba(255,255,255,0.13)"}`,
    borderRadius: 12, padding: "11px 6px", textAlign: "center",
    fontSize: 22, fontWeight: 100, color: done ? GREEN : "#fff",
    letterSpacing: "-1px", outline: "none", fontFamily: "-apple-system,Inter,sans-serif",
    width: "100%", boxSizing: "border-box",
  };
  const colLabel = { fontSize: 8, color: "rgba(255,255,255,0.22)", textAlign: "center", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 };

  return (
    <div style={{
      marginBottom: 10, padding: 12, borderRadius: 16, opacity, transition: "opacity 0.3s",
      background: done ? "rgba(2,209,186,0.04)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${done ? "rgba(2,209,186,0.14)" : isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
    }}>
      {/* Header set */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {done ? (
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="3" strokeLinecap="round" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: accentDim, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{index + 1}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 1, textTransform: "uppercase" }}>{label} · {N} {isCluster ? "blocs" : "charges"}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{hint}</div>
        </div>
        <button onClick={validate} disabled={!canValidate && !done} style={{
          width: 40, height: 40, borderRadius: 12, border: "none", flexShrink: 0,
          cursor: canValidate || done ? "pointer" : "not-allowed",
          background: done ? "rgba(2,209,186,0.08)" : canValidate ? GREEN : "rgba(255,255,255,0.03)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={done ? GREEN : canValidate ? "#050505" : "rgba(255,255,255,0.08)"} strokeWidth="3" strokeLinecap="round" style={{ width: 15, height: 15 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>

      {isCluster ? (
        <>
          {/* Poids partagé */}
          <div style={{ marginBottom: 10 }}>
            <div style={colLabel}>Charge (kg)</div>
            <input type="number" inputMode="decimal" value={segVals[0]?.w || ""} disabled={done}
              onChange={(e) => setW(0, e.target.value)} placeholder="0" style={inStyle} />
          </div>
          {/* Reps par bloc */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 6 }}>
            {segVals.map((s, i) => (
              <div key={i}>
                <div style={colLabel}>Bloc {i + 1} · {segments[i]}</div>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={s.r} disabled={done}
                  onChange={(e) => setR(i, e.target.value)} placeholder={segments[i]}
                  className="rb-reps-input" style={inStyle} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {segVals.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "58px 1fr 1fr", gap: 6, alignItems: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Charge {i + 1}
              </div>
              <div>
                {i === 0 && <div style={colLabel}>Poids (kg)</div>}
                <input type="number" inputMode="decimal" value={s.w} disabled={done}
                  onChange={(e) => setW(i, e.target.value)} placeholder="0" style={inStyle} />
              </div>
              <div>
                {i === 0 && <div style={colLabel}>Reps · {segments[i]}</div>}
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={s.r} disabled={done}
                  onChange={(e) => setR(i, e.target.value)} placeholder={segments[i]}
                  className="rb-reps-input" style={inStyle} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExerciseCard({ ex, weekIdx, sessionIdx, exIdx, globalIndex, getHistory, getCrossWeekHistory, getLatest, saveLog, getDelta, nextExName, ghostData, bandColor, isActive }) {
  const t = useT();
  const restTimer = useRestTimer();
  const [expanded, setExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showTempo, setShowTempo] = useState(false); // modale d'explication du tempo (ex. "3010")

  const today = new Date().toISOString().slice(0, 10);
  const storageKey = "sets_done_" + weekIdx + "_" + sessionIdx + "_" + exIdx + "_" + today;
  const storageDataKey = "sets_data_" + weekIdx + "_" + sessionIdx + "_" + exIdx + "_" + today;
  const [resetKey, setResetKey] = useState(0);
  // Hydrate completedSetsRef depuis localStorage AVANT doneCount — sur iOS qui
  // tue le JS thread, on retrouve les poids tapés et pas juste un compteur.
  // Hydrate completedSetsRef depuis localStorage. Si vide, on tente le cloud
  // (entrée du jour persistée par saveLog) — couvre le cas où l'athlète a
  // validé des séries puis l'app a été tuée/réinstallée → localStorage perdu
  // mais les sets restent dans Supabase grâce au save par-série (ci-dessous).
  const completedSetsRef = useRef((() => {
    try {
      const raw = localStorage.getItem(storageDataKey);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {}
    // Fallback cloud : on regarde si une entrée d'AUJOURD'HUI existe pour cet
    // exo dans l'historique (= persistée par saveLog précédent). Si oui, on
    // restaure les sets pour repartir d'où l'athlète s'est arrêté.
    try {
      const hist = typeof getCrossWeekHistory === "function"
        ? getCrossWeekHistory(sessionIdx, exIdx)
        : (getHistory ? getHistory(weekIdx, sessionIdx, exIdx) : []);
      const todayEntry = (hist || []).find((h) => h?.date === today);
      if (todayEntry && Array.isArray(todayEntry.sets) && todayEntry.sets.length > 0) {
        return todayEntry.sets.map((s, i) => ({ weight: s.weight, reps: s.reps, index: i }));
      }
    } catch {}
    return [];
  })());
  const [doneCount, setDoneCount] = useState(() => {
    // Source de vérité = la longueur de completedSetsRef (les vraies données),
    // fallback sur l'ancien storageKey si seulement le count avait été persisté.
    if (completedSetsRef.current.length > 0) return completedSetsRef.current.length;
    try { return parseInt(localStorage.getItem(storageKey) || "0"); } catch { return 0; }
  });
  // Historique CROSS-semaine : le client doit voir ce qu'il a tapé sur le
  // même squat (sessionIdx, exIdx) la semaine précédente, peu importe la
  // semaine courante. Sans ça, il croit avoir perdu ses charges chaque lundi.
  // getCrossWeekHistory est fourni par useLogs ; getLatest + getDelta sont
  // déjà cross-week côté hook depuis le fix 2 juin 2026.
  // Fallback `getHistory` (intra-semaine) si un caller ne passe pas le hook
  // mis à jour — ne devrait plus jamais arriver mais évite un blanc.
  const history = (typeof getCrossWeekHistory === "function"
    ? getCrossWeekHistory(sessionIdx, exIdx)
    : getHistory(weekIdx, sessionIdx, exIdx));
  // `latest` pour le prefill des sets non-faits = LA DERNIÈRE FOIS, pas la
  // séance en cours. Si on inclut l'entry du jour, le prefill du set 2 saute
  // de "60kg (last session set 2)" à "50kg (today's avg du set 1)" dès que
  // l'athlète valide son set 1 — visuellement choquant (Alicia, 10 juin 2026).
  // On filtre l'entry de today pour stabiliser le prefill pendant la séance.
  const latest = (() => {
    const prev = history.filter((h) => h?.date !== today);
    return prev.length > 0 ? prev[prev.length - 1] : null;
  })();
  const delta = getDelta(weekIdx, sessionIdx, exIdx);

  // Notation composée (cluster "5+5+5" / dégressive "10_10") : chaque SÉRIE
  // est un bloc composé, loggé via CompoundSetRow. Le nombre de séries reste
  // donné par le multiplicateur "NX" (ex. "3X5+5+5" = 3 séries cluster).
  const compound = parseCompound(ex.reps || ex.rawReps);

  // Méthode Pletnev : si le coach a saisi "N (4+2+6+6)" dans le champ reps,
  // on détecte la structure des 4 phases (excentrique → iso → dynamique →
  // explosive) et on affiche le détail à l'athlète. Chaque round = une
  // série dans le compteur du haut. Override de `compound` (Pletnev est
  // sémantiquement une notation composée plus structurée).
  const pletnev = detectPletnev(ex.rawReps || ex.reps);
  const [showPletnevDetail, setShowPletnevDetail] = useState(false);

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

  // Repos inter-séries : tant qu'il reste des séries à faire sur CET exo, le
  // timer doit annoncer la série suivante — pas l'exercice d'après. L'exo
  // suivant n'est annoncé qu'après la dernière série (betweenSets = null).
  const betweenSets = (doneCount > 0 && doneCount < parsedSets)
    ? { next: doneCount + 1, total: parsedSets }
    : null;

  // Calcul du volume de l exercice — segment-aware pour les sets composés
  // (dégressive : chaque charge a son propre poids → on somme bloc par bloc).
  const volume = completedSetsRef.current.reduce((a, s) => {
    if (Array.isArray(s.segments) && s.segments.length) {
      return a + s.segments.reduce((v, seg) => v + (parseFloat(seg.w) || 0) * (parseInt(seg.r) || 0), 0);
    }
    return a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
  }, 0);

  const handleSetDone = (weight, reps, idx, segments = null) => {
    completedSetsRef.current = [...completedSetsRef.current, { weight, reps, index: idx, ...(segments ? { segments } : {}) }];
    const n = completedSetsRef.current.length;
    setDoneCount(n);
    try {
      localStorage.setItem(storageKey, String(n));
      localStorage.setItem(storageDataKey, JSON.stringify(completedSetsRef.current));
    } catch {}
    // CLOUD SAVE : on persiste à CHAQUE série validée, pas seulement à la
    // dernière. Sans ça, un athlète qui fait 2/3 puis quitte (ou se fait
    // tuer l'app par iOS) perd tout au retour car localStorage WKWebView
    // n'est pas durable face à un cold restart. Avec le save par-série,
    // le hydrate cloud (cf completedSetsRef initializer ci-dessus) restaure
    // les sets validés depuis Supabase.
    const avg = completedSetsRef.current.reduce((a, s) => a + (parseFloat(s.weight) || 0), 0) / n;
    saveLog(weekIdx, sessionIdx, exIdx, avg, completedSetsRef.current[n - 1].reps, completedSetsRef.current, ex.name);
    haptic.medium(); // Set valide
    if (n >= setsCount) {
      haptic.success(); // Exercice termine
      // Dernière série faite → le repos annonce l'exercice suivant.
      if (restSecs) setTimeout(() => restTimer.start({ restSeconds: restSecs, exName: nextExName, betweenSets: null }), 600);
    } else if (restSecs) {
      // Série intermédiaire → le repos annonce la série suivante.
      setTimeout(() => restTimer.start({ restSeconds: restSecs, exName: nextExName, betweenSets: { next: n + 1, total: setsCount } }), 400);
    }
  };

  const handleReset = () => {
    completedSetsRef.current = [];
    setDoneCount(0);
    setResetKey(k => k + 1);
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageDataKey);
    } catch {}
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
        <div style={{ marginBottom: 8 }} onClick={() => setExpanded(v => !v)}>
          <div style={{ display: "flex", alignItems: "stretch", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
            <div style={{ width: 5, background: bc, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", width: 22, flexShrink: 0 }}>{String(globalIndex + 1).padStart(2, "0")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "-0.3px" }}>{ex.name}</div>
                  {ex.rmTest && (
                    <span title={`Test ${ex.rmTest}RM`}
                      style={{ fontSize: 8.5, fontWeight: 800, color: "#facc15", background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.3)", padding: "2px 7px", borderRadius: 100, letterSpacing: 0.5 }}>
                      {ex.rmTest}RM
                    </span>
                  )}
                  {ex.extra && (
                    <span title="Exo optionnel — le coach l'a marqué extra, tu peux le sauter sans bloquer la validation."
                      style={{ fontSize: 8.5, fontWeight: 800, color: "#a78bfa", background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.4)", padding: "2px 7px", borderRadius: 100, letterSpacing: 0.6, textTransform: "uppercase" }}>
                      Extra
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 3 }}>
                  {chipsReps}
                  {ex.charge && (
                    <span style={{ color: "rgba(251,191,36,0.85)", fontWeight: 700, marginLeft: 4 }}>
                      {" · "}{ex.charge}
                    </span>
                  )}
                  {ex.tempo && (
                    <>
                      {" · "}
                      <span
                        onClick={(e) => { e.stopPropagation(); setShowTempo(true); }}
                        style={{ cursor: "pointer", borderBottom: "1px dotted rgba(255,255,255,0.25)" }}
                        title="Voir l'explication du tempo"
                      >{ex.tempo}</span>
                      {/* Mini-badge Poliquin si tempo X → signal visuel rapide
                          que c'est une rep explosive (signature Charles Poliquin). */}
                      {(() => {
                        const pq = detectPoliquin(ex.tempo);
                        return pq ? (
                          <span
                            title={`Méthode Poliquin — ${pq.tutPerRep}s par rep · concentrique explosive`}
                            style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 5, background: "rgba(244,114,182,0.14)", border: "1px solid rgba(244,114,182,0.4)", fontSize: 8.5, fontWeight: 800, letterSpacing: 0.6, color: "#f472b6", textTransform: "uppercase", verticalAlign: "1px" }}
                          >
                            Poliquin
                          </span>
                        ) : null;
                      })()}
                    </>
                  )}
                  {ex.rest ? ` · ⏱ ${ex.rest}` : ""}
                </div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: bc, flexShrink: 0 }} />
            </div>
          </div>
        </div>
        {showTempo && <TempoExplainModal tempo={ex.tempo} onClose={() => setShowTempo(false)} />}
      </>
    );
  }

  // DESIGN : exercice ferme (complete ou a venir)
  if (allDone) {
    return (
      <>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "stretch", borderRadius: 18, overflow: "hidden", background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.12)", cursor: "pointer" }}
            onClick={() => setExpanded(v => !v)}>
            <div style={{ width: 5, background: GREEN, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="3" strokeLinecap="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "-0.3px" }}>{ex.name}</div>
                  {ex.rmTest && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#facc15", background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.3)", padding: "2px 7px", borderRadius: 100, letterSpacing: 0.5 }}>
                      {ex.rmTest}RM
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                  {latest && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{latest.weight} kg · {chipsReps}</span>}
                  {deltaPos && <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, background: "rgba(2,209,186,0.08)", padding: "2px 8px", borderRadius: 100 }}>+{delta?.toFixed(1)} kg</span>}
                  {deltaNeg && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: 100 }}>{delta?.toFixed(1)} kg</span>}
                  {/* 1RM estime via formule Epley : 1RM = poids × (1 + reps/30).
                      Affiche uniquement si l'exo est un test RM ET qu'on a un
                      log avec poids + reps reelles. Tres utile pour le coach
                      pour calibrer les % de RM dans le programme suivant. */}
                  {ex.rmTest && latest && latest.weight > 0 && (() => {
                    const realReps = parseInt(latest.reps, 10) || ex.rmTest;
                    const e1rm = latest.weight * (1 + realReps / 30);
                    return (
                      <span
                        title={`1RM estimé via formule Epley : ${latest.weight}kg × (1 + ${realReps}/30) = ${e1rm.toFixed(1)}kg`}
                        style={{ fontSize: 11, fontWeight: 800, color: "#facc15", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.25)", padding: "3px 9px", borderRadius: 100, letterSpacing: 0.3 }}
                      >
                        1RM ≈ {Math.round(e1rm)} kg
                      </span>
                    );
                  })()}
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
        {showTempo && <TempoExplainModal tempo={ex.tempo} onClose={() => setShowTempo(false)} />}
      </>
    );
  }

  // DESIGN : exercice actif ouvert
  return (
    <>

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
                {/* Badge TEST NRM — quand l'exo est un test de force max
                    (1RM/2RM/3RM/5RM/etc.). Or pour signal visuel fort.
                    L'athlete sait qu'il doit donner son max. */}
                {ex.rmTest && (
                  <span title={`Test de force max — vise ${ex.rmTest} rep${ex.rmTest > 1 ? "s" : ""} maximum`}
                    style={{ fontSize: 11, fontWeight: 800, color: "#facc15", background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.4)", padding: "5px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: 0.5 }}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8" r="5" />
                      <path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.12" />
                    </svg>
                    TEST {ex.rmTest}RM
                  </span>
                )}
                {/* Badge MÉTHODE PLETNEV — quand reps matche N (a+b+c+d).
                    Cliquable : ouvre la décomposition des 4 phases (excen-
                    trique / iso / dynamique / explosive) avec leurs charges
                    et tempos. Couleur violet pour différencier du jaune RM. */}
                {pletnev && (
                  <span
                    onClick={() => setShowPletnevDetail((v) => !v)}
                    title="Méthode Pletnev — clique pour voir la décomposition"
                    style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.4)", padding: "5px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: 0.5, cursor: "pointer" }}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
                    </svg>
                    PLETNEV · {pletnev.rounds} round{pletnev.rounds > 1 ? "s" : ""}
                  </span>
                )}
                {ex.extra && (
                  <span title="Exo optionnel — le coach l'a marqué extra, tu peux le sauter sans bloquer la validation."
                    style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.4)", padding: "5px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                    Extra · optionnel
                  </span>
                )}
                {chipsReps && <span style={{ fontSize: 11, color: "rgba(2,209,186,0.8)", background: "rgba(2,209,186,0.08)", padding: "5px 12px", borderRadius: 100, fontWeight: 600 }}>{chipsReps}</span>}
                {ex.charge && (
                  <span title="Charge prescrite par ton coach" style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", padding: "5px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: 0.2 }}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6.5 6.5h11l-.5 4-1 7.5h-8l-1-7.5z" /><path d="M9 6.5V4h6v2.5" />
                    </svg>
                    {ex.charge}
                  </span>
                )}
                {compound && (
                  <span title={ex.clusterRest ? `Mini-rest ${ex.clusterRest} entre chaque bloc` : null} style={{
                    fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 100,
                    color: compound.type === "degressive" ? "#f59e0b" : GREEN,
                    background: compound.type === "degressive" ? "rgba(245,158,11,0.1)" : "rgba(2,209,186,0.08)",
                    border: `1px solid ${compound.type === "degressive" ? "rgba(245,158,11,0.25)" : "rgba(2,209,186,0.2)"}`,
                  }}>
                    {compound.type === "degressive" ? "Dégressive" : "Cluster"}
                    {compound.type === "cluster" && ex.clusterRest ? ` · ${ex.clusterRest}` : ""}
                  </span>
                )}
                {ex.rest && <span onClick={() => restSecs && restTimer.start({ restSeconds: restSecs, exName: nextExName, betweenSets })} style={{ fontSize: 11, color: "rgba(255,165,0,0.7)", background: "rgba(255,165,0,0.07)", padding: "5px 12px", borderRadius: 100, cursor: restSecs ? "pointer" : "default" }}>⏱ {ex.rest}</span>}
                {ex.tempo && (
                  <span
                    onClick={() => setShowTempo(true)}
                    title="Voir l'explication du tempo"
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "5px 12px", borderRadius: 100, cursor: "pointer" }}
                  >{ex.tempo}</span>
                )}
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

          {/* Détail méthode Pletnev — déployé via clic sur le badge.
              Affiche les 4 phases avec leurs reps / charge / tempo, pour
              que l'athlète enchaîne sans devoir aller chercher la spec. */}
          {pletnev && showPletnevDetail && (
            <div style={{
              marginTop: 4, marginBottom: 14,
              padding: "12px 14px",
              background: "rgba(167,139,250,0.04)",
              border: "1px solid rgba(167,139,250,0.18)",
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(167,139,250,0.85)", marginBottom: 8 }}>
                Méthode Pletnev — {pletnev.rounds} round{pletnev.rounds > 1 ? "s" : ""} de 4 phases
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pletnev.phases.map((p, pi) => (
                  <div key={pi} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                  }}>
                    <div style={{
                      flexShrink: 0,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(167,139,250,0.18)",
                      color: "#a78bfa",
                      fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{pi + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 0.2 }}>
                        {p.reps} reps · {p.loadLabel} · <span style={{ color: "rgba(167,139,250,0.85)", fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{p.tempo}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2, lineHeight: 1.4 }}>
                        {p.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>
                Enchaîne les 4 phases sans repos, puis récup avant le round suivant.
              </div>
            </div>
          )}

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
                {(() => {
                  // Si on a les sets détaillés, on les affiche compactés
                  // (ex: '80×10 / 75×10 / 70×8') — c'est ce que l'athlète
                  // a fait pour de vrai, pas la moyenne. Sinon fallback
                  // sur weight (avg legacy) × reps (dernier set).
                  const sets = Array.isArray(ghostData.sets) ? ghostData.sets : null;
                  if (sets && sets.length > 0) {
                    const allSame = sets.every((s) => Number(s.weight) === Number(sets[0].weight) && String(s.reps) === String(sets[0].reps));
                    if (allSame) return `${sets.length}×${sets[0].weight} kg × ${sets[0].reps}`;
                    return sets.map((s) => `${s.weight}×${s.reps}`).join(" / ");
                  }
                  return `${ghostData.weight} kg × ${ghostData.reps}`;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Series */}
        <div style={{ padding: "0 16px 16px" }}>
          {!compound && (
            <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px", gap: 8, marginBottom: 10, padding: "0 2px" }}>
              <div></div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", letterSpacing: "2px", textTransform: "uppercase" }}>{t("ec.weight_col")}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", letterSpacing: "2px", textTransform: "uppercase" }}>
                {t("ec.reps_col")}{ex.reps ? <span style={{ color: "rgba(2,209,186,0.5)", marginLeft: 4, textTransform: "none", letterSpacing: 0 }}>· {ex.reps}</span> : null}
              </div>
              <div></div>
            </div>
          )}
          {Array.from({ length: setsCount }, (_, i) => {
            const restoredW = (() => {
              // Ignore les 0 hérités d'anciens logs : 0 ?? X retourne 0 et
              // useState(0||"") => "" -> placeholder "0" qui ressemble à
              // une valeur fixée par le coach. On veut un vrai poids > 0.
              const sw = latest?.sets?.[i]?.weight;
              if (sw != null && sw !== "" && Number(sw) > 0) return String(sw);
              if (latest?.weight && Number(latest.weight) > 0) return String(latest.weight);
              return "";
            })();
            if (compound) {
              return (
                <CompoundSetRow
                  key={resetKey + "-c-" + i}
                  index={i}
                  done={i < doneCount}
                  isActive={i === doneCount}
                  type={compound.type}
                  segments={compound.segments}
                  currentEntry={completedSetsRef.current[i]}
                  defaultWeight={restoredW}
                  onDone={handleSetDone}
                  clusterRest={ex.clusterRest || ""}
                />
              );
            }
            return (
              <SetRow
                key={resetKey + "-" + i}
                index={i}
                done={i < doneCount}
                isActive={i === doneCount}
                defaultW={restoredW}
                defaultR={(() => {
                  // N injecter une defaultR que si c est une vraie valeur numerique loggee.
                  // Les fourchettes type "8-10" venaient du fallback ex.reps -> pollution DB.
                  const r = latest?.sets?.[i]?.reps;
                  if (r == null || r === "") return "";
                  if (/^\d+$/.test(String(r).trim())) return String(r);
                  return "";
                })()}
                currentW={completedSetsRef.current[i]?.weight}
                currentR={completedSetsRef.current[i]?.reps}
                placeholder={ex.reps || "—"}
                onDone={handleSetDone}
              />
            );
          })}
          {doneCount > 0 && doneCount < setsCount && (
            <button onClick={handleReset} style={{ width: "100%", marginTop: 4, padding: "8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer" }}>{t("ec.restart")}</button>
          )}
        </div>

        {/* Footer — Timer + Intelligence progression */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "14px 16px", display: "flex", gap: 10 }}>
          {ex.rest && (
            <div onClick={() => restSecs && restTimer.start({ restSeconds: restSecs, exName: nextExName, betweenSets })} style={{ flex: 1, padding: "10px 14px", background: "rgba(255,165,0,0.04)", border: "1px solid rgba(255,165,0,0.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: restSecs ? "pointer" : "default" }}>
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
      {showTempo && <TempoExplainModal tempo={ex.tempo} onClose={() => setShowTempo(false)} />}
    </>
  );
}
