// src/lib/weekProgress.js
//
// Modèle "objectifs semaine" remplaçant l'ancien calendrier rigide jour par jour.
//
// Avant : chaque séance était mappée à un jour précis (training_days), un saut
//   cascade-shiftait tout (skipped_dates → effet domino confus pour l'athlète).
//
// Maintenant : chaque semaine a un nombre d'objectif de séances. L'athlète les
//   fait dans l'ordre quand il veut. Plus de notion de "missed" — juste
//   "fait" vs "à faire". Le coach donne une structure idéale (jours
//   recommandés + ordre) mais l'athlète peut décaler librement.
//
// API :
//   computeCurrentWeekIdx(programmeMeta) → number | null
//   computeWeekProgress({ programme, weekIdx, doneSet, restartedAt }) → {
//     target,            // nombre de séances normales (non-bonus) de la sem
//     done,              // nombre validées
//     sessions: [{ idx, name, isBonus, status, focus }],
//     nextSession: {...} | null,  // la prochaine à faire
//     allDone,           // boolean : toutes les séances normales faites
//   }
//   weekdayLabelsForRecommended(trainingDays, locale) → "Lun-Mer-Ven-Sam"

// Index = 1 (Lundi) → 7 (Dimanche). Cohérent avec training_days en DB.
const WEEKDAY_LABELS_FR = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKDAY_LABELS_EN = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_MS = 86400000;

/**
 * Calcule l'index de la semaine en cours pour l'athlète, basé sur
 * start_date et l'écoulement du temps. Indépendant de skipped_dates
 * (on n'auto-shift plus le calendrier).
 *
 * @returns {number | null} 0-indexed week, ou null si pas démarré, ou -1 si pas commencé
 */
export function computeCurrentWeekIdx(programmeMeta) {
  if (!programmeMeta?.start_date) return null;
  const start = new Date(programmeMeta.start_date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - start.getTime()) / DAY_MS);
  if (days < 0) return -1; // pas encore commencé
  return Math.floor(days / 7);
}

/**
 * Calcule la progression de la semaine donnée.
 *
 * @param {object} args
 * @param {object} args.programme        - { weeks: [{ sessions: [{nom, focus, bonus}] }] }
 * @param {number} args.weekIdx          - 0-indexed
 * @param {Set<string>} args.doneSet     - clés "wIdx-sIdx" des sessions validées
 * @param {function} [args.sessionFilter] - Optionnel. Si passé, exclut du résultat
 *   les sessions pour lesquelles filter(s) === false. Les index d'origine sont
 *   PRÉSERVÉS (pour rester cohérent avec doneSet / session_completions).
 * @returns {object | null}
 */
export function computeWeekProgress({ programme, weekIdx, doneSet, sessionFilter }) {
  if (!programme?.weeks || weekIdx < 0 || weekIdx >= programme.weeks.length) {
    return null;
  }
  const weekSessions = programme.weeks[weekIdx]?.sessions || [];

  // Sessions = mapping ordonné, avec status calculé.
  // - done    : validée (présente dans doneSet)
  // - next    : prochaine non-validée non-bonus
  // - todo    : non-validée, après "next"
  // - bonus   : optionnelle, ne compte pas dans target
  //
  // sessionFilter : sessions filtrées OUT ne sont pas retournées, ne comptent
  // ni dans target ni dans done, ne peuvent pas être "next". Les index gardent
  // leur valeur d'origine (pas de re-numérotation).
  let nextFound = false;
  const sessions = weekSessions
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => (sessionFilter ? sessionFilter(s) : true))
    .map(({ s, idx }) => {
      const isBonus = !!s?.bonus;
      const key = `${weekIdx}-${idx}`;
      const isDone = doneSet?.has(key) || false;

      let status;
      if (isDone) {
        status = "done";
      } else if (isBonus) {
        status = "bonus";
      } else if (!nextFound) {
        status = "next";
        nextFound = true;
      } else {
        status = "todo";
      }

      return {
        idx,
        name: s?.nom || s?.title || `Séance ${idx + 1}`,
        focus: s?.focus || s?.muscle_group || "",
        isBonus,
        status,
      };
    });

  const target = sessions.filter((s) => !s.isBonus).length;
  const done = sessions.filter((s) => s.status === "done" && !s.isBonus).length;
  const nextSession = sessions.find((s) => s.status === "next") || null;
  const allDone = done >= target;

  return { target, done, sessions, nextSession, allDone };
}

/**
 * Convertit training_days [1,3,5,6] → "Lun · Mer · Ven · Sam"
 *
 * @param {number[]} trainingDays
 * @param {"fr"|"en"} locale
 */
export function weekdayLabelsForRecommended(trainingDays, locale = "fr") {
  if (!Array.isArray(trainingDays) || trainingDays.length === 0) return "";
  const labels = locale === "en" ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_FR;
  return trainingDays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => labels[d] || "")
    .filter(Boolean)
    .join(" · ");
}

/**
 * Helper pour construire le Set des sessions validées à partir des rows
 * session_completions (Supabase) + du localStorage fallback.
 *
 * @param {Array} cloudRows  - rows from session_completions
 * @returns {Set<string>}    - clés "wIdx-sIdx"
 */
export function buildDoneSet(cloudRows) {
  const out = new Set();
  (cloudRows || []).forEach((r) => {
    if (r?.week_idx != null && r?.session_idx != null && r?.validated_at) {
      out.add(`${r.week_idx}-${r.session_idx}`);
    }
  });
  return out;
}
