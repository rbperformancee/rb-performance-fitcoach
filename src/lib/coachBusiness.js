/**
 * Calculs business du coach : MRR, retention, score, objectif, projections.
 *
 * Prix mensuels par plan (EUR) :
 *   - 8sem  : 39€/mois
 *   - 3m    : 120€/mois
 *   - 6m    : 110€/mois
 *   - 12m   : 100€/mois
 */

export const PLAN_MRR = {
  "8sem": 39,
  "3m": 120,
  "6m": 110,
  "12m": 100,
};

export const PLAN_MONTHS = {
  "8sem": 2,
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

/**
 * Calcule le MRR du coach depuis sa liste de clients.
 * Ne compte que les abonnements actifs (status === 'active').
 */
export function calculateMRR(clients = []) {
  return clients.reduce((sum, c) => {
    if (c.subscription_status !== "active" || !c.subscription_plan) return sum;
    return sum + (PLAN_MRR[c.subscription_plan] || 0);
  }, 0);
}

/**
 * Compte les clients actifs (subscription active).
 */
export function countActiveClients(clients = []) {
  return clients.filter((c) => c.subscription_status === "active").length;
}

/**
 * Retention : % des clients crees il y a plus de 30 jours qui ont encore
 * un abonnement actif. Proxy du taux de renouvellement.
 */
export function calculateRetention(clients = []) {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 86400000;
  const oldClients = clients.filter((c) => {
    if (!c.created_at) return false;
    return now - new Date(c.created_at).getTime() > THIRTY_DAYS;
  });
  if (oldClients.length === 0) return 0;
  const stillActive = oldClients.filter((c) => c.subscription_status === "active").length;
  return Math.round((stillActive / oldClients.length) * 100);
}

/**
 * Duree moyenne des abonnements en jours (pour les clients avec dates).
 */
export function averageSubscriptionDuration(clients = []) {
  const withDates = clients.filter((c) => c.subscription_start_date);
  if (withDates.length === 0) return 0;
  const now = Date.now();
  const total = withDates.reduce((sum, c) => {
    const start = new Date(c.subscription_start_date).getTime();
    return sum + (now - start) / 86400000;
  }, 0);
  return Math.round(total / withDates.length);
}

/**
 * Activity score : % des clients actifs (logue dans les 7 derniers jours).
 * Necessite c._inactiveDays calcule en amont.
 */
export function calculateActivityScore(clients = []) {
  const total = clients.length;
  if (total === 0) return 0;
  const active7d = clients.filter((c) => (c._inactiveDays ?? 999) < 7).length;
  return Math.round((active7d / total) * 100);
}

/**
 * Business score 0-100 = retention (40%) + activity (30%) + revenue maturity (30%).
 * Revenue maturity : plus le MRR est haut, plus le score grimpe (plateau a 3000€).
 */
export function calculateBusinessScore({ retention, activity, mrr }) {
  const retentionScore = Math.min(100, retention) * 0.4;
  const activityScore = Math.min(100, activity) * 0.3;
  const revenueMaturity = Math.min(100, (mrr / 3000) * 100) * 0.3;
  return Math.round(retentionScore + activityScore + revenueMaturity);
}

/**
 * Phrase motivationnelle selon le score.
 */
export function getScoreMessage(score) {
  if (score >= 85) return "Coach d'elite. Tu domines le jeu.";
  if (score >= 70) return "Excellent. Tu construis une vraie business.";
  if (score >= 50) return "Solide. Continue, ca monte.";
  if (score >= 30) return "Bon debut. Focus sur la retention.";
  return "Premiers pas. Chaque client compte double.";
}

/**
 * Couleur du score selon le palier.
 */
export function getScoreColor(score) {
  if (score >= 70) return "#02d1ba";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

/**
 * Projection annualisee du MRR.
 */
export function annualizedRevenue(mrr) {
  return mrr * 12;
}

/**
 * Combien de clients manquent pour atteindre l'objectif ?
 * Suppose un prix moyen par plan weighted, ou on prend le prix median.
 */
export function clientsNeededForGoal(currentMrr, goal, clients = []) {
  if (goal <= 0 || currentMrr >= goal) return 0;
  // Prix moyen des plans actifs du coach (sinon 110€/mois par defaut)
  const active = clients.filter((c) => c.subscription_status === "active" && c.subscription_plan);
  const avg = active.length > 0
    ? active.reduce((s, c) => s + PLAN_MRR[c.subscription_plan], 0) / active.length
    : 110;
  const delta = goal - currentMrr;
  return Math.ceil(delta / avg);
}

/**
 * Prochain palier rond a atteindre (500, 1000, 2000, 3000, 5000, 10000).
 */
export function nextMilestone(currentMrr) {
  const milestones = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000];
  return milestones.find((m) => m > currentMrr) || currentMrr + 5000;
}

/**
 * Comparaison variation mois en cours vs mois dernier.
 * Actuellement : simplifie. Return { current, previous, variation_pct }.
 * Pour le vrai delta, il faudrait les snapshots coach_business_snapshots.
 */
export function mrrVariation(current, previous) {
  if (!previous || previous === 0) return { variation: 0, pct: 0, direction: "up" };
  const variation = current - previous;
  const pct = Math.round((variation / previous) * 100);
  return {
    variation,
    pct,
    direction: variation > 0 ? "up" : variation < 0 ? "down" : "flat",
  };
}
