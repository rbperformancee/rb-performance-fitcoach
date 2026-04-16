/**
 * Intelligence predictive pour le coach :
 *   - Score de risque de churn (0-100)
 *   - Profil comportemental (Champion / Regulier / Irregulier / En difficulte)
 *   - Niveau athletique auto (Debutant / Intermediaire / Avance / Elite)
 *   - Probabilite de renouvellement (%)
 *   - Meilleur moment pour contacter (heure + jour)
 *   - Message de relance pre-redige
 *
 * Tous les calculs sont PURS (aucune requete DB ici).
 * Les composants fetch les donnees et passent les objets enrichis.
 */

// ===== CHURN RISK =====

/**
 * Score de risque de churn 0-100.
 * Signaux ponderes :
 *   - Inactivite (40%) : 0j=0pts, 3j=25pts, 7j=60pts, 14j+=100pts
 *   - Baisse nutrition loggee (20%) : -50% sur 7j vs 30j precedents
 *   - RPE en hausse (20%) : RPE 7j > RPE 30j precedents de 1+ pts
 *   - Poids non logue recent (10%)
 *   - Derniere session avec RPE >= 4 (10%)
 */
export function calculateChurnRisk(client) {
  let score = 0;
  const days = client._inactiveDays ?? 999;

  // 1. Inactivite (40% du poids)
  if (days >= 14) score += 40;
  else if (days >= 7) score += 28;
  else if (days >= 3) score += 12;
  // <3j = 0

  // 2. Nutrition tracking drop
  const n7 = client._nutriLogs7d ?? 0;
  const n30 = (client._nutriLogs30d ?? 0) / 4.28; // normaliser sur 7j
  if (n30 > 2 && n7 < n30 * 0.5) score += 20;
  else if (n30 > 2 && n7 < n30 * 0.75) score += 10;

  // 3. RPE en hausse (surcharge / fatigue)
  const rpe7 = client._avgRpe7d ?? null;
  const rpe30 = client._avgRpe30d ?? null;
  if (rpe7 !== null && rpe30 !== null) {
    if (rpe7 >= rpe30 + 1) score += 20;
    else if (rpe7 >= rpe30 + 0.5) score += 10;
  }

  // 4. Pas de pesee recente
  const daysSinceLastWeight = client._daysSinceLastWeight ?? 999;
  if (daysSinceLastWeight > 14) score += 10;
  else if (daysSinceLastWeight > 7) score += 5;

  // 5. Derniere session RPE eleve (>=4) = surcharge
  if (client._lastRpe && client._lastRpe >= 4) score += 10;

  return Math.min(100, Math.round(score));
}

/**
 * Categorise un score de risque pour affichage.
 */
export function churnLevel(score) {
  if (score >= 70) return { level: "critique", color: "#ff6b6b", label: "CRITIQUE" };
  if (score >= 40) return { level: "eleve", color: "rgba(255,255,255,0.6)", label: "ELEVE" };
  if (score >= 20) return { level: "modere", color: "rgba(255,255,255,0.4)", label: "MODERE" };
  return { level: "faible", color: "#00C9A7", label: "FAIBLE" };
}

/**
 * Message de relance pre-redige selon le profil du client.
 * Le coach peut copier-coller ou modifier.
 */
export function churnMessage(client, score) {
  const first = client.full_name?.split(" ")[0] || "champion";
  const days = client._inactiveDays ?? 0;
  const level = churnLevel(score).level;

  if (days >= 14) {
    return `Salut ${first}, ca fait ${days} jours qu'on s'est pas vus sur l'app. Dis-moi ce qui se passe — je suis la pour t'aider a reprendre, peu importe le rythme. Un appel cette semaine ?`;
  }
  if (days >= 7) {
    return `${first}, j'ai remarque que tu t'es pas connecte depuis ${days} jours. Tout va bien ? Dis-moi si tu as besoin d'ajuster le programme ou si tu veux qu'on prenne 15 minutes pour remettre les choses a plat.`;
  }
  if (level === "eleve") {
    return `${first}, je vois une baisse de regularite ces derniers jours. Une petite seance meme legere ce soir pour garder le momentum ? Tu m'envoies un message si besoin d'ajuster.`;
  }
  return `${first}, je pense a toi. Pete un message quand tu fais ta prochaine seance pour que je puisse checker ta progression.`;
}

// ===== PROFIL COMPORTEMENTAL =====

/**
 * Determine le profil du client base sur 4 criteres :
 *   - Frequence de connexion (7j)
 *   - Taux de completion des seances
 *   - Regularite nutrition
 *   - Qualite sommeil
 */
