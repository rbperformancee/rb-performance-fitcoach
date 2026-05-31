// Bibliotheque centrale des videos d'exercices RB Perform.
// Source : YouTube non repertoriees, chaine RB Perform.
//
// Comportement :
//   - findVideo(exerciseName) → URL YouTube si match, sinon null
//   - Match par nom canonique OU alias (case + accents-insensitif)
//   - Fallback fuzzy : substring match dans les 2 sens
//
// Pour ajouter une nouvelle video : push dans LIBRARY avec id + title + aliases.
// Pour rebrancher une video sur un nouvel exo : ajoute le nom dans aliases.

const yt = (id) => `https://youtu.be/${id}`;

const norm = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")  // strip accents
  .replace(/[()[\]{}.,;:!?·-]/g, " ") // strip punctuation
  .replace(/\s+/g, " ")
  .trim();

export const EXERCISE_VIDEOS = [
  // ───────── PECTORAUX ─────────
  { id: "vwPhNxREbnc", title: "Développé couché barre",                 aliases: ["bench press", "développé couché", "couché barre", "BP barre", "developpe couche barre"] },
  { id: "JYcnTDPBgjQ", title: "Optimise ton développé couché",           aliases: ["technique developpe couche", "tuto bench"] },
  { id: "yBhTUtd7lSw", title: "Développé couché prise serrée",          aliases: ["bench prise serree", "close grip bench", "BP serre"] },
  { id: "s4o5p3Upv5c", title: "Développé couché smith machine",          aliases: ["bench smith", "BP smith"] },
  { id: "qX15UjBkS2U", title: "Développé couché haltères",               aliases: ["bench DB", "developpe couche dumbbells"] },
  { id: "D6Y11FRM3GU", title: "Développé incliné barre",                 aliases: ["incline bench", "developpe incline"] },
  { id: "WixS_Smh4mw", title: "Développé incliné haltères",              aliases: ["incline DB", "developpe incline dumbbells", "developpe incline haltere"] },
  { id: "jUR9XilKRp0", title: "Développé pec incliné machine",           aliases: ["incline machine press", "machine incline", "incline chest press", "chest press incline"] },
  { id: "65npK4Ijz1c", title: "Développé pec machine",                   aliases: ["chest press machine", "developpe pec machine", "machine chest press"] },
  { id: "ccu3gs1UDk8", title: "Pec fly machine",                         aliases: ["pec deck", "fly machine", "ecartes machine"] },
  { id: "YaKxvMrOFqI", title: "Écartés poulies basses",                  aliases: ["cable fly", "ecartes poulie", "low cable fly"] },
  { id: "NamiVqVgPTU", title: "Floor press",                              aliases: ["barbell floor press", "developpe couche au sol", "bench au sol"] },

  // ───────── ÉPAULES ─────────
  { id: "iXbTYTE_4qU", title: "Développé militaire smith machine",       aliases: ["OHP smith", "shoulder press smith"] },
  { id: "vqSbg1MnhY8", title: "Développé militaire machine",             aliases: ["machine shoulder press", "OHP machine", "developpe epaules machine", "developpe epaule machine prise neutre", "développé épaules machine prise neutre", "développé épaule machine"] },
  { id: "SDf3D8rHvZU", title: "Développé militaire haltères assis",      aliases: ["seated DB press", "OHP haltere", "shoulder press DB", "developpe militaires halteres", "développé militaires haltères", "developpe militaire halteres"] },
  { id: "_zbC5RQfkmk", title: "Élévation latérale haltères",             aliases: ["lateral raise", "elevation laterale", "side raise"] },
  { id: "EFXUQ2DE5pU", title: "Élévation latérale poulie basse",         aliases: ["cable lateral raise", "elevation laterale cable"] },
  { id: "vHj1_UHR0mA", title: "Élévation latérale poulie hauteur hanche", aliases: ["cable lateral hip", "elevation lateral poulie hanche", "élévation latéral poulie hanche", "elevation laterale poulie hanche"] },
  { id: "IYdznV7VTZs", title: "Pec deck inversé",                        aliases: ["reverse pec deck", "rear delt machine"] },
  { id: "O_xluCH9y20", title: "Oiseaux haltères banc incliné",           aliases: ["incline rear delt fly", "oiseaux", "oiseau halteres", "oiseau haltères", "oiseau haltères (deltoïde postérieur)", "rear delt fly", "oiseau deltoide posterieur"] },

  // ───────── TRICEPS ─────────
  { id: "G8GYdDkdmUk", title: "Extension triceps corde poulie haute",    aliases: ["triceps poulie corde", "rope pushdown", "triceps corde", "extension triceps haute", "extension triceps poulie haute unilatérale", "extension triceps poulie unilateral", "triceps poulie unilateral"] },
  { id: "gwC1Eo74LuA", title: "Extension triceps nuque corde poulie basse", aliases: ["overhead triceps cable", "triceps nuque"] },
  { id: "tPgqu7J0Q4A", title: "Haltères au front",                       aliases: ["skull crusher", "extension verticale haltere", "extensions verticales haltère", "french press"] },
  { id: "If6gIf7znIM", title: "Haltères au front (variation)",           aliases: ["skull crusher v2"] },

  // ───────── BICEPS ─────────
  { id: "RUGpTkGXDiU", title: "Curl biceps barre EZ debout",             aliases: ["curl barre EZ", "curl EZ", "EZ bar curl"] },
  { id: "trJO8Kwclac", title: "Curl biceps barre EZ debout (variation)", aliases: ["curl EZ v2"] },
  { id: "PXKCDakuWcU", title: "Curl biceps barre EZ pupitre",            aliases: ["preacher curl", "curl pupitre"] },
  { id: "zjPYJSsipBc", title: "Curl biceps haltères banc incliné",       aliases: ["incline DB curl", "curl incline", "curl biceps banc incline", "curl biceps banc incliné"] },
  { id: "_2HGonsfTec", title: "Curl marteau haltères",                   aliases: ["hammer curl", "curl marteau", "curl biceps marteau", "marteau haltere"] },
  { id: "ahaj7Cii4lc", title: "Curl marteau poulie basse corde",         aliases: ["cable hammer rope"] },
  { id: "bgTSPCyIreo", title: "Curl marteau corde à la poulie",          aliases: ["cable rope curl", "rope hammer"] },
  { id: "S6HnE1fDlaI", title: "Bayesian curl (poulie basse dos à la poulie)", aliases: ["bayesian curl", "curl biceps poulie basse dos à la poulie", "curl biceps poulie basse", "curl dos a la poulie", "behind body cable curl"] },

  // ───────── DOS ─────────
  { id: "kECazDUDmWA", title: "Traction pronation",                      aliases: ["pull up", "tractions lestees pronation", "tractions pronation", "pull-up"] },
  { id: "yolrxecoEcY", title: "Traction supination",                     aliases: ["chin up", "chin-up", "tractions supination"] },
  { id: "kPsgsSDLkuU", title: "Tirage vertical pronation",               aliases: ["lat pulldown", "lat pulldown pronation"] },
  { id: "wQa7GGIfP0M", title: "Tirage vertical prise serrée",            aliases: ["close grip pulldown", "tirage poitrine prise neutre", "tirage vertical prise neutre", "neutral grip pulldown"] },
  { id: "dEwiKZ3ThwA", title: "Tirage vertical supination",              aliases: ["reverse grip pulldown", "underhand pulldown"] },
  { id: "DFM5DniTl1g", title: "Tirage horizontal prise large",           aliases: ["wide cable row", "rowing assis poulie", "seated cable row"] },
  { id: "d2l3nd15qWM", title: "Tirage horizontal prise neutre serrée",   aliases: ["close grip seated row", "seated row neutral", "tirage horizontal machine prise neutre", "tirage horizontale machine prise neutre"] },
  { id: "dkbmaZB0krM", title: "Rowing bûcheron haltères",                aliases: ["rowing barre", "DB row", "single arm row", "rowing haltere", "rowing bucheron"] },
  { id: "ZsyKHOYrEsk", title: "Nageur",                                   aliases: ["nageur haltere", "swimmer", "dos lombaires nageur"] },

  // ───────── DELTOIDES POSTERIEURS ─────────
  { id: "Hg3N4sPDt_E", title: "Face pull",                               aliases: ["face pulls", "facepull"] },

  // ───────── JAMBES ─────────
  { id: "c-6Fy2UgydA", title: "Back squat barre libre",                  aliases: ["squat barre dos", "back squat", "squat barre"] },
  { id: "r9h6YYH31YU", title: "Optimise ton squat",                       aliases: ["technique squat", "tuto squat"] },
  { id: "OxNOG0viU4o", title: "Back squat smith machine",                aliases: ["smith squat"] },
  { id: "sw01LmcjfKA", title: "Back squat smith machine (variation)",    aliases: ["smith squat v2"] },
  { id: "5Gy4_5ZFbbA", title: "Goblet squat",                             aliases: ["gobelet squat", "front loaded squat"] },
  { id: "db9zquWGCDk", title: "Hack squat",                               aliases: ["hack squat machine"] },
  { id: "TykJQtunfYc", title: "Soulevés de terre jambes tendus",         aliases: ["RDL", "stiff leg deadlift", "soulevé de terre roumain", "romanian deadlift", "souleve de terre jambes tendus", "soulevé de terre jambes tendus"] },
  { id: "uV1lUVQ3BU8", title: "Soulevé de terre jambes tendues haltères", aliases: ["DB RDL", "haltere RDL"] },
  { id: "D0JX31bug10", title: "Soulevé de terre jambes tendues smith",   aliases: ["smith RDL"] },
  { id: "wsvWqLdRTB0", title: "Presse à cuisses verticale",              aliases: ["vertical leg press"] },
  { id: "HxN9cJJUT5U", title: "Presse à cuisses verticale pieds serrés", aliases: ["narrow leg press"] },
  { id: "R97EvnlUTYQ", title: "Presse à cuisses horizontale",            aliases: ["leg press", "horizontal leg press", "presse à cuisses"] },
  { id: "Hq9P-WL9BSk", title: "Presse à cuisses horizontale unilatérale", aliases: ["single leg press"] },
  { id: "X9ne2alS1LY", title: "Fentes bulgares haltères",                aliases: ["bulgarian split squat", "fentes marchées haltères", "fentes bulgares"] },
  { id: "lvRlJZsbCpE", title: "Fentes arrières barre libre",             aliases: ["reverse lunge barre"] },
  { id: "Q2k3kYbtOcI", title: "Fentes arrières haltères",                aliases: ["DB reverse lunge", "fentes arrieres halteres", "fentes arrieres dumbbell", "reverse lunge haltere"] },
  { id: "KjuOGthoYWs", title: "Fentes arrières smith machine",           aliases: ["smith reverse lunge"] },
  { id: "Vt4Lxn1Tfv4", title: "Leg curl unilatéral",                     aliases: ["leg curl allongé", "lying leg curl", "single leg curl"] },
  { id: "UOlo7n4YKtQ", title: "Leg curl assis",                           aliases: ["seated leg curl"] },
  { id: "CCY54rtIIjA", title: "Leg extension",                            aliases: ["leg extension machine"] },
  { id: "TX7K_sw3vfY", title: "Adducteur machine",                        aliases: ["adductor machine"] },
  { id: "JKOXC97r6z4", title: "Adducteur machine (variation)",            aliases: [] },
  { id: "NpTtcZJe3rU", title: "Abducteur machine",                        aliases: ["abductor machine"] },
  { id: "fZNu9CBOSik", title: "Extension mollets debout",                aliases: ["mollets debout machine", "standing calf raise", "mollet debout"] },
  { id: "DtuWDGWYkpE", title: "Extension mollets assis machine",         aliases: ["seated calf raise"] },
  { id: "TR4GN3rLuQ8", title: "Goblet cossack squat",                     aliases: ["gobelet cossack squat", "cossack squat goblet", "low kettlebell cossack squat", "kettlebell cossack"] },
  { id: "2fP1MX2L3pM", title: "Fentes marchées haltères",                 aliases: ["walking lunges", "fentes avant marchés", "fentes marchees", "dumbbell walking lunges", "fentes avant marchées"] },
  { id: "Ew1-BXjilqY", title: "Sled pull",                                aliases: ["traineau", "sled drag", "sled pull resistance"] },
  // ───────── EXPLOSIF / PLYO / POWER ─────────
  { id: "5Oq8KeqqPLw", title: "Broad jump",                               aliases: ["saut en longueur", "long jump", "saut horizontal"] },
  { id: "s32cCgmRV3I", title: "RDL unilatéral",                           aliases: ["RDL unilateral", "single leg RDL", "soulevé de terre jambes tendues unilateral", "single leg deadlift"] },
  { id: "Go4tSkrFIL8", title: "Box squat",                                aliases: ["box squat barre", "squat sur box"] },
  { id: "ckOWNYFPHHk", title: "Saut assis sur box",                       aliases: ["seated box jump", "saut box assis", "box jump assis"] },
  { id: "0e6RAkY_Zbk", title: "Trap barre jump",                          aliases: ["trap bar jump", "jump trap bar"] },
  { id: "ZJPZQklCSLs", title: "Trap barre soulevé de terre",              aliases: ["trap bar deadlift", "soulevé de terre trap barre", "hex bar deadlift"] },
  { id: "1cVT3ee9mgU", title: "KB swing",                                 aliases: ["kettlebell swing", "swing KB", "russian swing", "kb swing"] },
  { id: "Rc23TMvgY34", title: "Landmine push press explosif",             aliases: ["landmine push press", "landmine press explosif"] },
  { id: "4dGj7rES9pY", title: "Landmine oblique rotation",                aliases: ["landmine rotation", "landmine twist", "landmine oblique"] },
  // ───────── PECTORAUX (suite) ─────────
  { id: "yBhTUtd7lSw", title: "Développé couché prise serrée",           aliases: ["close grip bench press", "bench prise serrée", "developpe couche prise serree", "close grip bench"] },
  // ───────── PECTORAUX/TRICEPS bodyweight ─────────
  { id: "dluhsF6hP2w", title: "Pompes diamants",                          aliases: ["diamond push ups", "pompes triceps", "tricep push ups", "pompes serrées"] },
  // ───────── ÉCHAUFFEMENTS ─────────
  { id: "z8fNsBunboY", title: "Échauffement haut du corps",               aliases: ["echauffement upper", "warmup upper body", "echauffement haut", "warm up upper"] },
  { id: "c2ItruIASMg", title: "Échauffement bas du corps",                aliases: ["echauffement lower", "warmup lower body", "echauffement bas", "warm up lower"] },

  // ───────── ABDOS ─────────
  { id: "oXNpITk-C9k", title: "10 minutes séance abdos",                 aliases: ["abs workout", "abdos seance", "extra abdos", "abdos au feeling", "abdos libres", "circuit abdos", "circuit abdos rb"] },
  { id: "CX8wdlnLF80", title: "Relevés de jambes chaise romaine",        aliases: ["captain chair leg raise", "releves jambes"] },

  // ───────── BIBLIOTHÈQUE ÉTENDUE (auto-import DB programmes) ─────────
  // Vidéos extraites automatiquement des programmes des athlètes en DB.
  // Ajoutées en variants — si une vidéo canonique existe déjà (ex: hack squat
  // db9zquWGCDk), elle reste prioritaire ; les nouvelles vidéos sont des
  // démos alternatives accessibles via leur titre exact ou alias.

  // Dos
  { id: "bHO0A4ZF_Zg", title: "Traction australienne",                    aliases: ["inverted row", "australian pull up", "tractions australiennes"] },
  { id: "UIP7uesc0zw", title: "Traction australienne prise serrée",       aliases: ["inverted row close grip", "australian pull up close grip", "traction australienne prise sérée"] },
  { id: "w49UGytisik", title: "Tirage unilatéral machine",                aliases: ["single arm machine row", "unilateral machine row"] },
  { id: "sbYZvIypXMQ", title: "Tirage corde poulie",                      aliases: ["tirage corde", "cable rope pulldown", "rope pulldown"] },
  { id: "b_QO3PedVR8", title: "Rowing banc incliné haltères",             aliases: ["incline bench db row", "rowing banc incline"] },
  { id: "S92sKhvzRN8", title: "Rowing banc incliné (variante)",           aliases: ["rowing banc incline v2", "incline row v2"] },
  { id: "2-ILonFH-0k", title: "Landmine rowing",                          aliases: ["landmine row", "rowing landmine", "T-bar row landmine"] },

  // Épaules
  { id: "FUwme_oBDsA", title: "Développé militaire haltère unilatéral debout", aliases: ["single arm standing OHP", "single arm DB shoulder press", "developpe militaire unilateral"] },
  { id: "Ci06wws7Xak", title: "Élévation latérale haltères triches",       aliases: ["cheat lateral raise", "elevation laterale cheat", "lateral raise triches"] },
  { id: "ya16Y_CbEBk", title: "Tirage face pull (variante)",              aliases: ["face pull v2", "tirage face pull"] },
  { id: "szIcP0eaxvE", title: "Curl and press haltères",                  aliases: ["curl and press", "curl press", "curl et press", "DB curl to press"] },

  // Biceps
  { id: "jsqamZiIDWQ", title: "Curl biceps dos à la poulie",              aliases: ["cable curl behind body", "curl dos poulie", "curl behind body"] },
  { id: "rISifsn4OQw", title: "Curl biceps poulie basse barre",           aliases: ["low cable curl bar", "curl barre poulie basse", "cable barbell curl"] },

  // Triceps
  { id: "me9suJxPrRY", title: "Extension triceps unilatérale poulie",     aliases: ["single arm tricep pushdown", "extension triceps unilateral", "extension unilateral triceps"] },
  { id: "QZkeQ2gapIk", title: "Barre au front",                           aliases: ["barbell skull crusher", "skull crusher barre", "EZ skull crusher", "barre front"] },

  // Pectoraux
  { id: "8urE8Z8AMQ4", title: "Développé incliné smith machine",          aliases: ["incline bench smith", "developpe incline smith machine", "smith incline bench", "developpe incline smith"] },
  { id: "XtU2VQVuLYs", title: "Pompes diamant (variante)",                aliases: ["diamond push ups v2", "pompes diamant"] },
  { id: "Zh5xZnL1WzI", title: "Dips",                                      aliases: ["dips bodyweight", "dips poids du corps", "parallel bar dips"] },

  // Jambes — squat variants
  { id: "ACoqN6AH2u4", title: "Box squat (variante 2)",                   aliases: ["box squat v2", "boxsquat"] },
  { id: "rMEPHwNhQfo", title: "Box squat (variante 3)",                   aliases: ["box squat v3"] },
  { id: "7iw2gLZKZ0w", title: "Box squat (variante 4)",                   aliases: ["box squat v4"] },
  { id: "Zj3oT1AauYs", title: "Hack squat (variante machine 2)",          aliases: ["hacksquat v2", "hack squat machine v2"] },

  // Jambes — fentes / plyo
  { id: "7mi4YZdFYmg", title: "Fentes bulgares sautées",                  aliases: ["bulgarian split jump", "fentes bulgares sautes", "split squat jump"] },
  { id: "RtY9kyhuh5I", title: "Fentes sautées",                           aliases: ["jumping lunges", "fentes sautes", "split jump lunge"] },

  // Jambes — RDL / ischios
  { id: "L1saEVVBYG8", title: "Sprinter RDL",                             aliases: ["sprinter deadlift", "single leg sprinter RDL"] },
  { id: "Sx2j5pyrFdA", title: "Leg curl debout unilatéral",               aliases: ["standing single leg curl", "leg curl debout unilateral"] },
  { id: "SbSNUXPRkc8", title: "Leg curl allongé (variante)",              aliases: ["lying leg curl v2"] },
  { id: "K3nhZnmDWE0", title: "Nordic curl élastique",                    aliases: ["nordic curl band", "nordic hamstring", "nordic curl"] },
  { id: "mHXcUcufj0k", title: "Iso ischios (gainage)",                    aliases: ["isometric hamstring", "iso hamstring", "isometric hamstrings"] },

  // Plyométrie / Power
  { id: "X5nN0kpqUTY", title: "Drop jump to box jump",                    aliases: ["drop jump to box", "drop to box jump"] },
  { id: "HsBtAYLzoKo", title: "Broad jump unilatéral enchaîné",           aliases: ["single leg broad jump", "broad jump unilateral", "saut horizontal unilateral enchaine"] },
  { id: "23fjtKeKqv0", title: "Knee jump to box jump",                    aliases: ["kneeling box jump", "knee to box jump"] },
  { id: "7EfeTsHZ5vk", title: "Box jump",                                  aliases: ["box jump bodyweight", "saut sur box", "saut box"] },
  { id: "DgYdA9J-zFo", title: "Medicine ball burpees",                     aliases: ["MB burpees", "med ball burpees", "burpees ballon"] },
  { id: "QwscR2BhdEg", title: "Sled push",                                 aliases: ["traineau push", "prowler push"] },
  { id: "moK1eINw7NY", title: "Kettlebell swing (variante)",               aliases: ["kettlebell swing v2", "KTB swing", "KTB SWING", "kb swing v2"] },

  // Core / Abdos
  { id: "Tau0hsW8iR0", title: "Russian twist",                            aliases: ["russian twists", "twists russes", "ab twist"] },
  { id: "YuTE_kKEH5A", title: "Crunch au sol",                            aliases: ["floor crunch", "crunch sol", "abs crunch"] },
  { id: "6pTAoXD2X6c", title: "Ab roll-out",                              aliases: ["ab wheel", "ab roll out", "wheel rollout", "ab roller"] },
  { id: "q51uqcrMZm0", title: "Iso lombaire (gainage)",                   aliases: ["lower back hold", "iso lombaires", "back extension hold"] },
  { id: "UZp11A98yyU", title: "Chaise isométrique",                       aliases: ["wall sit", "chaise mur", "isometric wall squat", "chaise"] },
];

// Construit un index trié par specifite : nom canonique d'abord, puis alias.
const INDEX = (() => {
  const map = new Map();
  for (const v of EXERCISE_VIDEOS) {
    const k = norm(v.title);
    if (!map.has(k)) map.set(k, v);
    for (const a of v.aliases || []) {
      const ka = norm(a);
      if (!map.has(ka)) map.set(ka, v);
    }
  }
  return map;
})();

// findVideo("Développé couché barre") → "https://youtu.be/vwPhNxREbnc"
// findVideo("inconnu") → null
export function findVideo(exerciseName) {
  if (!exerciseName) return null;
  const target = norm(exerciseName);
  if (!target) return null;

  // 1. Match exact
  const exact = INDEX.get(target);
  if (exact) return yt(exact.id);

  // 2. Substring match : si le nom de l'exo contient un titre/alias OU l'inverse
  for (const [k, v] of INDEX) {
    if (target.includes(k) || k.includes(target)) return yt(v.id);
  }

  return null;
}
