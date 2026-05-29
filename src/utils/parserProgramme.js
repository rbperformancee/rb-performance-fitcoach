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

      // Séance bonus / extra : optionnelle, ne compte pas dans la progression
      // hebdo ni dans le calendrier (jours d'entraînement). data-bonus="1".
      const bonus = seanceEl.getAttribute("data-bonus") === "1";

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

        /* Charge imposée par le coach (texte libre : "80kg", "60% 1RM",
           "RPE 8", "BW + 20kg"…). Indépendant des reps pour permettre
           l'évolution week-over-week et un affichage clair côté athlète. */
        const charge = (
          doc.getElementById(`ech-${eid}`)?.value ||
          doc.getElementById(`ech-${eid}`)?.getAttribute("value") ||
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
          charge,    // ← charge prescrite ("80kg", "60% 1RM", "RPE 8"…)
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

        // Champs fractionné (interval training) : si repeats ≥ 2, le run
        // est interprété comme un fractionné. work = effort par répétition
        // (ex "400m", "30s"), target = allure cible (ex "20km/h", "4:30/km").
        const repeatsRaw = (
          doc.getElementById(`rep-${rid}`)?.value ||
          doc.getElementById(`rep-${rid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const repeats = parseInt(repeatsRaw, 10);
        const work = (
          doc.getElementById(`rw-${rid}`)?.value ||
          doc.getElementById(`rw-${rid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;
        const target = (
          doc.getElementById(`rtg-${rid}`)?.value ||
          doc.getElementById(`rtg-${rid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;
        // blocks = nombre de blocs (default 1). blockRest = repos entre
        // blocs (ex "2'00"). Permet "2 blocs de 8×30/30 avec 2' entre".
        // Optionnels — si vides, le timer fonctionne comme un seul bloc.
        const blocksRaw = (
          doc.getElementById(`rblocks-${rid}`)?.value ||
          doc.getElementById(`rblocks-${rid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const blocks = parseInt(blocksRaw, 10);
        const blockRest = (
          doc.getElementById(`rbr-${rid}`)?.value ||
          doc.getElementById(`rbr-${rid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;

        runs.push({
          name: rName,
          distance,
          duration,
          bpm,
          rest: rRest,
          repeats: isNaN(repeats) ? null : repeats,
          work,
          target,
          blocks: isNaN(blocks) ? null : blocks,
          blockRest,
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

      /* ── Échauffement circuit (.warmup-circuit) — placé en tête de séance ── */
      // Bloc placé en tête de séance : circuit de 2-5 mouvements à enchaîner
      // pendant N tours. Différent d'un AMRAP (compétitif "max rounds") — ici
      // c'est exactement N tours, allure modérée, pour préparer le corps.
      let warmup = null;
      const warmupEl = seanceEl.querySelector(".warmup-circuit");
      if (warmupEl) {
        const wid = warmupEl.id.replace("warmup-", "");
        const roundsRaw = (
          doc.getElementById(`wr-${wid}`)?.value ||
          doc.getElementById(`wr-${wid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const rounds = parseInt(roundsRaw, 10);
        const restBetween = (
          doc.getElementById(`wrr-${wid}`)?.value ||
          doc.getElementById(`wrr-${wid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;
        const notesEl = doc.getElementById(`wn-${wid}`);
        const notes = (notesEl?.value || notesEl?.textContent || "").trim() || null;

        const movements = [];
        warmupEl.querySelectorAll(".warmup-movement").forEach((mEl) => {
          const mid = mEl.id.replace("wmov-", "");
          const name = (
            doc.getElementById(`wmn-${mid}`)?.value ||
            doc.getElementById(`wmn-${mid}`)?.getAttribute("value") ||
            ""
          ).trim();
          const spec = (
            doc.getElementById(`wms-${mid}`)?.value ||
            doc.getElementById(`wms-${mid}`)?.getAttribute("value") ||
            ""
          ).trim();
          if (!name && !spec) return;
          movements.push({ name, spec: spec || null });
        });

        if (movements.length > 0 || rounds) {
          warmup = {
            rounds: isNaN(rounds) ? 3 : Math.max(1, rounds),
            restBetween,
            notes,
            movements,
          };
        }
      }

      /* ── AMRAP / WOD prescrits (.amrap-item) ── */
      const amraps = [];
      seanceEl.querySelectorAll(".amrap-item").forEach((amEl) => {
        const aid = amEl.id.replace("amrap-", "");
        const title = (
          doc.getElementById(`at-${aid}`)?.value ||
          doc.getElementById(`at-${aid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const minutesRaw = (
          doc.getElementById(`adu-${aid}`)?.value ||
          doc.getElementById(`adu-${aid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const minutes = parseInt(minutesRaw, 10);
        const descEl = doc.getElementById(`ad-${aid}`);
        const description = (descEl?.value || descEl?.textContent || "").trim();
        if (!title && !description && !minutes) return;
        amraps.push({
          title: title || "AMRAP",
          minutes: isNaN(minutes) ? null : minutes,
          description: description || null,
        });
      });

      /* ── Ergo / cardio fin de séance (.ergo-item) ── */
      // Bloc rameur/vélo/ski-erg/assault bike. Goal = "2km" / "150 cal" / "10 min".
      // Minutes = durée pour le countdown (ex 10 min). Si absent → pas de chrono,
      // juste l'objectif distance/cal affiché.
      const ergos = [];
      seanceEl.querySelectorAll(".ergo-item").forEach((egEl) => {
        const eid = egEl.id.replace("ergo-", "");
        const machine = (
          doc.getElementById(`em-${eid}`)?.value ||
          doc.getElementById(`em-${eid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const goal = (
          doc.getElementById(`egl-${eid}`)?.value ||
          doc.getElementById(`egl-${eid}`)?.getAttribute("value") ||
          ""
        ).trim() || null;
        const minutesRaw = (
          doc.getElementById(`emn-${eid}`)?.value ||
          doc.getElementById(`emn-${eid}`)?.getAttribute("value") ||
          ""
        ).trim();
        const minutes = parseInt(minutesRaw, 10);
        const notesEl = doc.getElementById(`en2-${eid}`);
        const notes = (notesEl?.value || notesEl?.textContent || "").trim() || null;
        if (!machine && !goal && !notes && !minutes) return;
        ergos.push({
          machine: machine || "Ergo",
          goal,
          minutes: isNaN(minutes) ? null : minutes,
          notes,
        });
      });

      if (exercises.length > 0 || runs.length > 0 || fieldSessions.length > 0 || amraps.length > 0 || ergos.length > 0 || warmup || (finisher && finisher.length > 0) || sessionName !== `Séance ${si + 1}`) {
        sessions.push({ name: sessionName, description, finisher, bonus, exercises, runs, fieldSessions, amraps, ergos, warmup });
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

// Extrait un nombre de semaines d'une durée libre ("6 semaines", "2 mois"…).
export function parseDurationWeeks(duration) {
  if (!duration) return null;
  const m = String(duration).match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!n) return null;
  return /mois/i.test(duration) ? n * 4 : n;
}

/**
 * expandProgrammeWeeks — si le coach a construit une semaine-type (ou
 * quelques semaines) avec une durée plus longue ("6 semaines"), on
 * répète les semaines pour couvrir la durée. Chaque semaine répétée a
 * son propre index → l'historique des séances reste séparé.
 * Ne change rien si le programme couvre déjà sa durée.
 */
export function expandProgrammeWeeks(programme) {
  if (!programme || !Array.isArray(programme.weeks) || programme.weeks.length === 0) {
    return programme;
  }
  const durW = parseDurationWeeks(programme.duration);
  if (!durW || durW <= programme.weeks.length) return programme;
  const base = programme.weeks;
  const weeks = Array.from({ length: durW }, (_, i) => ({
    ...base[i % base.length],
    weekNumber: i + 1,
    name: `Semaine ${i + 1}`,
  }));
  return {
    ...programme,
    weeks,
    totalWeeks: weeks.length,
    totalSessions: weeks.reduce((a, w) => a + w.sessions.length, 0),
  };
}
