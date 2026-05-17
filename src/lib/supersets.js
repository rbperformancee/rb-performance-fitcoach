/**
 * supersets — regroupement des exercices en supersets.
 *
 * Le coach renseigne un champ "groupe" par exercice (ex. A1, A2, B1…).
 * Des exercices CONSÉCUTIFS partageant le même PRÉFIXE alphabétique
 * (A1 et A2 → "A") forment un superset : on les enchaîne sans repos,
 * et seul le dernier porte le temps de repos du tour.
 */

// Clé de groupe = préfixe alphabétique. "A1"→"A", "a2"→"A", "B"→"B".
export function groupKey(group) {
  if (!group) return "";
  const m = String(group).trim().toUpperCase().match(/^[A-Z]+/);
  return m ? m[0] : "";
}

/**
 * Découpe une liste d'exercices en blocs.
 * Chaque bloc : { isSuperset, key, members: [{ ex, index }] }.
 * - superset = ≥ 2 exercices consécutifs de même clé
 * - sinon = bloc isolé d'un seul exercice
 */
export function buildExerciseBlocks(exercises) {
  const blocks = [];
  let i = 0;
  while (i < exercises.length) {
    const key = groupKey(exercises[i].group);
    if (key) {
      let j = i + 1;
      while (j < exercises.length && groupKey(exercises[j].group) === key) j++;
      if (j - i >= 2) {
        blocks.push({
          isSuperset: true,
          key,
          members: exercises.slice(i, j).map((ex, k) => ({ ex, index: i + k })),
        });
        i = j;
        continue;
      }
    }
    blocks.push({ isSuperset: false, key: "", members: [{ ex: exercises[i], index: i }] });
    i++;
  }
  return blocks;
}

// Libellé du type de superset selon le nombre d'exercices.
export function supersetTypeLabel(n) {
  if (n === 2) return "Superset";
  if (n === 3) return "Tri-set";
  return "Circuit";
}
