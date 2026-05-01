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
  { id: "jUR9XilKRp0", title: "Développé pec incliné machine",           aliases: ["incline machine press", "machine incline"] },
  { id: "ccu3gs1UDk8", title: "Pec fly machine",                         aliases: ["pec deck", "fly machine", "ecartes machine"] },
  { id: "YaKxvMrOFqI", title: "Écartés poulies basses",                  aliases: ["cable fly", "ecartes poulie", "low cable fly"] },

  // ───────── ÉPAULES ─────────
  { id: "iXbTYTE_4qU", title: "Développé militaire smith machine",       aliases: ["OHP smith", "shoulder press smith"] },
  { id: "vqSbg1MnhY8", title: "Développé militaire machine",             aliases: ["machine shoulder press", "OHP machine"] },
  { id: "SDf3D8rHvZU", title: "Développé militaire haltères assis",      aliases: ["seated DB press", "OHP haltere", "shoulder press DB"] },
  { id: "_zbC5RQfkmk", title: "Élévation latérale haltères",             aliases: ["lateral raise", "elevation laterale", "side raise"] },
  { id: "EFXUQ2DE5pU", title: "Élévation latérale poulie basse",         aliases: ["cable lateral raise", "elevation laterale cable"] },
  { id: "vHj1_UHR0mA", title: "Élévation latérale poulie hauteur hanche", aliases: ["cable lateral hip"] },
  { id: "IYdznV7VTZs", title: "Pec deck inversé",                        aliases: ["reverse pec deck", "rear delt machine"] },
  { id: "O_xluCH9y20", title: "Oiseaux haltères banc incliné",           aliases: ["incline rear delt fly", "oiseaux"] },

  // ───────── TRICEPS ─────────
  { id: "G8GYdDkdmUk", title: "Extension triceps corde poulie haute",    aliases: ["triceps poulie corde", "rope pushdown", "triceps corde", "extension triceps haute"] },
  { id: "gwC1Eo74LuA", title: "Extension triceps nuque corde poulie basse", aliases: ["overhead triceps cable", "triceps nuque"] },
  { id: "tPgqu7J0Q4A", title: "Haltères au front",                       aliases: ["skull crusher", "extension verticale haltere", "extensions verticales haltère", "french press"] },
  { id: "If6gIf7znIM", title: "Haltères au front (variation)",           aliases: ["skull crusher v2"] },

  // ───────── BICEPS ─────────
  { id: "RUGpTkGXDiU", title: "Curl biceps barre EZ debout",             aliases: ["curl barre EZ", "curl EZ", "EZ bar curl"] },
  { id: "trJO8Kwclac", title: "Curl biceps barre EZ debout (variation)", aliases: ["curl EZ v2"] },
  { id: "PXKCDakuWcU", title: "Curl biceps barre EZ pupitre",            aliases: ["preacher curl", "curl pupitre"] },
  { id: "zjPYJSsipBc", title: "Curl biceps haltères banc incliné",       aliases: ["incline DB curl", "curl incline"] },
  { id: "_2HGonsfTec", title: "Curl marteau haltères",                   aliases: ["hammer curl", "curl marteau"] },
  { id: "ahaj7Cii4lc", title: "Curl marteau poulie basse corde",         aliases: ["cable hammer rope"] },
  { id: "bgTSPCyIreo", title: "Curl marteau corde à la poulie",          aliases: ["cable rope curl", "rope hammer"] },

  // ───────── DOS ─────────
  { id: "kECazDUDmWA", title: "Traction pronation",                      aliases: ["pull up", "tractions lestees pronation", "tractions pronation", "pull-up"] },
  { id: "yolrxecoEcY", title: "Traction supination",                     aliases: ["chin up", "chin-up", "tractions supination"] },
  { id: "kPsgsSDLkuU", title: "Tirage vertical pronation",               aliases: ["lat pulldown", "lat pulldown pronation"] },
  { id: "wQa7GGIfP0M", title: "Tirage vertical prise serrée",            aliases: ["close grip pulldown", "tirage poitrine prise neutre", "tirage vertical prise neutre", "neutral grip pulldown"] },
  { id: "dEwiKZ3ThwA", title: "Tirage vertical supination",              aliases: ["reverse grip pulldown", "underhand pulldown"] },
  { id: "DFM5DniTl1g", title: "Tirage horizontal prise large",           aliases: ["wide cable row", "rowing assis poulie", "seated cable row"] },
  { id: "d2l3nd15qWM", title: "Tirage horizontal prise neutre serrée",   aliases: ["close grip seated row", "seated row neutral"] },
  { id: "dkbmaZB0krM", title: "Rowing bûcheron haltères",                aliases: ["rowing barre", "DB row", "single arm row", "rowing haltere"] },

  // ───────── DELTOIDES POSTERIEURS ─────────
  { id: "Hg3N4sPDt_E", title: "Face pull",                               aliases: ["face pulls", "facepull"] },

  // ───────── JAMBES ─────────
  { id: "c-6Fy2UgydA", title: "Back squat barre libre",                  aliases: ["squat barre dos", "back squat", "squat barre"] },
  { id: "r9h6YYH31YU", title: "Optimise ton squat",                       aliases: ["technique squat", "tuto squat"] },
  { id: "OxNOG0viU4o", title: "Back squat smith machine",                aliases: ["smith squat"] },
  { id: "sw01LmcjfKA", title: "Back squat smith machine (variation)",    aliases: ["smith squat v2"] },
  { id: "5Gy4_5ZFbbA", title: "Goblet squat",                             aliases: ["gobelet squat", "front loaded squat"] },
  { id: "db9zquWGCDk", title: "Hack squat",                               aliases: ["hack squat machine"] },
  { id: "TykJQtunfYc", title: "Soulevés de terre jambes tendus",         aliases: ["RDL", "stiff leg deadlift", "soulevé de terre roumain", "romanian deadlift"] },
  { id: "uV1lUVQ3BU8", title: "Soulevé de terre jambes tendues haltères", aliases: ["DB RDL", "haltere RDL"] },
  { id: "D0JX31bug10", title: "Soulevé de terre jambes tendues smith",   aliases: ["smith RDL"] },
  { id: "wsvWqLdRTB0", title: "Presse à cuisses verticale",              aliases: ["vertical leg press"] },
  { id: "HxN9cJJUT5U", title: "Presse à cuisses verticale pieds serrés", aliases: ["narrow leg press"] },
  { id: "R97EvnlUTYQ", title: "Presse à cuisses horizontale",            aliases: ["leg press", "horizontal leg press", "presse à cuisses"] },
  { id: "Hq9P-WL9BSk", title: "Presse à cuisses horizontale unilatérale", aliases: ["single leg press"] },
  { id: "X9ne2alS1LY", title: "Fentes bulgares haltères",                aliases: ["bulgarian split squat", "fentes marchées haltères", "fentes bulgares"] },
  { id: "lvRlJZsbCpE", title: "Fentes arrières barre libre",             aliases: ["reverse lunge barre"] },
  { id: "KjuOGthoYWs", title: "Fentes arrières smith machine",           aliases: ["smith reverse lunge"] },
  { id: "Vt4Lxn1Tfv4", title: "Leg curl unilatéral",                     aliases: ["leg curl allongé", "lying leg curl", "single leg curl"] },
  { id: "UOlo7n4YKtQ", title: "Leg curl assis",                           aliases: ["seated leg curl"] },
  { id: "CCY54rtIIjA", title: "Leg extension",                            aliases: ["leg extension machine"] },
  { id: "TX7K_sw3vfY", title: "Adducteur machine",                        aliases: ["adductor machine"] },
  { id: "JKOXC97r6z4", title: "Adducteur machine (variation)",            aliases: [] },
  { id: "NpTtcZJe3rU", title: "Abducteur machine",                        aliases: ["abductor machine"] },
  { id: "fZNu9CBOSik", title: "Extension mollets debout",                aliases: ["mollets debout machine", "standing calf raise", "mollet debout"] },
  { id: "DtuWDGWYkpE", title: "Extension mollets assis machine",         aliases: ["seated calf raise"] },

  // ───────── ABDOS ─────────
  { id: "oXNpITk-C9k", title: "10 minutes séance abdos",                 aliases: ["abs workout", "abdos seance"] },
  { id: "CX8wdlnLF80", title: "Relevés de jambes chaise romaine",        aliases: ["captain chair leg raise", "releves jambes"] },
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
