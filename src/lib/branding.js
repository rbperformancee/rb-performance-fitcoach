/**
 * Branding helpers — regles white label.
 *
 * REGLE ABSOLUE :
 *   - Coach proprietaire (rb.performancee@gmail.com) = interface RB Perform originale.
 *   - Tous les autres coachs = white label complet, pas de reference aux offres RB.
 *   - Les paiements se font hors-app : redirect vers rbperform.app (coach RB)
 *     ou vers le payment_link personnel du coach (white label).
 */

const RB_PERFORM_OWNER_EMAIL = "rb.performancee@gmail.com";
// Support email — centralisation pour les composants legaux/RGPD/footer
// (utilisateur a explicitement demande de garder Gmail pour l'instant)
const RB_SUPPORT_EMAIL = RB_PERFORM_OWNER_EMAIL;

/**
 * @param {object|null} coachInfo — coach data returned from useAuth (full_name, brand_name, email, ...)
 * @returns {boolean} true si c'est le coach proprietaire RB Perform (Rayan)
 */
export function isRbPerformOwner(coachInfo) {
  if (!coachInfo?.email) return false;
  return coachInfo.email.toLowerCase().trim() === RB_PERFORM_OWNER_EMAIL;
}

/**
 * @param {object|null} coachInfo
 * @returns {boolean} true si le client doit voir le white label
 */
export function isWhiteLabelClient(coachInfo) {
  // Si on n'a pas de coach assigne, on assume white label neutre (client en attente de code)
  if (!coachInfo) return true;
  return !isRbPerformOwner(coachInfo);
}

/**
 * Initiales a partir du nom. Max 2 lettres.
 */
export function getInitials(name) {
  if (!name) return "C";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Label du brand a afficher. Preferentiellement brand_name, fallback full_name.
 */
export function getBrandLabel(coachInfo) {
  return coachInfo?.brand_name?.trim() || coachInfo?.full_name?.trim() || "Ton coach";
}

export { RB_PERFORM_OWNER_EMAIL, RB_SUPPORT_EMAIL };
