// src/lib/date.js
//
// Helpers de date timezone-aware.
//
// Pourquoi : on utilisait partout `new Date().toISOString().slice(0,10)` ou
// `.split("T")[0]` ce qui renvoie la date UTC. À Paris (UTC+2 en été), entre
// 00h00 et 02h00 du matin, ça décale d'un jour : un athlète qui logue à 00h30
// voit son log filé sous la date d'hier (côté UTC), et il n'apparaît pas dans
// "aujourd'hui" jusqu'à 02h. Camille s'entraîne tard, ça la touche.
//
// → `todayLocal()` retourne la date locale au format YYYY-MM-DD.

/**
 * Date du jour locale au format YYYY-MM-DD.
 * Aligné sur le fuseau de l'appareil (Date.getFullYear/getMonth/getDate).
 * @param {Date} [d] - optionnel, défaut = maintenant.
 * @returns {string}
 */
export function todayLocal(d) {
  const x = d || new Date();
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default todayLocal;
