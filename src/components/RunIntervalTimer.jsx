import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * RunIntervalTimer — chrono interval lançable pour HIIT / fractionné.
 *
 * Pattern : N blocs × M rounds × (work → rest), avec un repos optionnel
 * entre les blocs. Concrètement, un Tabata classique = 1 bloc × 8 rounds
 * × (20s work / 10s rest). Un programme "2×8 × 30/30 avec 2' entre"
 * = 2 blocs × 8 rounds × (30s/30s) + 2min entre les blocs.
 *
 * Audio + haptic à chaque transition :
 *   - 1200Hz bref au passage work → rest (transition douce)
 *   - 1600Hz double au passage rest → work (effort qui démarre, plus aigu)
 *   - 800Hz quadruple à la fin de tout (signal de fin clair, plus grave)
 *   - vibrate() en miroir des bips pour silent mode
 *
 * Persistance localStorage : si l'athlète quitte la page en cours de
 * timer, l'état est recalculé au retour (état dérivé de `start` time +
 * elapsed). Pas de "pause" volontaire — si tu lances tu termines ou tu reset.
 *
 * Utilise un seul setInterval(200ms) qui calcule la phase courante à
 * partir de Date.now() − start. Robuste aux tabs en arrière-plan
 * (chrome throttle setInterval mais le calcul reste correct).
 */

const ACCENT_WORK = "#ef4444";       // rouge (effort)
const ACCENT_REST = "#02d1ba";       // turquoise (repos round)
const ACCENT_BLOCK = "#a78bfa";      // violet (repos bloc, plus rare)
const BG = "rgba(15,15,15,0.6)";

/**
 * Parse une durée texte ("30s", "1'30", "2:00", "45") en secondes.
 * Retourne 0 si non parsable.
 */
