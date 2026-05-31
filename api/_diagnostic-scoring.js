/**
 * Diagnostic Coach — Logique de scoring pure (testable sans IO).
 *
 * Règles (cf. spec Rayan 23/05/26) :
 *   - 3 options par Q : a=10pts (la plus saine) / b=5 / c=0
 *   - Pilier /20 = somme des 2 Q du pilier
 *   - Global /100 = somme des 5 piliers
 *   - Pilier "fragile" si score ≤ 10/20
 *   - Pilier prioritaire = score le plus bas (tiebreak ordre survie P1>P2>P4>P3>P5)
 */

const { PILLARS, PILLAR_TIEBREAK, QUESTIONS, BANDS } = require("./_diagnostic-content");

const OPTION_POINTS = { a: 10, b: 5, c: 0 };

/**
 * Valide la forme des réponses.
 * answers attendu : { Q1: "a"|"b"|"c", Q2: ..., ..., Q10: ... }
 * @throws {Error} si invalide
 */
function validateAnswers(answers) {
  if (!answers || typeof answers !== "object") {
    throw new Error("answers must be an object");
  }
  for (const qid of Object.keys(QUESTIONS)) {
    const val = answers[qid];
    if (!["a", "b", "c"].includes(val)) {
      throw new Error(`answer for ${qid} must be a/b/c, got ${JSON.stringify(val)}`);
    }
  }
  return true;
}

/**
 * Calcule les scores par pilier (sur 20) et le global (sur 100).
 * Retourne aussi le pilier le plus faible (avec tiebreak ordre survie).
 *
 * @param {Object} answers - { Q1: "a", ..., Q10: "c" }
 * @returns {{
 *   pillarScores: { P1: number, ..., P5: number },
 *   globalScore: number,
 *   weakPillar: string,
 *   fragilePillars: string[],   // tous les piliers ≤ 10
 *   band: { code, title, body }
 * }}
 */
function computeScores(answers) {
  validateAnswers(answers);

  // Score par pilier
  const pillarScores = {};
  for (const [pid, pillar] of Object.entries(PILLARS)) {
    pillarScores[pid] = pillar.questions.reduce(
      (sum, qid) => sum + OPTION_POINTS[answers[qid]],
      0
    );
  }

  // Global
  const globalScore = Object.values(pillarScores).reduce((a, b) => a + b, 0);

  // Pilier le plus bas, tiebreak par PILLAR_TIEBREAK (survie : P1>P2>P4>P3>P5)
  const lowestScore = Math.min(...Object.values(pillarScores));
  const tied = Object.keys(pillarScores).filter((p) => pillarScores[p] === lowestScore);
  const weakPillar = PILLAR_TIEBREAK.find((p) => tied.includes(p)) || tied[0];

  // Tous les piliers fragiles (≤ 10/20), pour le rapport
  const fragilePillars = PILLAR_TIEBREAK.filter(
    (p) => pillarScores[p] !== undefined && pillarScores[p] <= 10
  );

  // Bande
  const band = BANDS.find((b) => globalScore >= b.min && globalScore <= b.max) || BANDS[1];

  return { pillarScores, globalScore, weakPillar, fragilePillars, band };
}

module.exports = { computeScores, validateAnswers, OPTION_POINTS };
