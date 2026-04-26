import { getLevelInfo } from "./useXP";

describe("getLevelInfo", () => {
  test("xp = 0 → niveau 1 Rookie", () => {
    const r = getLevelInfo(0);
    expect(r.current.level).toBe(1);
    expect(r.current.name).toBe("Rookie");
    expect(r.next.level).toBe(2);
    expect(r.pct).toBe(0);
    expect(r.xp).toBe(0);
  });

  test("xp = 99 → niveau 1 (juste avant niv 2)", () => {
    const r = getLevelInfo(99);
    expect(r.current.level).toBe(1);
    expect(r.next.level).toBe(2);
    expect(r.pct).toBe(99);
  });

  test("xp = 100 → niveau 2 Apprenti", () => {
    const r = getLevelInfo(100);
    expect(r.current.level).toBe(2);
    expect(r.current.name).toBe("Apprenti");
    expect(r.next.level).toBe(3);
    expect(r.pct).toBe(0);
  });

  test("xp = 175 → niveau 2, 50% vers niveau 3", () => {
    // niv 2 = 100, niv 3 = 250 → mid = 175 → 50%
    const r = getLevelInfo(175);
    expect(r.current.level).toBe(2);
    expect(r.pct).toBe(50);
  });

  test("xp = 250 → niveau 3 Athlete", () => {
    const r = getLevelInfo(250);
    expect(r.current.level).toBe(3);
    expect(r.current.name).toBe("Athlete");
  });

  test("xp = 9999 → niveau 9 Legende (juste avant max)", () => {
    const r = getLevelInfo(9999);
    expect(r.current.level).toBe(9);
    expect(r.next.level).toBe(10);
    expect(r.pct).toBeGreaterThan(90);
  });

  test("xp = 10000 → niveau 10 max, pas de next, pct=100", () => {
    const r = getLevelInfo(10000);
    expect(r.current.level).toBe(10);
    expect(r.current.name).toBe("RB PERFORM");
    expect(r.next).toBeNull();
    expect(r.pct).toBe(100);
  });

  test("xp tres au-dela du max reste niveau 10", () => {
    const r = getLevelInfo(50000);
    expect(r.current.level).toBe(10);
    expect(r.next).toBeNull();
    expect(r.pct).toBe(100);
  });

  test("xp = -1 (cas degenere) → reste niveau 1 sans crash", () => {
    const r = getLevelInfo(-1);
    expect(r.current.level).toBe(1);
    expect(r.xp).toBe(-1);
  });

  test("chaque niveau a une couleur et un accent", () => {
    for (let xp of [0, 100, 250, 500, 900, 1500, 2500, 4000, 6500, 10000]) {
      const r = getLevelInfo(xp);
      expect(typeof r.current.color).toBe("string");
      expect(typeof r.current.accent).toBe("string");
      expect(r.current.color.length).toBeGreaterThan(0);
    }
  });
});