function parseSeconds(input) {
  if (input == null) return 0;
  const s = String(input).trim();
  if (!s) return 0;
  // Format mm'ss ou mm:ss
  const colon = s.match(/^(\d+)\s*[':]\s*(\d{1,2})\s*$/);
  if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  // Format Nmin ou Nm
  const min = s.match(/^(\d+)\s*(min|m)$/i);
  if (min) return parseInt(min[1], 10) * 60;
  // Format Ns ou Nsec
  const sec = s.match(/^(\d+)\s*(s|sec|secondes?)?$/i);
  if (sec) return parseInt(sec[1], 10);
  // Apostrophe seule "1'" = 1 minute pile
  const apo = s.match(/^(\d+)\s*'$/);
  if (apo) return parseInt(apo[1], 10) * 60;
  return 0;
}

/**
 * Construit la séquence de phases pour le timer.
 * Ex: blocks=2, repeats=8, workS=30, restS=30, blockRestS=120
 *   → [W30,R30] × 8, BR120, [W30,R30] × 8 = 17 phases × 2 + 1 br = 33 phases
 * Chaque phase = { type: 'work'|'rest'|'blockRest', durationS, label }.
 */
function buildSequence({ blocks, repeats, workS, restS, blockRestS }) {
  const seq = [];
  for (let b = 0; b < blocks; b++) {
    for (let r = 0; r < repeats; r++) {
      seq.push({
        type: "work",
        durationS: workS,
        round: r + 1,
        block: b + 1,
        label: `Effort ${r + 1}/${repeats}` + (blocks > 1 ? ` · bloc ${b + 1}/${blocks}` : ""),
      });
      // Pas de rest après le dernier round du dernier bloc
      if (r < repeats - 1 || b < blocks - 1) {
        // Le rest entre 2 blocs est plus long si configuré → on remplace
        const isLastRoundOfBlock = r === repeats - 1;
        const isBetweenBlocks = isLastRoundOfBlock && b < blocks - 1 && blockRestS > 0;
        if (isBetweenBlocks) {
          seq.push({
            type: "blockRest",
            durationS: blockRestS,
            round: r + 1,
            block: b + 1,
            label: `Repos bloc → bloc ${b + 2}/${blocks}`,
          });
        } else {
          seq.push({
            type: "rest",
            durationS: restS,
            round: r + 1,
            block: b + 1,
            label: `Récup ${r + 1}`,
          });
        }
      }
    }
  }
  return seq;
}

/**
 * Calcule la phase courante + secondes restantes à partir de elapsed.
 * Retourne null si elapsed >= totalDuration (timer terminé).
 */
function computeCurrentPhase(sequence, elapsedS) {
  let acc = 0;
  for (let i = 0; i < sequence.length; i++) {
    const ph = sequence[i];
    if (elapsedS < acc + ph.durationS) {
      return {
        index: i,
        phase: ph,
        remainingS: acc + ph.durationS - elapsedS,
        elapsedInPhaseS: elapsedS - acc,
      };
    }
    acc += ph.durationS;
  }
  return null; // done
}

/**
 * Bip audio + vibration.
 * - 'work' (transition vers effort) : double bip aigu (1600Hz)
 * - 'rest' (transition vers récup) : bip bref doux (1200Hz)
 * - 'blockRest' : triple bip moyen (1000Hz) pour signaler le repos bloc
 * - 'done' : quadruple bip grave (800Hz) pour la fin totale
 *
 * Web Audio API : pas de fichier audio à charger, fonctionne hors-ligne,
 * pas de latence.
 */
function playCue(type) {
  try {
    if (navigator.vibrate) {
      if (type === "work") navigator.vibrate([60, 40, 60]);
      else if (type === "rest") navigator.vibrate(40);
      else if (type === "blockRest") navigator.vibrate([60, 60, 60, 60, 60]);
      else if (type === "done") navigator.vibrate([120, 80, 120, 80, 200]);
    }
  } catch {}
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const config = {
      work: { freq: 1600, count: 2, duration: 0.12, gap: 0.08 },
      rest: { freq: 1200, count: 1, duration: 0.18, gap: 0 },
      blockRest: { freq: 1000, count: 3, duration: 0.15, gap: 0.1 },
      done: { freq: 800, count: 4, duration: 0.2, gap: 0.12 },
    }[type];
    if (!config) return;
    for (let i = 0; i < config.count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + i * (config.duration + config.gap);
      osc.frequency.value = config.freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.22, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + config.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + config.duration + 0.05);
    }
  } catch {}
}

/**
 * Affichage temps mm:ss (ou ss si < 60).
 */
function fmt(s) {
  if (s < 60) return `${s}`;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export default function RunIntervalTimer({
  storageKey,
  name,
  blocks = 1,
  repeats,
  work,    // "30s", "1'30"
  rest,    // "30s"
  blockRest, // "2'00" (optional)
  target,  // "4'15-4'20/km" (optional, info-only)
}) {
  // Parse durations once
  const workS = parseSeconds(work);
  const restS = parseSeconds(rest);
  const blockRestS = parseSeconds(blockRest);
  const validRepeats = Math.max(1, parseInt(repeats, 10) || 1);
  const validBlocks = Math.max(1, parseInt(blocks, 10) || 1);

  // Si le pattern n'est pas time-based (work non parsable), on n'affiche
  // pas le timer (ex: 8×400m sans temps → l'athlete fait au stopwatch).
  const isTimeBased = workS > 0 && restS > 0;

  const sequence = React.useMemo(
    () => isTimeBased ? buildSequence({ blocks: validBlocks, repeats: validRepeats, workS, restS, blockRestS }) : [],
    [isTimeBased, validBlocks, validRepeats, workS, restS, blockRestS]
  );
  const totalS = sequence.reduce((acc, ph) => acc + ph.durationS, 0);

  const KEY = storageKey;

  const readState = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }, [KEY]);

  const [elapsedS, setElapsedS] = useState(() => {
    const s = readState();
    if (s.done) return totalS;
    if (s.start) return Math.floor((Date.now() - s.start) / 1000);
    return 0;
  });
  const [running, setRunning] = useState(() => {
    const s = readState();
    return !!(s.start && !s.done);
  });
  const [done, setDone] = useState(() => !!readState().done);

  // Ref pour detecter le changement de phase et bipper UNE fois.
  const lastPhaseIdxRef = useRef(-1);
  const tickRef = useRef(null);

  useEffect(() => {
    clearInterval(tickRef.current);
    if (!running) return;
    tickRef.current = setInterval(() => {
      const s = readState();
      if (!s.start) return;
      const newElapsed = Math.floor((Date.now() - s.start) / 1000);
      setElapsedS(newElapsed);

      // Detection fin
      if (newElapsed >= totalS) {
        try { localStorage.setItem(KEY, JSON.stringify({ ...s, done: true })); } catch {}
        setRunning(false);
        setDone(true);
        playCue("done");
        return;
      }

      // Detection changement de phase → bip
      const current = computeCurrentPhase(sequence, newElapsed);
      if (current && current.index !== lastPhaseIdxRef.current) {
        // Skip le bip lors de la phase 0 au tout debut (le bouton "start"
        // a deja servi de signal). Seulement bipper aux transitions reelles.
        if (lastPhaseIdxRef.current !== -1) {
          playCue(current.phase.type);
        }
        lastPhaseIdxRef.current = current.index;
      }
    }, 200);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const s = readState();
        if (s.start && !s.done) {
          setElapsedS(Math.floor((Date.now() - s.start) / 1000));
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tickRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [running, readState, sequence, totalS, KEY]);

  const start = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ start: Date.now() })); } catch {}
    lastPhaseIdxRef.current = -1;
    setElapsedS(0);
    setRunning(true);
    setDone(false);
    // Bip "work" immediat puisqu'on entre directement dans le 1er effort
    playCue("work");
  };
  const reset = () => {
    try { localStorage.removeItem(KEY); } catch {}
    lastPhaseIdxRef.current = -1;
    setElapsedS(0);
    setRunning(false);
    setDone(false);
  };

  // Si pas time-based, on n'affiche pas le timer (juste un message)
  if (!isTimeBased) {
    return (
      <div style={{
        padding: "10px 14px", borderRadius: 12,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        fontSize: 11, color: "rgba(255,255,255,0.45)",
      }}>
        Pas de chrono auto (distance/effort sans temps cible). Utilise un stopwatch.
      </div>
    );
  }

  const current = done ? null : computeCurrentPhase(sequence, elapsedS);
  const phaseType = current ? current.phase.type : "done";
  const accent = phaseType === "work" ? ACCENT_WORK
    : phaseType === "rest" ? ACCENT_REST
    : phaseType === "blockRest" ? ACCENT_BLOCK
    : "rgba(255,255,255,0.4)";

  return (
    <div style={{
      background: BG,
      border: `1px solid ${running || done ? accent + "55" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 14,
      padding: 16,
      transition: "border-color 0.3s",
    }}>
      {/* Header — nom + résumé pattern */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: accent, textTransform: "uppercase", marginBottom: 2 }}>
            {validBlocks > 1 ? `${validBlocks} blocs · ` : ""}{validRepeats} × {work}/{rest}
            {blockRestS > 0 && validBlocks > 1 ? ` · ${blockRest} entre blocs` : ""}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{name || "Fractionné"}</div>
          {target && (
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Cible : {target}
            </div>
          )}
        </div>
      </div>

      {/* Affichage temps gros + phase label */}
      <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
        {current ? (
          <>
            <div style={{
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              fontSize: 56, fontWeight: 800, color: accent,
              letterSpacing: "-2px", lineHeight: 1,
              textShadow: `0 0 24px ${accent}66`,
            }}>
              {fmt(current.remainingS)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginTop: 6 }}>
              {current.phase.label}
            </div>
          </>
        ) : done ? (
          <>
            <div style={{
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              fontSize: 48, fontWeight: 800, color: "rgba(255,255,255,0.85)",
              letterSpacing: "-2px", lineHeight: 1,
            }}>
              ✓
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginTop: 8 }}>
              Terminé · {fmt(totalS)}
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              fontSize: 56, fontWeight: 800, color: "rgba(255,255,255,0.4)",
              letterSpacing: "-2px", lineHeight: 1,
            }}>
              {fmt(totalS)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 8 }}>
              Durée totale
            </div>
          </>
        )}
      </div>

      {/* Mini progress bar phase */}
      {current && (
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
          <div style={{
            width: `${(current.elapsedInPhaseS / current.phase.durationS) * 100}%`,
            height: "100%", background: accent,
            transition: "width 0.2s linear",
          }} />
        </div>
      )}

      {/* Mini progress bar séquence totale */}
      <div style={{ marginTop: 8, height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(100, (elapsedS / totalS) * 100)}%`,
          height: "100%", background: accent,
          opacity: 0.5, transition: "width 0.2s linear",
        }} />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {!running && !done && (
          <button
            type="button"
            onClick={start}
            style={{
              flex: 1, padding: "12px 0",
              background: ACCENT_WORK,
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >▶ Démarrer</button>
        )}
        {running && (
          <button
            type="button"
            onClick={reset}
            style={{
              flex: 1, padding: "12px 0",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >■ Arrêter</button>
        )}
        {done && (
          <button
            type="button"
            onClick={reset}
            style={{
              flex: 1, padding: "12px 0",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >↻ Refaire</button>
        )}
      </div>

      {/* Hint sur le son */}
      {!running && !done && (
        <div style={{ marginTop: 8, fontSize: 9, color: "rgba(255,255,255,0.3)", textAlign: "center", letterSpacing: 0.3 }}>
          🔊 Bip à chaque transition · 📳 vibration en mode silence
        </div>
      )}
    </div>
  );
}
