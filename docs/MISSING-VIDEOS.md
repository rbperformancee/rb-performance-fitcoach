# Vidéos exercices — gaps à combler

Audit du **2 mai 2026** : 144 vidéos uniques (64 perso + 81 fallback). Voici les exercices courants **sans aucune match** (ni perso, ni fallback). À combler au fil de l'eau.

## 🔴 Top priorité (très demandés)

| Exercice | Suggéré (créateur recommandé) | Statut |
|---|---|---|
| **Trap bar deadlift** | Squat University ou Jeff Nippard | ❌ |
| **Hip thrust barre** | All Musculation (FR) ou Athlean-X | ❌ |
| **Battle ropes** | Athlean-X | ❌ |
| **Sled push** | Squat University | ❌ |
| **Farmer walk / carry** | Athlean-X (loaded carries) | ❌ |
| **Hanging leg raise** | Athlean-X | ❌ |
| **Dragon flag** | Athlean-X (Bruce Lee classic) | ❌ |
| **Step-up** (banc + haltères) | Squat University | ❌ |

## 🟡 Variantes curls bras (très utilisées)

| Exercice | Suggéré | Statut |
|---|---|---|
| **Concentration curl** | Jeff Nippard | ❌ |
| **Incline curl haltères** (banc à 45°) | Jeff Nippard | ❌ |
| **Spider curl** | Jeff Nippard | ❌ |
| **Cable curl** (poulie basse) | Jeff Nippard | ❌ |
| **Dumbbell curl basique** (debout) | Jeff Nippard | ❌ |
| **Curl marteau** (hammer) | Jeff Nippard | ❌ |

## 🟠 Variantes squat / haltéro

| Exercice | Suggéré | Statut |
|---|---|---|
| **Zercher squat** | Squat University | ❌ |
| **Front squat** | Catalyst Athletics | ❌ |
| **Back squat technique** | Squat University | ❌ |
| **Goblet squat** | Squat University | ❌ |

## 🔵 Landmine variations (full-body utile)

| Exercice | Suggéré | Statut |
|---|---|---|
| **Landmine press** | Athlean-X | ❌ |
| **Landmine row** | Squat University | ❌ |
| **Landmine squat** | Squat University | ❌ |

## 🟢 Overhead press barre (standard, manque)

| Exercice | Suggéré | Statut |
|---|---|---|
| **Overhead press barre debout (OHP)** | Jeff Nippard ou Squat University | ❌ |

---

## 📋 Workflow pour ajouter une vidéo

### Option A — Tu films toi-même (priorité)

1. Tourne la vidéo (vertical iPhone, 30-60s, technique propre)
2. Upload sur YouTube en **non répertorié** (pas privé) sur la chaîne RB Perform
3. Récupère l'ID YouTube (la partie après `youtu.be/` ou `?v=`)
4. Édite `src/data/exerciseVideos.js` :

   ```js
   { id: "ABC123XYZ", title: "Trap bar deadlift", aliases: ["trap bar", "TBDL"] },
   ```

5. Place dans la bonne section (PECTORAUX / DOS / JAMBES…)
6. Commit + push

### Option B — Fallback créateur externe (en attendant)

1. Cherche sur YouTube une vidéo de qualité d'un creator de confiance
2. Récupère l'ID
3. Édite `src/data/fallbackVideos.js` :

   ```js
   { id: "ABC123XYZ", title: "Trap bar deadlift", aliases: ["trap bar", "TBDL"], creator: "Squat University" },
   ```

4. Commit + push

**Important** : la vidéo perso (Option A) **prend automatiquement la priorité** sur le fallback (Option B). Tu peux donc commencer par B et upgrader vers A quand tu auras filmé.

---

## 🎯 Ressources créateurs recommandés

| Creator | YouTube channel | Use case |
|---|---|---|
| **Jeff Nippard** | `@JeffNippard` | Biomécanique + form tutorials (anglais, parfait pour exos isolation) |
| **Squat University** | `@SquatUniversity` | Technique squat/deadlift + mobilité (Aaron Horschig, MS PT) |
| **Athlean-X** | `@athleanx` | Misc full-body + abs + carries (Jeff Cavaliere, MSPT) |
| **Catalyst Athletics** | `@CatalystAthletics` | Haltérophilie pure (Greg Everett, ref olympique) |
| **All-Musculation (AM)** | `@AllMusculation` | FR, polyvalent (Rudy Coia) |
| **Nassim Sahili** | `@NassimSahili` | FR, technique force/perf |

---

## 🔧 Fallback UX déjà en place (pas besoin de t'inquiéter)

Si un coach tape un exo **sans aucune vidéo**, le système :
1. Suggère "🔍 Chercher sur YouTube" dans le picker (lien direct)
2. Permet de coller manuellement une URL via le champ "Vidéo URL" de l'exo
3. Côté client : badge "📷 Vidéo bientôt" en attente

Le launch peut donc se faire **sans avoir comblé tous les gaps** — la feature dégrade gracefully.
