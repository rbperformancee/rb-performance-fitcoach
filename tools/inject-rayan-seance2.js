// ──────────────────────────────────────────────────────────────────────────
// Snippet console DevTools — injecte la séance "Force + Power + Lactique"
// dans la SÉANCE 2 du brouillon RB Perform en cours d'édition.
//
// MODE D'EMPLOI :
//   1. Ouvre rbperform.app dans ton navigateur, va dans le builder (programme
//      "Rayan Bonte" en cours d'édition, autosave actif).
//   2. F12 → onglet "Console".
//   3. Colle ce snippet en entier, Entrée.
//   4. Lis la sortie. Si plusieurs drafts, le script te demande lequel cibler.
//   5. Refresh la page builder (Cmd+R) → la séance 2 est remplie.
// ──────────────────────────────────────────────────────────────────────────

(function injectRayanSeance2() {
  // 1. Trouve tous les drafts builder dans localStorage
  const keys = Object.keys(localStorage).filter(k => k.startsWith("rb_progbuilder_draft_"));
  if (keys.length === 0) {
    console.error("❌ Aucun draft builder trouvé. Ouvre le builder d'abord.");
    return;
  }

  // Tri par date de save desc — le plus récent est probablement celui qu'on veut
  const drafts = keys.map(k => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(k)); } catch {}
    return { key: k, savedAt: d?.savedAt || 0, name: d?.name || "(sans nom)", weeks: d?.weeks?.length || 0 };
  }).sort((a, b) => b.savedAt - a.savedAt);

  console.log("━━━ Drafts disponibles ━━━");
  drafts.forEach((d, i) => {
    const age = Math.round((Date.now() - d.savedAt) / 60000);
    console.log(`  [${i}] "${d.name}" · ${d.weeks} sem · save il y a ${age}min · ${d.key}`);
  });

  // 2. Pick le plus récent par défaut (ou demande à l'user de set window.RB_DRAFT_IDX)
  const idx = typeof window.RB_DRAFT_IDX === "number" ? window.RB_DRAFT_IDX : 0;
  const target = drafts[idx];
  if (!target) {
    console.error(`❌ Index ${idx} invalide. Set window.RB_DRAFT_IDX = N et rejoue.`);
    return;
  }
  console.log(`\n✓ Cible : "${target.name}" (${target.key})`);

  // 3. Charge le draft, garantit qu'il existe une semaine 1 avec ≥ 2 sessions
  const draft = JSON.parse(localStorage.getItem(target.key));
  if (!draft.weeks || draft.weeks.length === 0) {
    console.error("❌ Pas de semaine dans ce draft.");
    return;
  }
  const week1 = draft.weeks[0];
  if (!Array.isArray(week1.sessions)) week1.sessions = [];

  // Assure qu'on a au moins 2 sessions
  const uid = () => Math.random().toString(36).slice(2, 11);
  while (week1.sessions.length < 2) {
    week1.sessions.push({
      id: uid(), name: `Séance ${week1.sessions.length + 1}`,
      description: "", finisher: "", bonus: false,
      warmup: null, runs: [], fieldSessions: [], amraps: [], ergos: [],
      exercises: [],
    });
  }

  // 4. Construit la nouvelle Séance 2 selon ta spec
  const ex = (name, reps, charge, tempo, rir, rest, group) => ({
    id: uid(), name, reps, charge: charge || "", tempo: tempo || "",
    rir: rir || "", rest: rest || "", group: group || "", vidUrl: "",
  });

  const newS2 = {
    id: week1.sessions[1].id, // on garde l'id existant pour pas casser le tracking
    name: "Force + Power + Lactique",
    description: "Force max, puissance, contraste cluster + AMRAP + finisher lactique. ~70 min.",
    finisher: "Circuit lactique (2 tours) : Bike 15s max + Sled 20m + Thrusters x10 + Box jumps x8 + Shuttle Run 5-10-5. Enchaîné sans repos · 1'15 récup entre tours.",
    bonus: false,
    runs: [],
    fieldSessions: [],
    // Échauffement circuit (1 round, 1 mouvement)
    warmup: {
      rounds: 1, restBetween: "", notes: "Vélo léger, monter pulse progressivement",
      movements: [{ id: uid(), name: "Vélo", spec: "3 min" }],
    },
    // AMRAP 8 min (D1 + D2)
    amraps: [{
      id: uid(),
      title: "AMRAP 8 min",
      minutes: 8,
      description: "D1 — Fentes arrière zercher × 10 reps (max charge perso)\nD2 — Copenhague planche dynamic × 10 reps PDC\nMax de rounds possibles en 8 minutes.",
    }],
    ergos: [],
    exercises: [
      // ── Block A : circuit 3 tours (A1→A2→A3→A4) ──
      ex("Overhead squat",                       "3X8",           "",                                    "",          "", "0",     "A1"),
      ex("Iso unilatéral position sprinter",     "3X10s/côté",    "PDC",                                 "iso 10s",   "", "0",     "A2"),
      ex("Nageur",                                "3X10",          "",                                    "",          "", "0",     "A3"),
      ex("KB RDL unilatéral",                    "3X6/côté",      "KB modéré",                           "",          "", "1'30",  "A4"),

      // ── Power clean (hors superset, explosif) ──
      ex("Power clean",                           "3X3",           "Explosif — vitesse barre max",        "explosif",  "", "2'",    ""),

      // ── Block B : SUPERSET CLUSTER B1/B2 (1 rep front + 1 seated box jump + 15s mini-rest × 4 cycles, × 4 sets) ──
      ex("Front squat",                           "4X1+1+1+1",     "Cluster contraste avec B2 — 1 rep front / 1 rep box jump / 15s mini-rest entre cycles", "", "", "3'", "B1"),
      ex("Seated box jump",                       "4X1+1+1+1",     "Box jump assis explosif — 1 rep entre chaque rep front squat",                          "explosif", "", "3'", "B2"),

      // ── Trap bar élastique + sled explosif ──
      ex("Trap barre élastique pieds décalés",   "3X3",           "Barre + élastique tension, pieds décalés, vitesse max", "explosif", "", "2'", ""),
      ex("Sled push explosif",                    "3X10m",         "Charge modérée, sprint complet sur 10m",                 "explosif", "", "1'30", ""),
    ],
  };

  week1.sessions[1] = newS2;
  draft.savedAt = Date.now();

  // 5. Sauve dans localStorage
  localStorage.setItem(target.key, JSON.stringify(draft));

  console.log("\n━━━ ✅ Séance 2 injectée ━━━");
  console.log(`  Nom        : ${newS2.name}`);
  console.log(`  Exercices  : ${newS2.exercises.length}`);
  console.log(`  Warmup     : ${newS2.warmup.movements[0].name} (${newS2.warmup.movements[0].spec})`);
  console.log(`  AMRAP      : ${newS2.amraps[0].title} (${newS2.amraps[0].minutes} min)`);
  console.log(`  Finisher   : ${newS2.finisher.slice(0, 80)}…`);
  console.log("\n🔄 Maintenant : Cmd+R pour refresh le builder. La séance 2 apparaîtra remplie.");
  console.log("\n⚠ Note : Le cluster B1/B2 est encodé en '4X1+1+1+1' (4 sets de 4 micro-reps). Le mini-rest 15s entre micro-reps est dans la note charge — le builder n'a pas encore de champ dédié pour rest-entre-reps-de-cluster.");
})();
