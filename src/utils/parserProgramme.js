/**
 * parserProgramme.js — RB Perform FitCoach
 *
 * Parse le HTML exporté depuis le builder RB Perform.
 * Structure retournée :
 * {
 *   name, clientName, duration, tagline, objective,
 *   weeks: [{ weekNumber, name, sessions: [{ name, description, finisher, exercises: [...] }] }],
 *   totalWeeks, totalSessions
 * }
 *
 * Champ exercice :
 *   name, rawReps (ex: "4X8-10"), sets (number|null), reps (string after X),
 *   tempo, rir, rest, group, groupType, vidUrl, thumbUrl
 */

function getVal(doc, id) {
  const el = doc.getElementById(id);
  if (!el) return "";
  if (el.tagName === "TEXTAREA") return (el.value || el.textContent || "").trim();
  if (el.tagName === "SELECT") {
    const opt = el.querySelector("option[selected]");
    return opt ? (opt.value || opt.textContent || "").trim() : "";
  }
  return (el.value || el.getAttribute("value") || "").trim();
}

/**
 * Parse "4X8-10" → { sets: 4, reps: "8-10", rawReps: "4X8-10" }
 * Parse "8-10"   → { sets: null, reps: "8-10", rawReps: "8-10" }
 * Parse ""        → { sets: null, reps: null, rawReps: null }
 */
function parseReps(raw) {
  if (!raw || raw === "—" || raw === "") return { sets: null, reps: null, rawReps: null };
  const m = raw.match(/^(\d+)\s*[xX×]\s*(.+)$/);
  if (m) return { sets: parseInt(m[1], 10), reps: m[2].trim(), rawReps: raw };
  return { sets: null, reps: raw, rawReps: raw };
}

export function parseProgrammeHTML(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  /* ── Métadonnées globales ── */
  const name       = getVal(doc, "prog-name")     || "Programme";
  const clientName = getVal(doc, "client-name")   || "";
  const duration   = getVal(doc, "prog-duration") || "";
  const tagline    = getVal(doc, "prog-tagline")  || "";
  const objective  = getVal(doc, "prog-obj")      || "";

  /* ── Semaines ── */
  const weekBlocks = doc.querySelectorAll(".week-block");
  const weeks = [];

  weekBlocks.forEach((weekEl, wi) => {
    const sessions = [];
    weekEl.querySelectorAll(".seance-block").forEach((seanceEl, si) => {
      const fid = seanceEl.id.replace("seance-", "");

      const sessionName = (
        doc.getElementById(`sn-${fid}`)?.value ||
        doc.getElementById(`sn-${fid}`)?.getAttribute("value") ||
        ""
      ).trim() || `Séance ${si + 1}`;

      const description = (
        doc.getElementById(`sd-${fid}`)?.value ||
        doc.getElementById(`sd-${fid}`)?.getAttribute("value") ||
        ""
      ).trim();

      const finEl = doc.getElementById(`sf-${fid}`);
      const finisher = (finEl?.value || finEl?.textContent || "").trim();

      /* ── Exercices ── */
      const exercises = [];
      seanceEl.querySelectorAll(".exercise-item").forEach((exEl) => {
        const eid = exEl.id.replace("ex-", "");

        const exName = (
          doc.getElementById(`en-${eid}`)?.value ||
          doc.getElementById(`en-${eid}`)?.getAttribute("value") ||
          ""
        ).trim();
        if (!exName) return; // ignorer exercices vides

        /* Reps : stocke rawReps + sets + reps séparément */
        const repsRaw = (
          doc.getElementById(`er-${eid}`)?.value ||
          doc.getElementById(`er-${eid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const { sets, reps, rawReps } = parseReps(repsRaw);

        /* Tempo */
        const tempo = (
          doc.getElementById(`et-${eid}`)?.value ||
          doc.getElementById(`et-${eid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        /* RIR : select */
        const rirSel = doc.getElementById(`eri-${eid}`);
        let rir = null;
        if (rirSel) {
          const opt = rirSel.querySelector("option[selected]");
          const val = opt ? (opt.value || opt.textContent.trim()) : "";
          rir = val && val !== "—" ? val : null;
        }

        /* Repos */
        const rest = (
          doc.getElementById(`ers-${eid}`)?.value ||
          doc.getElementById(`ers-${eid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        /* Groupe superset */
        const group = (
          doc.getElementById(`eg-${eid}`)?.value ||
          doc.getElementById(`eg-${eid}`)?.getAttribute("value") ||
          ""
        ).trim().toUpperCase() || null;

        /* Type de groupe */
        const gtypeSel = doc.getElementById(`egt-${eid}`);
        let groupType = null;
        if (gtypeSel) {
          const opt = gtypeSel.querySelector("option[selected]");
          const val = opt ? (opt.value || opt.textContent.trim()) : "";
          groupType = val && val !== "Isolé" && val !== "" ? val : null;
        }

        /* Vidéo */
        const vidUrl = (
          doc.getElementById(`ev-${eid}`)?.value ||
          doc.getElementById(`ev-${eid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        const thumbUrl = (
          doc.getElementById(`eth-${eid}`)?.value ||
          doc.getElementById(`eth-${eid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        exercises.push({
          name: exName,
          rawReps,   // ← "4X8-10" tel que saisi — affiché directement dans le chip
          sets,      // ← number (4) ou null
          reps,      // ← string "8-10" ou null (utilisé comme placeholder input)
          tempo,
          rir,
          rest,
          group,
          groupType,
          vidUrl,
          thumbUrl,
        });
      });

      if (exercises.length > 0 || sessionName !== `Séance ${si + 1}`) {
        sessions.push({ name: sessionName, description, finisher, exercises });
      }
    });

    if (sessions.length > 0) {
      weeks.push({ weekNumber: wi + 1, name: `Semaine ${wi + 1}`, sessions });
    }
  });

  return {
    name, clientName, duration, tagline, objective,
    weeks,
    totalWeeks: weeks.length,
    totalSessions: weeks.reduce((a, w) => a + w.sessions.length, 0),
  };
}
