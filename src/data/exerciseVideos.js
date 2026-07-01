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
  // ───────── ATHLÈTE 90 — 62 EXOS RB (uploadés 15-16 juin 2026) ─────────
  { id: "xF0PPtLiyuQ", title: "Zercher squat", aliases: ["zercher squat", "zercher_squat"] },
  { id: "XlaYQjYBnZo", title: "Zercher pin split squat", aliases: ["zercher pin split squat", "zercher_pin_split_squat"] },
  { id: "wKpLcp7TWJY", title: "Zercher fentes arrières", aliases: ["zercher fentes arriere", "zercher fentes arrieres", "zercher fentes arrières", "zercher_fentes_arrieres", "zercher_fentes_arrières"] },
  { id: "1a3V9Oo0gQo", title: "Trap barre RDL", aliases: ["rdl trap bar", "trap bar rdl", "trap barre rdl", "trap_barre_rdl"] },
  { id: "1bdfjSjHiOU", title: "Trap barre power shrug", aliases: ["power shrug trap bar", "trap barre power shrug", "trap_barre_power_shrug"] },
  { id: "A9M6rqZHMik", title: "Trap barre jump", aliases: ["jump trap bar", "trap barre jump", "trap_barre_jump"] },
  { id: "JMCEbuSdwrs", title: "Trap barre jump pieds décalés", aliases: ["trap bar jump pieds decales", "trap barre jump pieds decales", "trap barre jump pieds décalés", "trap_barre_jump_pieds_decales", "trap_barre_jump_pieds_décalés"] },
  { id: "vfgq1QUMt0E", title: "Trap barre deadlift", aliases: ["sdt trap bar", "soulevé de terre trap bar", "trap barre deadlift", "trap_barre_deadlift"] },
  { id: "ZsYN4wYq_m0", title: "Trap barre deadlift pieds décalés", aliases: ["sdt trap bar pieds decales", "trap barre deadlift pieds decales", "trap barre deadlift pieds décalés", "trap_barre_deadlift_pieds_decales", "trap_barre_deadlift_pieds_décalés"] },
  { id: "C5H4sQt7IlA", title: "Sled push technique", aliases: ["sled push technique", "sled_push_technique"] },
  { id: "idIwZUinPzE", title: "Sled push sprint", aliases: ["sled push sprint", "sled_push_sprint", "sprint sled"] },
  { id: "v8RNXdO0tsc", title: "Sled pull technique", aliases: ["sled pull technique", "sled_pull_technique"] },
  { id: "3g2Ynx4sRx4", title: "Saut latéral disque unilatéral", aliases: ["saut lateral disque unilateral", "saut latéral disque unilatéral", "saut_lateral_disque_unilateral", "saut_latéral_disque_unilatéral"] },
  { id: "hPrJt_MLtmM", title: "Saut hauteur départ assis", aliases: ["saut depart assis", "saut hauteur assis", "saut hauteur depart assis", "saut hauteur départ assis", "saut_hauteur_depart_assis", "saut_hauteur_départ_assis"] },
  { id: "V7Me3ygh4c4", title: "Rowing lâcher-attrapé", aliases: ["rowing lacher attraper", "rowing lacher rattraper", "rowing_lacher_attraper"] },
  { id: "g1GrEv_gFXA", title: "Roue à abdos genoux", aliases: ["ab wheel genoux", "roue a abdos genoux", "roue abdos genoux", "roue à abdos genoux", "roue_a_abdos_genoux", "roue_à_abdos_genoux"] },
  { id: "87vuyIGXq4U", title: "Relevés de jambes suspendus", aliases: ["hanging leg raise", "releves de jambes suspendus", "releves_de_jambes_suspendus", "relevés de jambes suspendus", "relevés_de_jambes_suspendus"] },
  { id: "YNebxBVweyk", title: "Pogo jump", aliases: ["pogo", "pogo jump", "pogo_jump"] },
  { id: "nXm4JdAPfxA", title: "Pliométrie disque deux pieds", aliases: ["pliometrie disque deux pieds", "pliometrie_disque_deux_pieds", "pliométrie disque deux pieds", "pliométrie_disque_deux_pieds"] },
  { id: "zGbDlxsd-rY", title: "Pistol box squat", aliases: ["pistol box squat", "pistol squat box", "pistol_box_squat"] },
  { id: "pjNwRo22Bv4", title: "Pin quart squat pieds décalés", aliases: ["pin quart squat pieds decales", "pin quart squat pieds décalés", "pin_quart_squat_pieds_decales", "pin_quart_squat_pieds_décalés"] },
  { id: "bQbOdzcU43c", title: "Pin quart de squat", aliases: ["pin quart de squat", "pin quart squat", "pin_quart_de_squat"] },
  { id: "ullkllVJc_U", title: "Pin front squat", aliases: ["pin front squat", "pin_front_squat"] },
  { id: "s71qfFBRIpE", title: "Pin back squat", aliases: ["pin back squat", "pin squat", "pin_back_squat"] },
  { id: "3o6sT-dIYAQ", title: "Pendlay row", aliases: ["pendlay row", "pendlay_row"] },
  { id: "x2WHposZwO8", title: "Nordic curl excentrique", aliases: ["nordic curl", "nordic curl excentrique", "nordic_curl_excentrique"] },
  { id: "aNZGtwfB6y8", title: "Lu raise", aliases: ["lu raise", "lu_raise"] },
  { id: "oyBkrYOm2nk", title: "Landmine rowing", aliases: ["landmine rowing", "landmine_rowing", "rowing landmine"] },
  { id: "4Ir2rF5mc9g", title: "Landmine push press", aliases: ["landmine push press", "landmine_push_press", "push press landmine"] },
  { id: "vGhbZc2T2dg", title: "Landmine oblique rotation", aliases: ["landmine oblique rotation", "landmine_oblique_rotation", "oblique rotation landmine"] },
  { id: "iua6-BU9nhk", title: "Lancer medicine ball pec sol", aliases: ["lancer mb pec sol", "lancer_mb_pec_sol", "mb floor"] },
  { id: "FPoRrEfpVFM", title: "Lancer MB around the world", aliases: ["around the world mb", "lancer mb around the world", "lancer_mb_around_the_world"] },
  { id: "yievearGLrE", title: "Knee jump to box jump", aliases: ["knee jump to box jump", "knee_jump_to_box_jump"] },
  { id: "u2VJBzO9oVU", title: "KB swing", aliases: ["kb swing", "kb_swing", "kettlebell swing"] },
  { id: "o9Utq285HR0", title: "Iso sprinter", aliases: ["iso sprinter", "iso_sprinter", "sprinter iso"] },
  { id: "IXOQHigaNXc", title: "Hang power clean", aliases: ["hang power clean", "hang_power_clean", "power clean", "powerclean"] },
  { id: "JHWRu9Mi0N0", title: "Hamstring walk bridge", aliases: ["hamstring bridge walk", "hamstring walk bridge", "hamstring_walk_bridge"] },
  { id: "N_WLUoo90DE", title: "Front squat", aliases: ["front squat", "front_squat"] },
  { id: "5r9k1GwmqUg", title: "Floor press RB", aliases: ["floor press", "floor press barre", "floor_press"] },
  { id: "7JvrMxcd4dY", title: "Fentes sautées pointes des pieds", aliases: ["fentes sautees pointes des pieds", "fentes sautees pointes pieds", "fentes sautées pointes des pieds", "fentes_sautees_pointes_des_pieds", "fentes_sautées_pointes_des_pieds"] },
  { id: "lkAHDfHl1TQ", title: "Farmer walk unilatéral haltères", aliases: ["farmer walk unilateral halteres", "farmer walk unilatéral haltères", "farmer_walk_unilateral_halteres", "farmer_walk_unilatéral_haltères"] },
  { id: "-C2sVS7lpKo", title: "Farmer walk disque", aliases: ["farmer walk disque", "farmer_walk_disque"] },
  { id: "QCLOX_BLmjc", title: "Explosive step up", aliases: ["explosive step up", "explosive_step_up", "step up explosive"] },
  { id: "jyAWmXCaJqA", title: "Drop latéral box stabilisé", aliases: ["drop lateral box stabilise", "drop latéral box stabilisé", "drop_lateral_box_stabilise", "drop_latéral_box_stabilisé"] },
  { id: "SxEAmCPhWok", title: "Drop from the box", aliases: ["drop from the box", "drop_from_the_box"] },
  { id: "xCXNtImyg8g", title: "Drop box to jump", aliases: ["drop box to jump", "drop_box_to_jump"] },
  { id: "e-4QRK410ko", title: "Développé militaire fentes unilatéral", aliases: ["developpe militaire fentes unilateral", "developpe_militaire_fentes_unilateral", "dm fentes unilateral", "dévéloppé militaire fentes unilatéral", "dévéloppé_militaire_fentes_unilatéral"] },
  { id: "mojIJNI2GIw", title: "Développé militaire barre debout", aliases: ["developpe militaire barre debout", "developpe_militaire_barre_debout", "dm barre debout", "développé militaire barre debout", "développé_militaire_barre_debout"] },
  { id: "ZuiVJULWU28", title: "Dead bug disque", aliases: ["dead bug disque", "dead_bug_disque"] },
  { id: "FuSmL6aXldE", title: "Counter movement jump (CMJ)", aliases: ["cmj", "counter movement jump"] },
  { id: "wLOpdlFOwfc", title: "Chaise barre", aliases: ["chaise barre", "chaise_barre"] },
  { id: "YJnp9U_izLg", title: "Broad jump", aliases: ["broad jump", "broad_jump", "saut en longueur"] },
  { id: "VtUuyeafco0", title: "Broad jump unilatéral", aliases: ["broad jump unilateral", "broad jump unilatéral", "broad_jump_unilateral", "broad_jump_unilatéral"] },
  { id: "AcPs7fIxZc0", title: "Broad jump unilatéral avec pause", aliases: ["broad jump unilateral avec pause", "broad jump unilateral pause", "broad jump unilatéral avec pause", "broad_jump_unilateral_avec_pause", "broad_jump_unilatéral_avec_pause"] },
  { id: "xg3Kruv2P0I", title: "Broad jump enchaîné", aliases: ["broad jump enchaine", "broad jump enchaîné", "broad_jump_enchaine", "broad_jump_enchaîné"] },
  { id: "Gz1vdKaec8U", title: "Broad jump départ assis", aliases: ["broad jump depart assis", "broad jump départ assis", "broad_jump_depart_assis", "broad_jump_départ_assis", "saut assis box"] },
  { id: "h9oHssLorHo", title: "Box squat", aliases: ["box squat", "box_squat"] },
  { id: "RoLb_iqK-Z8", title: "Box squat pausé", aliases: ["box squat pause", "box squat pausé", "box_squat_pause", "box_squat_pausé"] },
  { id: "eB_zCCXaMmc", title: "Box jump", aliases: ["box jump", "box_jump"] },
  { id: "UC9vbsZEiWg", title: "Box jump unilatéral", aliases: ["box jump unilateral", "box jump unilatéral", "box_jump_unilateral", "box_jump_unilatéral"] },
  { id: "ughHRxLxfjE", title: "Barre au front pausé", aliases: ["barre au front pause", "barre au front pausé", "barre_au_front_pause", "barre_au_front_pausé"] },
  { id: "tuJVgFSlg30", title: "Banc lombaire iso", aliases: ["banc lombaire iso", "banc_lombaire_iso", "lombaire iso"] },

  // ───────── NUQUE · COU (renforcement athlète) ─────────
  { id: "Nlsfq5_q1P0", title: "Cou gainage de face",                  aliases: ["cou gainage de face", "cou_gainage_de_face", "gainage cou face", "neck plank front"] },
  { id: "LhM127bX85k", title: "Cou gainage arrière crâne",            aliases: ["cou gainage arriere crane", "cou gainage arrière crâne", "cou_gainage_arriere_crane", "cou_gainage_arrière_crâne", "gainage cou arriere", "neck plank back"] },
  { id: "csYhRR9xHL0", title: "Cou flexion",                          aliases: ["cou flexion", "cou_flexion", "flexion cou", "neck flexion"] },
  { id: "WV7Z4C2HaxA", title: "Cou flexion latérale",                 aliases: ["cou flexion laterale", "cou flexion latérale", "cou_flexion_laterale", "cou_flexion_latérale", "flexion laterale cou", "neck side flexion"] },
  { id: "BZuslAlHVQ4", title: "Cou extension",                        aliases: ["cou extension", "cou_extension", "extension cou", "neck extension"] },
  { id: "ZT7jJ1lrAmY", title: "Cou élastique latéral",                aliases: ["cou elastique lateral", "cou élastique latéral", "cou_elastique_lateral", "cou_élastique_latéral", "neck band lateral", "elastique cou lateral"] },

  // ───────── ÉLASTIQUE — variations clés ─────────
  { id: "BQtQC3vT_TI", title: "Développé couché élastique",           aliases: ["developpe couche elastique", "développé couché élastique", "developpe_couche_elastique", "développé_couché_élastique", "bench elastique", "bench band", "dc elastique"] },
  { id: "_OVvCgb7aNY", title: "Deadlift trap barre élastique",        aliases: ["deadlift trap barre elastique", "deadlift trap barre élastique", "deadlift_trap_barre_elastique", "deadlift_trap_barre_élastique", "trap barre deadlift elastique", "trap bar deadlift band", "sdt trap barre elastique"] },
  { id: "YBSrwIp545k", title: "Fentes sautées délestées élastique",   aliases: ["fentes sautees delestees elastique", "fentes sautées délestées élastique", "fentes_sautees_delestees_elastique", "fentes_sautées_délestées_élastique", "fentes sautees elastique", "jump lunges band", "fentes delestees elastique"] },
  { id: "lpiM-Mj0DcA", title: "Pogo élastique",                       aliases: ["pogo elastique", "pogo élastique", "pogo_elastique", "pogo_élastique", "pogo band", "pogo jump elastique"] },

  // ───────── ANTI-ROTATION ─────────
  { id: "RqnNfxnD0AI", title: "Pallof press",                         aliases: ["pallof press", "pallof_press", "anti rotation press", "pallof"] },

  // ───────── HAUSSEMENT ÉPAULES (trapèzes) ─────────
  { id: "Z56YNKqlSOA", title: "Shrug",                                aliases: ["shrug", "shrug barre", "shrug halteres", "shrug haltères", "shrug trap bar", "haussement epaules", "haussement d'epaules", "haussements d'épaules", "trapezes shrug"] },

  // ───────── EXOS PROGRAMME ATHLÈTE 90 — vidéos perso Rayan ─────────
  { id: "NI3pE10tcIs", title: "Développé incliné haltères unilatéral", aliases: ["developpe incline halteres unilateral", "développé incliné haltères unilatéral", "developpe_incline_halteres_unilateral", "dc halteres unilateral", "dc haltères unilatéral", "incline DB unilateral"] },
  { id: "WpSTavbjpMI", title: "RDL unilatéral pieds décalés barre",   aliases: ["rdl unilateral", "rdl unilatéral", "rdl unilateral pieds decales barre", "rdl unilatéral (pieds décalés) barre", "rdl_unilateral", "rdl_unilatéral", "rdl uni barre"] },
  { id: "fTYYncnPgTg", title: "Saut survitesse élastique",            aliases: ["saut survitesse elastique", "saut survitesse élastique", "saut_survitesse_elastique", "saut_survitesse_élastique", "survitesse elastique", "overspeed band"] },
  { id: "xSbsCz8ix9I", title: "Pin bench press",                      aliases: ["pin bench press", "pin_bench_press", "pin bench", "pin couche"] },
  { id: "3nh5B_xfYWg", title: "Pompes pliométriques",                 aliases: ["pompes pliometriques", "pompes pliométriques", "pompes pliométrique", "pompes pliometrique", "pompes_pliometriques", "pompes_pliométriques", "pompes plyo", "plyo pushup", "clap push up"] },
  { id: "MnDpmNYUjbc", title: "Band pull apart",                      aliases: ["band pull apart", "band pull appart", "band_pull_apart", "pull apart band", "band pullapart"] },
  { id: "DtUuUld3b3M", title: "Close grip bench press élastique",     aliases: ["close grip bench press elastique", "close grip bench press élastique", "close_grip_bench_press_elastique", "close_grip_bench_press_élastique", "close grip bench elastique", "cgbp elastique", "bench prise serree elastique"] },
  { id: "fKbu_2L94x8", title: "KB plank switch",                      aliases: ["kb plank switch", "kb_plank_switch", "plank kb switch", "plank_kb_switch", "kettlebell plank switch"] },
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
