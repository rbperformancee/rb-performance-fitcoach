/**
 * Auto-detection du pipeline status d'un client base sur ses metriques.
 *
 * REGLE :
 *   - subscription expire ou demandee suppression → 'completed'
 *   - subscription_end_date <=14j → 'to_renew'
 *   - inactif >=7j ou churn risk eleve → 'at_risk'
 *   - subscription active + recent → 'active'
 *   - sinon (nouveau, pas encore d'abo) → 'new'
 *
 * Ne tourne que si le coach n'a PAS deplace manuellement le client
 * (sentinel : on ne touche pas a 'completed' ou 'to_renew' une fois set).
 */
import { calculateChurnRisk } from "./coachIntelligence";

export function suggestPipelineStatus(client) {
  // Subscription expiree → completed
  if (client.subscription_status && client.subscription_status !== "active") {
    return "completed";
  }

  // Si subscription_end_date proche (<=14j)
  if (client.subscription_end_date) {
    const daysLeft = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return "completed";
    if (daysLeft <= 14) return "to_renew";
  }

  // Inactif ou churn risk eleve
  const inactive = client._inactiveDays ?? 999;
  const risk = client._sessionsLast7d !== undefined ? calculateChurnRisk(client) : 0;
  if (inactive >= 7 || risk >= 60) return "at_risk";

  // Subscription active = active
  if (client.subscription_status === "active") return "active";

  // Default : new
  return "new";
}

/**
 * Determine si on peut auto-update le status du client.
 * On RESPECTE les actions manuelles du coach.
 *
 * Regle :
 *   - On peut auto-bouger 'new' → 'active' ou 'at_risk'
 *   - On peut auto-bouger 'active' → 'at_risk' ou 'to_renew' ou 'completed'
 *   - On peut auto-bouger 'at_risk' → 'active' (si remet a logger) ou 'to_renew' / 'completed'
 *   - On NE TOUCHE PAS a 'to_renew' (le coach gere) sauf vers 'completed'
 *   - On NE TOUCHE PAS a 'completed' (final state)
 */
export function canAutoUpdate(currentStatus, suggestedStatus) {
  if (currentStatus === suggestedStatus) return false;
  if (currentStatus === "completed") return false; // final
  if (currentStatus === "to_renew" && suggestedStatus !== "completed") return false; // coach gere
  return true;
}
