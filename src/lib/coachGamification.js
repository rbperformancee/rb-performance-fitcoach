/**
 * Gamification coach : badges + streak + classement.
 *
 * Tous les calculs purs (aucune query DB).
 * Les badges sont auto-unlocked cote client via checkAndUnlockBadges().
 */

export const BADGES = [
  {
    id: "first_client",
    label: "Premier client",
    description: "Premier client actif dans ton espace",
    icon: "sparkles",
    color: "#02d1ba",
    tier: 1,
  },
  {
    id: "five_clients",
    label: "5 clients actifs",
    description: "5 clients simultanes avec abonnement actif",
    icon: "users",
    color: "#02d1ba",
    tier: 2,
  },
  {
    id: "ten_clients",
    label: "10 clients actifs",
    description: "10 clients simultanes avec abonnement actif",
    icon: "users",
    color: "#a78bfa",
    tier: 3,
  },
  {
    id: "twenty_clients",
    label: "20 clients actifs",
    description: "20 clients simultanes — coach a temps plein",
    icon: "users",
    color: "#fbbf24",
    tier: 4,
  },
  {
    id: "retention_90",
    label: "90% retention",
    description: "Taux de renouvellement exceptionnel",
    icon: "trending-up",
    color: "#02d1ba",
    tier: 3,
  },
  {
    id: "consistent_coach",
    label: "Coach consistant",
    description: "30 jours consecutifs avec 80%+ clients actifs",
    icon: "flame",
    color: "#f97316",
    tier: 3,
  },
  {
    id: "transformation",
    label: "Transformation prouvee",
    description: "Premier client avec -5kg ou objectif atteint",
    icon: "trophy",
    color: "#fbbf24",
    tier: 3,
  },
  {
    id: "six_months",
    label: "Coach expert",
    description: "6 mois sur la plateforme",
    icon: "target",
    color: "#818cf8",
    tier: 3,
  },
  {
    id: "first_revenue",
    label: "Premier euro",
    description: "Premier MRR genere",
    icon: "lightning",
    color: "#02d1ba",
    tier: 1,
  },
  {
    id: "mrr_1000",
    label: "1000 €/mois",
    description: "Premiere barre des 1000 euros MRR atteinte",
    icon: "chart",
    color: "#a78bfa",
    tier: 3,
  },
  {
    id: "mrr_3000",
    label: "3000 €/mois",
    description: "3000 euros de revenus recurrents",
    icon: "chart",
    color: "#fbbf24",
    tier: 4,
  },
];

/**
 * Verifie quels badges sont debloques selon l'etat actuel.
 * Retourne la liste des badge_id a unlock.
 */
export function checkBadgeEligibility({ activeClients, retention, mrr, coachCreatedAt, clientsWithWeightLoss, consistentDays }) {
  const earned = [];
  if (activeClients >= 1) earned.push("first_client");
  if (activeClients >= 5) earned.push("five_clients");
  if (activeClients >= 10) earned.push("ten_clients");
  if (activeClients >= 20) earned.push("twenty_clients");
  if (retention >= 90 && activeClients >= 3) earned.push("retention_90");
  if (consistentDays >= 30) earned.push("consistent_coach");
  if (clientsWithWeightLoss >= 1) earned.push("transformation");
  if (coachCreatedAt) {
    const monthsActive = (Date.now() - new Date(coachCreatedAt).getTime()) / (30 * 86400000);
    if (monthsActive >= 6) earned.push("six_months");
  }
  if (mrr > 0) earned.push("first_revenue");
  if (mrr >= 1000) earned.push("mrr_1000");
  if (mrr >= 3000) earned.push("mrr_3000");
  return earned;
}

/**
 * Streak coach = nombre de jours consecutifs ou au moins 80% des clients
 * ont ete actifs (au moins 1 log).
 *
 * Input : snapshots = [{snapshot_date, activity_score}, ...] ordered desc
 * Retourne { current, best }
 */
export function calculateCoachStreak(snapshots = []) {
  if (!snapshots || snapshots.length === 0) return { current: 0, best: 0 };

  let current = 0;
  let best = 0;
  let run = 0;

  // Les snapshots doivent etre tries du plus recent au plus ancien
  const sorted = [...snapshots].sort((a, b) => new Date(b.snapshot_date) - new Date(a.snapshot_date));

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if ((s.activity_score || 0) >= 80) {
      run++;
      if (i === 0) current = run; // jour le plus recent = streak en cours
      best = Math.max(best, run);
    } else {
      if (i === 0) current = 0;
      run = 0;
    }
  }

  return { current, best };
}

/**
 * Calcule le rang et percentile d'un coach parmi tous les coachs actifs.
 * Input : currentScore + allScores (array des scores de tous les coachs).
 */
export function calculatePlatformRank(currentScore, allScores = []) {
  if (allScores.length === 0) return { rank: 1, total: 1, percentile: 100 };
  const sorted = [...allScores].sort((a, b) => b - a); // desc
  const rank = sorted.findIndex((s) => s <= currentScore) + 1;
  const total = sorted.length;
  const percentile = Math.round(((total - rank + 1) / total) * 100);
  return { rank: rank || total, total, percentile };
}

/**
 * Phrase motivationnelle selon percentile.
 */
export function rankPhrase(percentile) {
  if (percentile >= 80) return "Tu es dans le top 20% des coachs de la plateforme.";
  if (percentile >= 50) return `Tu es dans le top ${100 - percentile}% des coachs.`;
  return "Tu peux grimper. Focus sur la retention.";
}
