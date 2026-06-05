// src/lib/runIntervals.js
//
// Scheduler d'intervalles guidés pour les runs HIIT.
//
// Parse les champs du builder coach :
//   { repeats: 8, work: "400m"|"30s", rest: "90s"|"200m", blocks: 1 }
//
// Et expose un scheduler :
//   const sched = createIntervalScheduler(target)
//   sched.nextPhase(prev)        → { phase, rep, block, durationS?, distanceM? }
//   sched.totalPhases             → nombre total de switches
//
// Pas de warmup/cooldown auto — laissé au coach (séances séparées si besoin).

/**
 * Parse "30s" / "1m30" / "1:30" / "2min" → secondes (number) ou null
 */
export function parseTimeS(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(",", ".");
  if (!s) return null;
  const colon = s.match(/^(\d+)\s*:\s*(\d+)$/);
  if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  const mAndS = s.match(/^(\d+)\s*m\s*(\d+)\s*s?$/);
  if (mAndS) return parseInt(mAndS[1], 10) * 60 + parseInt(mAndS[2], 10);
  const onlyM = s.match(/^(\d+(?:\.\d+)?)\s*min$/) || s.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (onlyM) return Math.round(parseFloat(onlyM[1]) * 60);
  const onlyS = s.match(/^(\d+(?:\.\d+)?)\s*s$/);
  if (onlyS) return Math.round(parseFloat(onlyS[1]));
  // Sans unité : si < 10 → minutes (rare HIIT), sinon secondes
  const num = parseFloat(s);
  if (!Number.isFinite(num)) return null;
  return num < 10 ? Math.round(num * 60) : Math.round(num);
}

/**
 * Parse "400m" / "0.4km" / "1km" → mètres (number) ou null
 * Différencie m (mètres) de min/m (minutes) — ne matche que si plein nombre + 'm' final.
 */
export function parseDistM(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(",", ".");
  if (!s) return null;
  const km = s.match(/^(\d+(?:\.\d+)?)\s*km$/);
  if (km) return Math.round(parseFloat(km[1]) * 1000);
  const m = s.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (m) return Math.round(parseFloat(m[1]));
  return null;
}

/**
 * Parse une portion work/rest : retourne { kind: "time"|"distance", value: number }
 */
export function parseSegment(raw) {
  const t = parseTimeS(raw);
  if (t != null && t > 0) return { kind: "time", value: t };
  const d = parseDistM(raw);
  if (d != null && d > 0) return { kind: "distance", value: d };
  return null;
}

/**
 * Vrai si la prescription est un HIIT exploitable par le scheduler.
 */
export function isIntervalRun(target) {
  if (!target?.isHiit) return false;
  const work = parseSegment(target?.work || target?.workRaw);
  return !!work;
}

/**
 * Construit le scheduler depuis un target parsé.
 *
 * Retourne :
 *   {
 *     repeats: 8,
 *     blocks: 1,
 *     work: { kind:"time"|"distance", value:30 },
 *     rest: { kind:"time"|"distance", value:90 } | null,
 *     timeBased: true|false (true si work + rest sont en time),
 *   }
 */
export function buildSchedule(target) {
  const work = parseSegment(target?.work || target?.workRaw);
  const rest = parseSegment(target?.rest || target?.restRaw);
  const repeats = Math.max(1, parseInt(target?.repeats, 10) || 1);
  const blocks = Math.max(1, parseInt(target?.blocks, 10) || 1);
  return {
    work,
    rest,
    repeats,
    blocks,
    timeBased: work?.kind === "time" && (!rest || rest.kind === "time"),
  };
}

/**
 * Calcule la phase suivante du scheduler.
 *
 * @param {object} prev { phase:"idle"|"work"|"rest"|"done", rep:number, block:number }
 * @param {object} schedule { repeats, blocks, work, rest }
 * @returns {object} next phase
 */
export function nextPhase(prev, schedule) {
  const { repeats, blocks, rest } = schedule;
  if (!prev || prev.phase === "idle") {
    return { phase: "work", rep: 1, block: 1 };
  }
  if (prev.phase === "work") {
    // Si pas de rest configuré → enchaîne sur le work suivant
    if (!rest) {
      if (prev.rep < repeats) return { phase: "work", rep: prev.rep + 1, block: prev.block };
      if (prev.block < blocks) return { phase: "work", rep: 1, block: prev.block + 1 };
      return { phase: "done", rep: prev.rep, block: prev.block };
    }
    return { phase: "rest", rep: prev.rep, block: prev.block };
  }
  if (prev.phase === "rest") {
    if (prev.rep < repeats) return { phase: "work", rep: prev.rep + 1, block: prev.block };
    if (prev.block < blocks) return { phase: "work", rep: 1, block: prev.block + 1 };
    return { phase: "done", rep: prev.rep, block: prev.block };
  }
  return prev;
}

/**
 * Génère le message vocal pour annoncer une phase.
 */
export function announceText(phase, rep, repeats, isFinalRound) {
  if (phase.phase === "work") {
    if (isFinalRound) return `Dernier round, donne tout !`;
    if (rep === 1) return `Premier round, pousse !`;
    return `Round ${rep} sur ${repeats}, pousse !`;
  }
  if (phase.phase === "rest") {
    return `Récup`;
  }
  if (phase.phase === "done") {
    return `Séance terminée, bravo !`;
  }
  return "";
}
