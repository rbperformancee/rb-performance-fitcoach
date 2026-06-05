// src/lib/runTarget.js
//
// Parsing du target d'un run prescrit par le coach.
//
// Le coach saisit dans ProgrammeBuilder des champs free-text genre :
//   distance: "10 km" | "10000m" | "5,5" | "5km"
//   duration: "60 min" | "1h" | "01:00:00" | "00:45"
//   bpm: "150" | "150-160" | "Z3"
//   target: "Sortie longue" | "Allure marathon" | …
//   repeats / work / rest : HIIT
//
// On normalise tout en numeric pour pouvoir comparer vs réalisé.

/**
 * @typedef {object} ParsedTarget
 * @property {string} name
 * @property {boolean} hasTarget
 * @property {number|null} distanceM
 * @property {number|null} durationS
 * @property {number|null} paceSPerKm     Derivé si dist + durée
 * @property {number|null} bpm
 * @property {boolean} isHiit
 * @property {string|null} hiitLabel
 */

/** Parse "10 km" / "5,5km" / "10000m" / "10" → metres (number) ou null */
export function parseDistanceM(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(",", ".");
  if (!s) return null;
  // Cherche un nombre + unité
  const km = s.match(/(\d+(?:\.\d+)?)\s*km/);
  if (km) return Math.round(parseFloat(km[1]) * 1000);
  const m = s.match(/(\d+(?:\.\d+)?)\s*m(?!in)/); // m mais pas min
  if (m) return Math.round(parseFloat(m[1]));
  // Pas d'unité → on suppose km si < 100, sinon m
  const num = parseFloat(s);
  if (!Number.isFinite(num)) return null;
  return num < 100 ? Math.round(num * 1000) : Math.round(num);
}

/** Parse "60 min" / "1h" / "01:00:00" / "45:00" / "45" → secondes (number) ou null */
export function parseDurationS(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(",", ".");
  if (!s) return null;
  // Format hh:mm:ss ou mm:ss
  const parts = s.split(":").map((p) => parseInt(p, 10)).filter(Number.isFinite);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) {
    // Heuristique : si premier > 5 → c'est min:sec ; sinon h:min
    if (parts[0] > 5) return parts[0] * 60 + parts[1];
    return parts[0] * 3600 + parts[1] * 60;
  }
  // Cherche unités
  const h = s.match(/(\d+(?:\.\d+)?)\s*h(?!\d)/);
  const min = s.match(/(\d+(?:\.\d+)?)\s*min/) || s.match(/(\d+(?:\.\d+)?)\s*m(?!\w)/);
  let total = 0;
  if (h) total += parseFloat(h[1]) * 3600;
  if (min) total += parseFloat(min[1]) * 60;
  if (total > 0) return Math.round(total);
  // Pas d'unité → heuristique : si > 15 → c'est des minutes, sinon des heures
  const num = parseFloat(s);
  if (!Number.isFinite(num)) return null;
  return Math.round(num >= 15 ? num * 60 : num * 3600);
}

/** Parse "150" / "150-160" / "Z3" → bpm number ou null */
export function parseBpm(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Range "150-160" → moyenne
  const range = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return Math.round((parseInt(range[1], 10) + parseInt(range[2], 10)) / 2);
  const num = parseInt(s, 10);
  return Number.isFinite(num) && num > 30 ? num : null;
}

/**
 * @param {object|null} raw Run prescrit du builder.
 * @returns {ParsedTarget}
 */
export function parseTarget(raw) {
  const name = String(raw?.name || "").trim();
  if (!raw) {
    return {
      name: "",
      hasTarget: false,
      distanceM: null, durationS: null, paceSPerKm: null, bpm: null,
      isHiit: false, hiitLabel: null,
    };
  }
  const distanceM = parseDistanceM(raw.distance);
  const durationS = parseDurationS(raw.duration);
  const bpm = parseBpm(raw.bpm);
  let paceSPerKm = null;
  if (distanceM && durationS && distanceM > 100) {
    paceSPerKm = Math.round(durationS / (distanceM / 1000));
  }
  const repeats = parseInt(raw.repeats, 10);
  const work = String(raw.work || "").trim();
  const rest = String(raw.rest || "").trim();
  const isHiit = Number.isFinite(repeats) && repeats > 1 && (work || rest);
  const hiitLabel = isHiit
    ? `${repeats}×${work}${rest ? ` R${rest}` : ""}`
    : null;
  const hasTarget = !!(distanceM || durationS || bpm || isHiit || name);
  return { name, hasTarget, distanceM, durationS, paceSPerKm, bpm, isHiit, hiitLabel };
}

/**
 * Compute verdict d'un run vs target.
 * @returns {{ status: "ok"|"over"|"under"|"none", deltaM:number, deltaS:number, deltaPaceS:number, label:string }}
 */
export function compareToTarget(actual, target) {
  if (!target?.hasTarget) {
    return { status: "none", deltaM: 0, deltaS: 0, deltaPaceS: 0, label: "" };
  }
  const aM = actual?.distanceM || 0;
  const aS = actual?.durationS || 0;
  const aPace = actual?.paceSPerKm || 0;
  const tM = target.distanceM || 0;
  const tS = target.durationS || 0;
  const tPace = target.paceSPerKm || 0;

  const deltaM = tM ? aM - tM : 0;
  const deltaS = tS ? aS - tS : 0;
  const deltaPaceS = tPace ? aPace - tPace : 0;

  // Verdict prioritaire : si target distance → on regarde distance + pace
  // Si target HIIT seulement → on regarde durée
  let status = "ok";
  if (tM) {
    const tolM = Math.max(150, tM * 0.05); // ±5% ou ±150m
    if (aM < tM - tolM) status = "under";
    else if (aM > tM + tolM * 2) status = "over";
  }
  // Si distance OK et pace fortement off → status = "under" si trop lent
  if (status === "ok" && tPace > 0 && deltaPaceS > 25) status = "under";

  const label =
    status === "ok" ? "Objectif atteint"
    : status === "over" ? "Au-delà de la cible"
    : "En-dessous de la cible";
  return { status, deltaM, deltaS, deltaPaceS, label };
}