export function calculateBehavioralProfile(client) {
  const days = client._inactiveDays ?? 999;
  const sessionsWeek = client._sessionsLast7d ?? 0;
  const avgRpe = client._avgRpe7d ?? 0;
  const nutritionDays = client._nutritionDaysLogged7d ?? 0;
  const avgSleep = client._avgSleep7d ?? 0;

  let score = 0;
  // Activite : max 40
  if (days <= 1) score += 40;
  else if (days <= 3) score += 30;
  else if (days <= 7) score += 15;
  // Seances : max 30 (3+ seances/7j = top)
  if (sessionsWeek >= 4) score += 30;
  else if (sessionsWeek >= 3) score += 25;
  else if (sessionsWeek >= 2) score += 15;
  else if (sessionsWeek >= 1) score += 8;
  // Nutrition regularite : max 20
  if (nutritionDays >= 6) score += 20;
  else if (nutritionDays >= 4) score += 14;
  else if (nutritionDays >= 2) score += 7;
  // Sommeil : max 10
  if (avgSleep >= 7) score += 10;
  else if (avgSleep >= 6) score += 6;

  if (score >= 80) return { id: "champion",   label: "Champion",    color: "#00C9A7", bg: "rgba(0,201,167,0.12)", border: "rgba(0,201,167,0.3)" };
  if (score >= 55) return { id: "regulier",   label: "Regulier",    color: "#00C9A7", bg: "rgba(0,201,167,0.1)",  border: "rgba(0,201,167,0.25)" };
  if (score >= 30) return { id: "irregulier", label: "Irregulier",  color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" };
  return             { id: "difficulte", label: "En difficulte", color: "#ff6b6b", bg: "rgba(255,107,107,0.1)",  border: "rgba(255,107,107,0.25)" };
}

// ===== NIVEAU ATHLETIQUE =====

/**
 * Niveau automatique base sur :
 *   - Nombre total de seances loguees
 *   - RPE moyen sur 30j (plus bas = plus fort)
 *   - Progression des charges (Elo-like)
 */
export function calculateAthleticLevel(client) {
  const totalSessions = client._totalSessions ?? 0;
  const avgRpe = client._avgRpe30d ?? 3;

  if (totalSessions >= 60 && avgRpe <= 2.5) return { id: "elite",        label: "Elite",        color: "#a78bfa" };
  if (totalSessions >= 30 && avgRpe <= 3)   return { id: "avance",       label: "Avance",       color: "#02d1ba" };
  if (totalSessions >= 12)                  return { id: "intermediaire", label: "Intermediaire", color: "rgba(255,255,255,0.6)" };
  return                                           { id: "debutant",      label: "Debutant",     color: "rgba(255,255,255,0.5)" };
}

// ===== PROBABILITE DE RENOUVELLEMENT =====

/**
 * Probabilite (0-100%) qu'un client renouvelle son abonnement.
 * Base sur : activite, adherence, nutrition, profil comportemental.
 */
export function calculateRenewalProbability(client) {
  const days = client._inactiveDays ?? 999;
  const sessionsWeek = client._sessionsLast7d ?? 0;
  const profile = calculateBehavioralProfile(client);
  const churnRisk = calculateChurnRisk(client);

  let proba = 50;
  // Profile comportemental
  if (profile.id === "champion")   proba += 35;
  else if (profile.id === "regulier")  proba += 20;
  else if (profile.id === "irregulier") proba -= 10;
  else proba -= 25;
  // Inactivite
  if (days <= 2) proba += 15;
  else if (days <= 7) proba += 5;
  else if (days >= 14) proba -= 20;
  // Seances recentes
  if (sessionsWeek >= 3) proba += 10;
  // Churn risk inversement
  proba -= churnRisk * 0.3;

  return Math.max(0, Math.min(100, Math.round(proba)));
}

export function renewalColor(pct) {
  if (pct >= 70) return "#00C9A7";
  if (pct >= 40) return "rgba(255,255,255,0.5)";
  return "#ff6b6b";
}

export function renewalAction(pct, client) {
  const first = client.full_name?.split(" ")[0] || "le client";
  if (pct >= 70) return `${first} est bien engage. Renouvelle naturellement — envoie juste un message chaleureux.`;
  if (pct >= 40) return `${first} est a convaincre. Propose un appel pour faire le bilan et discuter du prochain cycle.`;
  return `${first} est en decrochage. Appel urgent recommande. Propose un ajustement du programme.`;
}

// ===== MEILLEUR MOMENT POUR CONTACTER =====

const JOURS_FR = ["Dim", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Determine le meilleur moment pour contacter le client a partir
 * de son historique de logs (exercise_logs.logged_at).
 * Retourne { dayName, hour, count } ou null si pas assez de donnees.
 */
export function bestContactMoment(logTimestamps = []) {
  if (!logTimestamps || logTimestamps.length < 5) return null;

  const buckets = {}; // "DAY_HOUR" -> count
  for (const ts of logTimestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    if (isNaN(d)) continue;
    const key = `${d.getDay()}_${d.getHours()}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }
  const sorted = Object.entries(buckets).sort(([, a], [, b]) => b - a);
  if (sorted.length === 0) return null;
  const [key, count] = sorted[0];
  const [day, hour] = key.split("_").map(Number);
  return { day, hour, dayName: JOURS_FR[day], count };
}

/**
 * Phrase formatee pour le meilleur moment.
 */
export function bestContactText(client, moment) {
  const first = client.full_name?.split(" ")[0] || "Ce client";
  if (!moment) return `${first} : pas assez de donnees encore pour predire le meilleur moment.`;
  const h = String(moment.hour).padStart(2, "0");
  return `${first} est generalement actif le ${moment.dayName} vers ${h}h — c'est le meilleur moment pour le contacter.`;
}
