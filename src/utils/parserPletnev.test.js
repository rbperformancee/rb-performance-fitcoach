import { detectPletnev, parseReps } from "./parserProgramme";

describe("detectPletnev — pattern 'N (a+b+c+d)'", () => {
  test("canonique 4 (4+2+6+6) reconnu", () => {
    const r = detectPletnev("4 (4+2+6+6)");
    expect(r).not.toBeNull();
    expect(r.rounds).toBe(4);
    expect(r.phases).toHaveLength(4);
    expect(r.phases[0]).toMatchObject({ kind: "eccentric", reps: 4, loadLabel: "1RM" });
    expect(r.phases[1]).toMatchObject({ kind: "isometric", reps: 2, loadLabel: "80%" });
    expect(r.phases[2]).toMatchObject({ kind: "dynamic",   reps: 6, loadLabel: "60%" });
    expect(r.phases[3]).toMatchObject({ kind: "explosive", reps: 6, loadLabel: "50%" });
  });

  test("variations numériques '3 (5+2+8+8)'", () => {
    const r = detectPletnev("3 (5+2+8+8)");
    expect(r).not.toBeNull();
    expect(r.rounds).toBe(3);
    expect(r.phases.map((p) => p.reps)).toEqual([5, 2, 8, 8]);
  });

  test("tolère espaces variables", () => {
    expect(detectPletnev("4(4+2+6+6)")).not.toBeNull();
    expect(detectPletnev("  4  ( 4 + 2 + 6 + 6 )  ")).not.toBeNull();
  });

  test("séparateur X/x/× optionnel entre rounds et parenthèse", () => {
    // Convention NxR classique du builder — toutes ces formes équivalentes
    expect(detectPletnev("4X(4+2+6+6)")?.rounds).toBe(4);
    expect(detectPletnev("4x(4+2+6+6)")?.rounds).toBe(4);
    expect(detectPletnev("4×(4+2+6+6)")?.rounds).toBe(4);
    expect(detectPletnev("4 X (4+2+6+6)")?.rounds).toBe(4);
    expect(detectPletnev("3X(4+2+6+6)")?.phases.map(p => p.reps)).toEqual([4, 2, 6, 6]);
  });

  test("rejette les formats voisins (pas Pletnev)", () => {
    expect(detectPletnev("4x8-10")).toBeNull();
    expect(detectPletnev("5+5+5")).toBeNull();
    expect(detectPletnev("3 (4+2+6)")).toBeNull();    // 3 phases
    expect(detectPletnev("4 (4+2+6+6+6)")).toBeNull(); // 5 phases
    expect(detectPletnev("3RM")).toBeNull();
    expect(detectPletnev("")).toBeNull();
    expect(detectPletnev(null)).toBeNull();
    expect(detectPletnev(undefined)).toBeNull();
  });

  test("parseReps('4 (4+2+6+6)') traite la notation Pletnev en N rounds", () => {
    const r = parseReps("4 (4+2+6+6)");
    expect(r.sets).toBe(4); // 4 rounds = 4 séries composites
    expect(r.reps).toBe("Méthode Pletnev");
    expect(r.rawReps).toBe("4 (4+2+6+6)");
  });

  test("parseReps standard non affecté", () => {
    expect(parseReps("4X8-10").sets).toBe(4);
    expect(parseReps("3RM").reps).toBe("3RM");
  });
});
