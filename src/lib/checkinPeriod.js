/**
 * checkinPeriod — fréquence des bilans (hebdo / quinzaine / mensuel).
 *
 * weekly_checkins.week_start sert d'ancre de période :
 *   - weekly   → lundi de la semaine
 *   - biweekly → lundi de la quinzaine (parité de semaine vs un lundi pivot)
 *   - monthly  → 1er du mois
 * La contrainte UNIQUE (client_id, week_start) garantit 1 bilan par période.
 */

export const FREQUENCIES = ["weekly", "biweekly", "monthly"];

export const FREQ_LABELS = {
  weekly: "Hebdomadaire",
  biweekly: "Toutes les 2 semaines",
  monthly: "Mensuel",
};

// Date locale au format YYYY-MM-DD (évite les décalages de fuseau d'ISO).
function fmtLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOf(date) {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  return x;
}

// Lundi pivot pour la parité des quinzaines (lundi 1er janvier 2024).
const PIVOT = (() => { const d = new Date(2024, 0, 1); d.setHours(0, 0, 0, 0); return d; })();

/** Date d'ancre de la période courante pour une fréquence donnée. */
export function periodStart(freq, date = new Date()) {
  if (freq === "monthly") {
    const d = new Date(date);
    return fmtLocal(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  const m = mondayOf(date);
  if (freq === "biweekly") {
    const weeks = Math.round((m - PIVOT) / (7 * 24 * 3600 * 1000));
    if (((weeks % 2) + 2) % 2 === 1) m.setDate(m.getDate() - 7);
  }
  return fmtLocal(m);
}

/** Complément de phrase : « Bilan <de la semaine> ». */
export function periodNoun(freq) {
  if (freq === "monthly") return "du mois";
  if (freq === "biweekly") return "de la quinzaine";
  return "de la semaine";
}

/** Libellé d'une période à partir de son ancre (week_start). */
export function periodLabel(freq, ws) {
  const d = new Date(ws + "T00:00:00");
  if (freq === "monthly") {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  const prefix = freq === "biweekly" ? "Quinzaine du " : "Semaine du ";
  return prefix + d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
