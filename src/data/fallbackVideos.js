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
  // ═══ Haltérophilie · Catalyst Athletics (référence Olympic) ═══
  { id: "YG8M_-11C2A", title: "Power clean",                       aliases: ["power clean", "épaulé puissance"],                                              creator: "Catalyst Athletics" },
  { id: "1Lv1IyigIUY", title: "Snatch (arraché)",                  aliases: ["snatch", "arraché"],                                                            creator: "Catalyst Athletics" },
  { id: "oQIaWLrB318", title: "Clean (épaulé)",                    aliases: ["clean", "épaulé"],                                                              creator: "Catalyst Athletics" },
  { id: "uUeV3LwisDI", title: "Hang clean",                        aliases: ["hang clean", "épaulé suspendu"],                                                creator: "Catalyst Athletics" },
  { id: "SpDPcj0W3Yw", title: "Hang power snatch",                 aliases: ["hang power snatch"],                                                            creator: "Catalyst Athletics" },
  { id: "QZU7URo6HME", title: "Hang snatch",                       aliases: ["hang snatch", "arraché suspendu"],                                              creator: "Catalyst Athletics" },
  { id: "ydHHsju1-Nc", title: "Power snatch",                      aliases: ["power snatch", "arraché puissance"],                                            creator: "Catalyst Athletics" },
  { id: "Om7vLD6x8W0", title: "Push jerk",                         aliases: ["push jerk", "jerk poussé"],                                                     creator: "Catalyst Athletics" },
  { id: "k8Of-kCHlCQ", title: "Push jerk in split",                aliases: ["push jerk in split"],                                                           creator: "Catalyst Athletics" },
  { id: "2GPA-cjUFnA", title: "Split jerk",                        aliases: ["split jerk", "jeté fendu"],                                                     creator: "Catalyst Athletics" },
  { id: "yklSQG1_Ovc", title: "Push press",                        aliases: ["push press", "développé poussé"],                                               creator: "Catalyst Athletics" },
  { id: "vO5JVdcY1jg", title: "Muscle clean",                      aliases: ["muscle clean"],                                                                 creator: "Catalyst Athletics" },
  { id: "2Qv8pEnprpU", title: "Clean high-pull",                   aliases: ["clean high pull", "high pull"],                                                 creator: "Catalyst Athletics" },
  { id: "xx8WkFrST2Y", title: "Clean pull",                        aliases: ["clean pull", "tirage clean"],                                                   creator: "Catalyst Athletics" },
  { id: "G1QygZ3Kd3w", title: "Snatch pull",                       aliases: ["snatch pull", "tirage arraché"],                                                creator: "Catalyst Athletics" },
  { id: "X9ckJS9LSug", title: "Tall clean",                        aliases: ["tall clean"],                                                                   creator: "Catalyst Athletics" },
  { id: "qyLmvESKokk", title: "Dip snatch",                        aliases: ["dip snatch"],                                                                   creator: "Catalyst Athletics" },
  { id: "lNJ3DyibYZQ", title: "Front squat",                       aliases: ["front squat", "squat avant"],                                                   creator: "Catalyst Athletics" },
  { id: "m_fvfJi94D8", title: "Overhead squat",                    aliases: ["overhead squat", "squat overhead"],                                             creator: "Catalyst Athletics" },
  { id: "Akd5xmZlsvg", title: "Back squat (haltéro)",              aliases: ["back squat oly", "squat olympic"],                                              creator: "Catalyst Athletics" },
  { id: "E9hLcC8ZrmA", title: "Deadlift (haltéro)",                aliases: ["deadlift oly", "soulevé olympic"],                                              creator: "Catalyst Athletics" },
  { id: "mp9gtX-JqB0", title: "Snatch deadlift",                   aliases: ["snatch deadlift", "snatch grip deadlift"],                                      creator: "Catalyst Athletics" },
  { id: "eHarHXNcId8", title: "Halting snatch deadlift",           aliases: ["halting snatch deadlift"],                                                      creator: "Catalyst Athletics" },
  { id: "2mcAyCgsPvg", title: "Snatch-grip RDL",                   aliases: ["snatch grip RDL"],                                                              creator: "Catalyst Athletics" },
  { id: "lYUB78Btcxc", title: "Good morning (Catalyst)",           aliases: ["good morning catalyst"],                                                        creator: "Catalyst Athletics" },
  { id: "LZWQgMxryDc", title: "Glute bridge banc",                 aliases: ["glute bridge bench", "glute bridge banc"],                                      creator: "Catalyst Athletics" },
  { id: "3FE2eZGeT1o", title: "Single leg glute bridge",           aliases: ["single leg glute bridge"],                                                      creator: "Catalyst Athletics" },
  { id: "tGaaq4MDPeo", title: "Single leg hip thrust",             aliases: ["single leg hip thrust"],                                                        creator: "Catalyst Athletics" },

  // ═══ Jeff Nippard · biomechanics + form tutorials ═══
  { id: "xDmFkJxPzeM", title: "Hip thrust barre",                  aliases: ["hip thrust", "thrust", "barbell hip thrust"],                                   creator: "Jeff Nippard" },
  { id: "_oyxCn2iSjU", title: "Romanian deadlift (RDL)",           aliases: ["RDL", "soulevé de terre roumain", "romanian deadlift", "barbell RDL"],          creator: "Jeff Nippard" },
  { id: "6GYxDJ9ee7I", title: "Bulgarian split squat",             aliases: ["split squat", "fente bulgare", "bulgarian split squat"],                        creator: "Jeff Nippard" },
  { id: "21inrjhoFkQ", title: "Calf raise debout",                 aliases: ["standing calf raise", "extension mollets debout", "mollets debout"],            creator: "Jeff Nippard" },
  { id: "gfUg6qWohTk", title: "Rowing haltère un bras",            aliases: ["dumbbell row", "single arm dumbbell row", "rowing haltère", "one arm row"],     creator: "Jeff Nippard" },
  { id: "jTVbilkxSAk", title: "Shrug barre",                       aliases: ["barbell shrug", "shrug", "haussement épaules barre", "trap shrug"],             creator: "Jeff Nippard" },
  { id: "IdNOahFD450", title: "Élévation latérale (Nippard)",      aliases: ["lateral raise", "side raise"],                                                  creator: "Jeff Nippard" },
  { id: "9B-5irFdB3c", title: "Seated cable row (Nippard)",        aliases: ["cable row nippard", "seated cable row"],                                        creator: "Jeff Nippard" },
  { id: "axoeDmW0oAY", title: "T-bar row / Pendlay row",           aliases: ["t-bar row", "pendlay row", "rowing barre nippard"],                             creator: "Jeff Nippard" },
  { id: "XsrD5y8EIKU", title: "Sumo deadlift",                     aliases: ["sumo deadlift", "soulevé sumo"],                                                creator: "Jeff Nippard" },
  { id: "v-mQm_droHg", title: "Front squat (Nippard)",             aliases: ["front squat tutorial nippard"],                                                 creator: "Jeff Nippard" },
  { id: "bEv6CCg2BC8", title: "Back squat technique",              aliases: ["squat technique", "back squat nippard"],                                        creator: "Jeff Nippard" },
  { id: "vcBig73ojpE", title: "Bench press technique",             aliases: ["bench press technique", "développé couché nippard"],                            creator: "Jeff Nippard" },
  { id: "VL5Ab0T07e4", title: "Deadlift conventional",             aliases: ["deadlift conventional", "soulevé conventionnel"],                               creator: "Jeff Nippard" },
  { id: "f23vXjoG2e8", title: "Good morning",                      aliases: ["good morning", "good morning barre"],                                           creator: "Jeff Nippard" },
  { id: "dJa_Nf4zdik", title: "Cable kickback (glute)",            aliases: ["cable kickback", "glute kickback"],                                             creator: "Jeff Nippard" },
  { id: "popGXI-qs98", title: "Triceps technique",                 aliases: ["triceps technique", "tricep workout"],                                          creator: "Jeff Nippard" },

  // ═══ Squat University · technique + mobilité ═══
  { id: "rRihE4weYg4", title: "Box squat",                         aliases: ["box squat"],                                                                    creator: "Squat University" },
  { id: "WP0IFHkkRZ0", title: "Deadlift ultimate tutorial",        aliases: ["deadlift squat university"],                                                    creator: "Squat University" },
  { id: "vaMYBmJH-tw", title: "Squat tutorial",                    aliases: ["squat tutorial", "perfect squat"],                                              creator: "Squat University" },
  { id: "FLbh7Di2KM8", title: "Sumo deadlift tutorial",            aliases: ["sumo deadlift tutorial"],                                                       creator: "Squat University" },
  { id: "9LJDGUulS_8", title: "Thoracic spine mobility",           aliases: ["thoracic spine mobility", "thoracic rotation"],                                 creator: "Squat University" },
  { id: "enThal66tUs", title: "Deep squat rotation",               aliases: ["deep squat rotation", "thoracic mobility"],                                     creator: "Squat University" },
  { id: "-CiWQ2IvY34", title: "World's greatest stretch",          aliases: ["worlds greatest stretch", "greatest stretch"],                                  creator: "Squat University" },
  { id: "S4q2KfF7z1E", title: "Hip flexor stretch",                aliases: ["hip flexor stretch", "étirement psoas"],                                        creator: "Squat University" },
  { id: "7hrTiJIqvr4", title: "Ankle mobility",                    aliases: ["ankle mobility", "dorsiflexion", "mobilité cheville"],                          creator: "Squat University" },
  { id: "qaGQlDbFAkE", title: "Shoulder mobility",                 aliases: ["shoulder mobility", "mobilité épaule"],                                         creator: "Squat University" },
  { id: "htyDuCI8cm8", title: "Nordic hamstring curl",             aliases: ["nordic curl", "nordic hamstring"],                                              creator: "Squat University" },

  // ═══ Athlean-X · misc ═══
  { id: "AAjlNtI1NiI", title: "Dumbbell pullover",                 aliases: ["pullover haltère", "dumbbell pullover", "lat pullover"],                        creator: "Athlean-X" },
  { id: "5I3LgiumTJM", title: "Ab wheel rollout",                  aliases: ["ab wheel rollout", "ab rollout", "roue abdominale"],                            creator: "Athlean-X" },
  { id: "TWJY6EDg9lQ", title: "Push-up technique",                 aliases: ["pushup", "push up", "pompe"],                                                   creator: "Athlean-X" },
  { id: "R8JuBVL3dxQ", title: "Rear delt (Y-raise)",               aliases: ["rear delt", "Y raise", "delt postérieur"],                                      creator: "Athlean-X" },
  { id: "ris9tKqMwgU", title: "Arnold press",                      aliases: ["arnold press"],                                                                 creator: "Athlean-X" },
  { id: "T76xu0XjYTk", title: "Front raise haltère",               aliases: ["front raise", "élévation frontale"],                                            creator: "Athlean-X" },
  { id: "ENsp0DEryrM", title: "Lateral raise variants",            aliases: ["lateral raise variants"],                                                       creator: "Athlean-X" },
  { id: "Tvvq8KpzyMY", title: "Biceps curl variations",            aliases: ["biceps curl variations", "curl variations"],                                    creator: "Athlean-X" },
  { id: "TSZx4adyiGE", title: "Rotator cuff exercises",            aliases: ["rotator cuff", "external rotation"],                                            creator: "Athlean-X" },
  { id: "vthMCtgVtFw", title: "Bench press checklist",             aliases: ["bench press checklist", "wide grip bench"],                                     creator: "Athlean-X" },
  { id: "eIq5CB9JfKE", title: "Face pull (Athlean-X)",             aliases: ["face pull", "rear delt cable"],                                                 creator: "Athlean-X" },
  { id: "CJbTloTx9eo", title: "Kettlebell swing",                  aliases: ["kettlebell swing", "kb swing"],                                                 creator: "Athlean-X" },
  { id: "xVrALzPc7dM", title: "Plank progression",                 aliases: ["plank", "hollow hold", "gainage"],                                              creator: "Athlean-X" },
  { id: "wrRIs2Dk_8U", title: "Plank variations",                  aliases: ["plank variations"],                                                             creator: "Athlean-X" },
  { id: "jYX5FpYZA7c", title: "Dead bug + bird dog",               aliases: ["dead bug", "bird dog", "core stability"],                                       creator: "Athlean-X" },
  { id: "M7-uhQQlIOk", title: "Single leg deadlift",               aliases: ["single leg deadlift", "RDL unilateral"],                                        creator: "Athlean-X" },

  // ═══ Nassim Sahili · technique FR ═══
  { id: "zFyfbE2JffQ", title: "Squat (Sahili FR)",                 aliases: ["squat fr", "squat quadriceps"],                                                 creator: "Nassim Sahili" },
  { id: "JKceCBUVhNM", title: "Soulevé de terre 300kg",            aliases: ["soulevé de terre fr", "deadlift fr"],                                           creator: "Nassim Sahili" },
  { id: "nkzKGyk8U0k", title: "Soulevé de terre dos",              aliases: ["soulevé de terre dos"],                                                         creator: "Nassim Sahili" },
  { id: "iN7e-KEkidw", title: "Développé couché (Sahili FR)",      aliases: ["développé couché fr", "bench press fr"],                                        creator: "Nassim Sahili" },

  // ═══ AM Nutrition (All-Musculation) · FR ═══
  { id: "TbVpM5yd6QM", title: "Développé couché barre (FR)",       aliases: ["développé couché barre fr"],                                                    creator: "AM Nutrition (All-Musculation)" },
  { id: "loYKxW_8EbY", title: "Développé couché prise serrée (FR)", aliases: ["développé couché prise serrée fr", "close grip bench fr"],                     creator: "AM Nutrition (All-Musculation)" },
  { id: "OhzsFUM8T1Y", title: "Curl barre (FR)",                   aliases: ["curl barre fr", "barbell curl fr"],                                             creator: "AM Nutrition (All-Musculation)" },
  { id: "CRnwmX9wE3s", title: "Tractions serrées supination (FR)", aliases: ["tractions serrées", "pull up close grip fr"],                                   creator: "AM Nutrition (All-Musculation)" },

  // ═══ Wave gaps Q2 2026 — exos courants manquants (audit 2 mai 2026) ═══
  // Sources : Athlean-X, Squat University, Jeff Nippard, Chris Duffin
  // Si une vidéo se révèle morte/déplacée → la swap ou retirer
  { id: "w86k0S5rhFs", title: "Trap bar deadlift",                  aliases: ["trap bar", "trap bar deadlift", "TBDL", "soulevé hexagonal"],                  creator: "Tutorial" },
  { id: "PbwWOv4xv8o", title: "Battle ropes workout",               aliases: ["battle ropes", "cordes", "cordes ondulatoires", "rope waves"],                 creator: "Athlean-X" },
  { id: "kICxJien7xM", title: "Dragon flag",                        aliases: ["dragon flag", "drapeau du dragon", "bruce lee abs"],                            creator: "Athlean-X" },
  { id: "Pr1ieGZ5atk", title: "Hanging leg raise",                  aliases: ["hanging leg raise", "leg raise barre", "relevé de jambes suspendu"],            creator: "Athlean-X" },
  { id: "bqpXK3SFAKY", title: "Sled push (TANK)",                   aliases: ["sled push", "prowler", "tank push", "poussée traîneau"],                       creator: "Squat University" },
  { id: "Zp26q4BY5HE", title: "Hip thrust barre",                   aliases: ["hip thrust", "hip thrust barre", "barbell hip thrust"],                         creator: "Tutorial" },
  { id: "WCFCdxzFBa4", title: "Step-up (banc + haltères)",          aliases: ["step up", "step-up", "montée banc", "box step up"],                             creator: "Tutorial" },
  { id: "vbYoTdbVXcE", title: "Zercher squat",                      aliases: ["zercher squat", "zercher", "squat zercher"],                                    creator: "Chris Duffin" },
  { id: "x071zV-Bo2E", title: "Landmine press",                     aliases: ["landmine press", "landmine shoulder press", "presse landmine"],                creator: "Athlean-X" },
  { id: "_RlRDWO2jfg", title: "Overhead press barre debout",        aliases: ["OHP", "overhead press", "développé militaire barre", "military press barre", "strict press"], creator: "Jeff Nippard" },
  { id: "lLAw6fUccKA", title: "Farmer walk / carry",                aliases: ["farmer walk", "farmer carry", "marche du fermier", "loaded carry"],             creator: "Tutorial" },
  { id: "G-Vamqoy8qM", title: "Front squat",                        aliases: ["front squat", "squat avant", "ask squatu front squat"],                         creator: "Squat University" },
  { id: "nBSAXcjlYJ0", title: "Bayesian cable curl (face away)",    aliases: ["bayesian curl", "cable curl bayesian", "face away cable curl", "cable curl"],   creator: "Jeff Nippard" },
  { id: "GNO4OtYoCYk", title: "Bicep exercises ranking (preacher · concentration · incline · hammer · spider)", aliases: ["preacher curl", "concentration curl", "incline curl", "hammer curl", "spider curl", "curl haltères incliné", "marteau", "curl marteau"], creator: "Jeff Nippard" },
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
