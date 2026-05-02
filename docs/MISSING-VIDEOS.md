# Vidéos exercices — gaps à combler

Audit du **2 mai 2026**, mis à jour le **2 mai 2026** après wave Q2.
158 vidéos uniques (64 perso + 94 fallback).

## ✅ Comblées dans la wave Q2 (14 exos)

| Exercice | Source | Statut |
|---|---|---|
| Trap bar deadlift | Tutorial | ✅ |
| Hip thrust barre | Tutorial | ✅ |
| Battle ropes | Athlean-X | ✅ |
| Sled push (TANK) | Squat University | ✅ |
| Farmer walk / carry | Tutorial | ✅ |
| Hanging leg raise | Athlean-X | ✅ |
| Dragon flag | Athlean-X | ✅ |
| Step-up | Tutorial | ✅ |
| Zercher squat | Chris Duffin | ✅ |
| Front squat | Squat University | ✅ |
| Landmine press | Athlean-X | ✅ |
| Overhead press barre | Jeff Nippard | ✅ |
| Bayesian cable curl | Jeff Nippard | ✅ |
| Bicep ranking (preacher · concentration · incline · hammer · spider) | Jeff Nippard | ✅ (vidéo couvre les 5) |

## 🟡 Restant à combler quand tu aures le temps

| Exercice | Suggéré | Priorité |
|---|---|---|
| **Spider curl** dédié (vidéo isolée, pas le ranking) | Jeff Nippard | basse |
| **Dumbbell curl basique** dédié | Jeff Nippard | basse |
| **Back squat technique** dédié | Squat University | moyenne |
| **Goblet squat** dédié | Squat University | basse |
| **Landmine row** | Squat University | moyenne |
| **Landmine squat** | Squat University | basse |
| **Concentration curl** dédié | Jeff Nippard | basse |
| **Curl marteau** dédié | Jeff Nippard | basse |
| **Incline curl** dédié | Jeff Nippard | basse |
| **Cable curl** (poulie basse standard) | Jeff Nippard | basse |

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
