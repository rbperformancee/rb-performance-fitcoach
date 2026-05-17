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
 * Parse "4X8-10"          → { sets: 4, reps: "8-10", rawReps: "4X8-10" }
 * Parse "2X4-6  2X8-10"   → { sets: 4, reps: "4-6 puis 8-10", rawReps: "2X4-6  2X8-10" }
 *                            (multi-bloc : somme des series, reps concatenees)
 * Parse "8-10"             → { sets: null, reps: "8-10", rawReps: "8-10" }
 * Parse ""                  → { sets: null, reps: null, rawReps: null }
 */
export function parseReps(raw) {
  if (!raw || raw === "—" || raw === "") return { sets: null, reps: null, rawReps: null };
  const trimmed = raw.trim();

  // Tokenise les blocs "NxR" successifs separes par 2+ espaces.
  // 2+ espaces = volonte explicite du coach (un seul espace est ambigu :
  // "3X45 secondes" a un espace dans les reps, pas un separateur).
  const tokenRe = /(\d+)\s*[xX×]\s*([^]+?)(?=\s{2,}\d+\s*[xX×]|$)/g;
  const blocks = [];
  let m;
  while ((m = tokenRe.exec(trimmed)) !== null) {
    blocks.push({ sets: parseInt(m[1], 10), reps: m[2].trim() });
    if (m.index === tokenRe.lastIndex) tokenRe.lastIndex++; // safety
  }

  if (blocks.length === 0) {
    // Pyramide / progression : "8-10", "12-10-8", "10-6-4-12" — chaque valeur = une série
    if (/^\d+(\s*[-–]\s*\d+)+$/.test(trimmed)) {
      const count = trimmed.split(/\s*[-–]\s*/).filter(Boolean).length;
      return { sets: count, reps: trimmed, rawReps: raw };
    }
    // Nombre seul "5" → 1 série
    if (/^\d+$/.test(trimmed)) {
      return { sets: 1, reps: trimmed, rawReps: raw };
    }
    return { sets: null, reps: trimmed, rawReps: raw };
  }

  if (blocks.length === 1) {
    return { sets: blocks[0].sets, reps: blocks[0].reps, rawReps: raw };
  }

  // Multi-bloc : somme des series, reps en sequence
  const totalSets = blocks.reduce((s, b) => s + b.sets, 0);
  const reps = blocks.map(b => b.reps).join(" puis ");
  return { sets: totalSets, reps, rawReps: raw };
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

      /* ── Runs / cardio prescrits (.run-item) ── */
      const runs = [];
      seanceEl.querySelectorAll(".run-item").forEach((runEl) => {
        const rid = runEl.id.replace("run-", "");
        const rName = (
          doc.getElementById(`rn-${rid}`)?.value ||
          doc.getElementById(`rn-${rid}`)?.getAttribute("value") ||
          ""
        ).trim();
        if (!rName) return; // skip vides

        const distance = (
          doc.getElementById(`rd-${rid}`)?.value ||
          doc.getElementById(`rd-${rid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        const duration = (
          doc.getElementById(`rdu-${rid}`)?.value ||
          doc.getElementById(`rdu-${rid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        const bpm = (
          doc.getElementById(`rbpm-${rid}`)?.value ||
          doc.getElementById(`rbpm-${rid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        const rRest = (
          doc.getElementById(`rrs-${rid}`)?.value ||
          doc.getElementById(`rrs-${rid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        runs.push({
          name: rName,
          distance,
          duration,
          bpm,
          rest: rRest,
        });
      });

      /* ── Séances terrain prescrites (.field-item) ── */
      const fieldSessions = [];
      seanceEl.querySelectorAll(".field-item").forEach((fEl) => {
        const ffid = fEl.id.replace("field-", "");
        const title = (
          doc.getElementById(`ft-${ffid}`)?.value ||
          doc.getElementById(`ft-${ffid}`)?.getAttribute("value") ||
          ""
        ).trim();
        if (!title) return; // skip vides

        const moment = (
          doc.getElementById(`fm-${ffid}`)?.value ||
          doc.getElementById(`fm-${ffid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        const fdEl = doc.getElementById(`fd-${ffid}`);
        const fieldDesc = (fdEl?.value || fdEl?.textContent || "").trim() || null;

        fieldSessions.push({ title, moment, description: fieldDesc });
      });

      if (exercises.length > 0 || runs.length > 0 || fieldSessions.length > 0 || (finisher && finisher.length > 0) || sessionName !== `Séance ${si + 1}`) {
        sessions.push({ name: sessionName, description, finisher, exercises, runs, fieldSessions });
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
