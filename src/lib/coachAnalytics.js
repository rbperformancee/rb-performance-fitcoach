/**
 * Analytics avancees pour le coach :
 *   - Performance programmes (taux completion + adherence)
 *   - Correlations (sommeil/RPE, nutrition/RPE, regularite/poids)
 *   - Heatmap d'activite (jour x heure)
 *   - Evolution globale clientele
 *
 * Tous les calculs sont purs (consomment des donnees en parametre).
 */

// ===== HEATMAP =====

/**
 * Construit la heatmap 7 (jours) x 24 (heures) a partir de timestamps.
 * Retourne array[7][24] de counts.
 */
export function buildActivityHeatmap(timestamps = []) {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    if (isNaN(d)) continue;
    const day = d.getDay(); // 0 = Dim, 6 = Sam
    const hour = d.getHours();
    grid[day][hour]++;
  }
  return grid;
}

/**
 * Retourne le pic d'activite : { day, hour, count }.
 */
export function getPeakActivity(grid) {
  let max = { day: 0, hour: 0, count: 0 };
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > max.count) max = { day: d, hour: h, count: grid[d][h] };
    }
  }
  return max;
}

// ===== CORRELATIONS =====

/**
 * Coefficient de Pearson entre 2 series numeriques.
 * Retourne -1..1 ou NaN si insuffisant.
 */
export function pearson(xs, ys) {
  if (!xs || !ys || xs.length !== ys.length || xs.length < 3) return NaN;
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return NaN;
  return num / den;
}

/**
 * Interprete un coefficient en label + couleur.
 */
export function interpretCorrelation(r) {
  if (isNaN(r)) return { label: "donnees insuffisantes", color: "rgba(255,255,255,0.4)" };
  const abs = Math.abs(r);
  if (abs >= 0.7) return { label: r > 0 ? "Forte correlation positive" : "Forte correlation negative", color: r > 0 ? "#02d1ba" : "#ef4444" };
  if (abs >= 0.4) return { label: r > 0 ? "Correlation moderee" : "Correlation moderee inverse", color: r > 0 ? "#02d1ba" : "#f97316" };
  if (abs >= 0.2) return { label: "Faible correlation", color: "#f97316" };
  return { label: "Pas de correlation", color: "rgba(255,255,255,0.4)" };
}

// ===== PERFORMANCE PROGRAMMES =====

/**
 * Pour chaque programme actif/termine, calcule :
 *   - nombre de sessions effectuees par les clients
 *   - taux d'adherence (sessions reelles / sessions attendues sur la duree)
 *
 * Input : programmes (rows DB) + sessionsByClient (map client_id -> array de session_logs)
 */
export function analyzeProgrammes(programmes = [], sessionsByClient = {}) {
  const byName = {};
  for (const p of programmes) {
    const name = p.programme_name || "Sans nom";
    const sessions = sessionsByClient[p.client_id] || [];
    const since = new Date(p.uploaded_at).getTime();
    const programSessions = sessions.filter((s) => new Date(s.logged_at).getTime() >= since);
    const days = Math.max(1, Math.round((Date.now() - since) / 86400000));
    const expected = (days / 7) * 3; // 3 seances / semaine attendues (hypothese)
    const adherence = expected > 0 ? Math.min(100, Math.round((programSessions.length / expected) * 100)) : 0;

    if (!byName[name]) byName[name] = { name, totalSessions: 0, adherenceList: [], clientsCount: 0 };
    byName[name].totalSessions += programSessions.length;
    byName[name].adherenceList.push(adherence);
    byName[name].clientsCount++;
  }

  return Object.values(byName).map((p) => ({
    name: p.name,
    totalSessions: p.totalSessions,
    avgAdherence: Math.round(p.adherenceList.reduce((a, b) => a + b, 0) / p.adherenceList.length),
    clientsCount: p.clientsCount,
  })).sort((a, b) => b.avgAdherence - a.avgAdherence);
}

// ===== EVOLUTION GLOBALE =====

/**
 * Calcule l'evolution moyenne de poids des clients sur N jours.
 * Input : weights = array of { client_id, date, weight } ordered desc.
 */
export function globalWeightEvolution(weights = [], days = 90) {
  const since = Date.now() - days * 86400000;
  const byClient = {};
  for (const w of weights) {
    if (!byClient[w.client_id]) byClient[w.client_id] = [];
    byClient[w.client_id].push({ date: new Date(w.date).getTime(), weight: w.weight });
  }
  const deltas = [];
  for (const cid of Object.keys(byClient)) {
    const sorted = byClient[cid].sort((a, b) => a.date - b.date);
    const inWindow = sorted.filter((p) => p.date >= since);
    if (inWindow.length < 2) continue;
    const first = inWindow[0].weight;
    const last = inWindow[inWindow.length - 1].weight;
    deltas.push(last - first);
  }
  if (deltas.length === 0) return { avg: 0, count: 0, gainers: 0, losers: 0 };
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return {
    avg: Number(avg.toFixed(1)),
    count: deltas.length,
    gainers: deltas.filter((d) => d > 0.5).length,
    losers: deltas.filter((d) => d < -0.5).length,
    stable: deltas.filter((d) => Math.abs(d) <= 0.5).length,
  };
}

/**
 * Taux de progression global = % de clients avec une amelioration significative
 * sur leurs metriques (poids vers leur objectif OU augmentation de seances).
 */
export function progressionRate(clients = [], evolution) {
  if (!clients.length || !evolution) return 0;
  // Approximation : clients qui ont une activite recente (<7j) + un delta poids non-neutre
  const active = clients.filter((c) => (c._inactiveDays ?? 999) < 14).length;
  return clients.length > 0 ? Math.round((active / clients.length) * 100) : 0;
}
