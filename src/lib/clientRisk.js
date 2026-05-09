// clientRisk.js — heuristique simple "à-risque" par client.
//
// Score basé sur 3 signaux composables :
//   - Inactivité : pas de log >7j (alors qu'il a un programme actif)
//   - Bilan manqué : pas de weekly_checkin cette semaine
//   - Habits drop : compliance habits du jour à 0% sur 3+ jours d'affilée
//
// Score sortie : 0-100. >=60 = badge rouge "à risque", >=40 = badge ambre.
// On compose, pas un seul signal isolé — évite le faux-positif.
//
// L'idée : du data-driven simple qui aide le coach à prioritiser, pas
// un ML ranking complexe. Recalculé chaque fois que le ClientCard render.

export function computeClientRisk({
  client,
  hasActiveProgramme,
  weeklyCheckinSubmitted,    // bool : ce client a soumis cette semaine ?
  habitsCompliancePct,        // 0-100 : moyenne sur 7 jours, null si pas d'habits
}) {
  if (!client) return { score: 0, level: "ok", reasons: [] };
  // Si pas de programme actif → on peut pas vraiment statuer (newcomer ou churned)
  if (!hasActiveProgramme) return { score: 0, level: "ok", reasons: [] };

  let score = 0;
  const reasons = [];

  // 1. Inactivité (pondération max 50pts)
  if (client._lastActivity) {
    const days = Math.floor((Date.now() - new Date(client._lastActivity)) / 86400000);
    if (days >= 14) { score += 50; reasons.push(`inactif ${days}j`); }
    else if (days >= 7) { score += 35; reasons.push(`inactif ${days}j`); }
    else if (days >= 4) { score += 15; reasons.push(`inactif ${days}j`); }
  } else {
    // Pas d'activité du tout depuis l'inscription : 60pts
    score += 60;
    reasons.push("aucune activité");
  }

  // 2. Bilan hebdo manqué (15pts)
  if (weeklyCheckinSubmitted === false) {
    score += 15;
    reasons.push("bilan manqué");
  }

  // 3. Habits compliance basse (max 25pts)
  if (typeof habitsCompliancePct === "number") {
    if (habitsCompliancePct < 25) { score += 25; reasons.push("habits drop"); }
    else if (habitsCompliancePct < 50) { score += 12; reasons.push("habits faibles"); }
  }

  score = Math.min(100, score);
  let level = "ok";
  if (score >= 60) level = "high";
  else if (score >= 35) level = "medium";

  return { score, level, reasons };
}
