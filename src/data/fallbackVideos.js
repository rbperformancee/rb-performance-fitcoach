// Bibliothèque FALLBACK — vidéos externes de créateurs reconnus.
// Utilisée UNIQUEMENT si l'exercice n'est pas dans EXERCISE_VIDEOS (la lib perso de Rayan).
// Affichée avec attribution claire ("Démo : {creator}") pour la transparence.
//
// Stratégie : ces vidéos sont une PASSERELLE. Quand Rayan film son propre exo,
// il l'ajoute dans EXERCISE_VIDEOS qui prend priorité automatiquement.
//
// Pour ajouter : push dans FALLBACK_VIDEOS avec id (YouTube videoId) + title +
// aliases + creator (nom du créateur affiché aux utilisateurs).

const yt = (id) => `https://youtu.be/${id}`;

const norm = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[()[\]{}.,;:!?·-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Liste vide pour l'instant — Rayan provide les URLs des créateurs qu'il
// respecte, je remplis après. L'infrastructure est prête à les recevoir.
//
// Format d'entrée :
// { id: "abc123XYZ", title: "Hip thrust barre", aliases: ["hip thrust", "thrust"], creator: "All Musculation" }
export const FALLBACK_VIDEOS = [
  // Vidéos vérifiées via cross-référence (existence + attribution créateur).
  // À remplacer par tes propres tournages quand tu films ces exos.
  { id: "xDmFkJxPzeM", title: "Hip thrust barre",                 aliases: ["hip thrust", "thrust", "barbell hip thrust"],                                  creator: "Jeff Nippard" },
  { id: "Q5vwsJFwhyg", title: "Romanian deadlift (RDL) barre",   aliases: ["RDL", "soulevé de terre roumain", "romanian deadlift", "barbell RDL"],          creator: "Jeff Nippard" },
  { id: "6GYxDJ9ee7I", title: "Bulgarian split squat",            aliases: ["split squat", "fente bulgare", "bulgarian split squat"],                       creator: "Jeff Nippard" },
  { id: "21inrjhoFkQ", title: "Calf raise debout",                aliases: ["standing calf raise", "extension mollets debout", "mollets debout"],            creator: "Jeff Nippard" },
  { id: "gfUg6qWohTk", title: "Rowing haltère un bras",           aliases: ["dumbbell row", "single arm dumbbell row", "rowing haltère", "one arm row"],     creator: "Jeff Nippard" },
  { id: "jTVbilkxSAk", title: "Shrug barre",                       aliases: ["barbell shrug", "shrug", "haussement épaules barre", "trap shrug"],            creator: "Jeff Nippard" },
  { id: "IdNOahFD450", title: "Élévation latérale",               aliases: ["lateral raise", "élévation latérale", "side raise", "cable lateral raise"],    creator: "Jeff Nippard" },
  { id: "9B-5irFdB3c", title: "Seated cable row",                  aliases: ["cable row", "rowing assis poulie", "seated row"],                              creator: "Jeff Nippard" },
  { id: "axoeDmW0oAY", title: "T-bar row / Pendlay row",          aliases: ["t-bar row", "pendlay row", "rowing barre"],                                    creator: "Jeff Nippard" },
  { id: "AAjlNtI1NiI", title: "Dumbbell pullover",                aliases: ["pullover haltère", "dumbbell pullover", "lat pullover"],                       creator: "Athlean-X" },
];

// Index normalisé pour lookup rapide.
const INDEX = (() => {
  const map = new Map();
  for (const v of FALLBACK_VIDEOS) {
    const k = norm(v.title);
    if (!map.has(k)) map.set(k, v);
    for (const a of v.aliases || []) {
      const ka = norm(a);
      if (!map.has(ka)) map.set(ka, v);
    }
  }
  return map;
})();

// Retourne { url, creator } si match, sinon null.
export function findFallbackVideo(exerciseName) {
  if (!exerciseName) return null;
  const target = norm(exerciseName);
  if (!target) return null;

  // 1. Match exact
  const exact = INDEX.get(target);
  if (exact) return { url: yt(exact.id), creator: exact.creator };

  // 2. Substring match
  for (const [k, v] of INDEX) {
    if (target.includes(k) || k.includes(target)) return { url: yt(v.id), creator: v.creator };
  }

  return null;
}
