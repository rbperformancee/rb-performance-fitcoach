import {
  checkBadgeEligibility,
  calculatePlatformRank,
  rankPhrase,
} from "./coachGamification";

describe("checkBadgeEligibility", () => {
  test("aucun client → aucun badge", () => {
    const r = checkBadgeEligibility({ activeClients: 0, retention: 0, mrr: 0 });
    expect(r).toEqual([]);
  });

  test("1 client → first_client + first_revenue si MRR > 0", () => {
    const r = checkBadgeEligibility({ activeClients: 1, retention: 0, mrr: 50 });
    expect(r).toContain("first_client");
    expect(r).toContain("first_revenue");
  });

  test("paliers de clients", () => {
    expect(checkBadgeEligibility({ activeClients: 5, retention: 0, mrr: 0 }))
      .toEqual(expect.arrayContaining(["first_client", "five_clients"]));
    expect(checkBadgeEligibility({ activeClients: 10, retention: 0, mrr: 0 }))
      .toEqual(expect.arrayContaining(["first_client", "five_clients", "ten_clients"]));
    expect(checkBadgeEligibility({ activeClients: 20, retention: 0, mrr: 0 }))
      .toEqual(expect.arrayContaining(["twenty_clients"]));
  });

  test("retention 90 + 3+ clients → retention_90", () => {
    const r = checkBadgeEligibility({ activeClients: 3, retention: 90, mrr: 0 });
    expect(r).toContain("retention_90");
  });

  test("retention 90 mais < 3 clients → pas de retention_90", () => {
    const r = checkBadgeEligibility({ activeClients: 2, retention: 90, mrr: 0 });
    expect(r).not.toContain("retention_90");
  });

  test("paliers MRR", () => {
    expect(checkBadgeEligibility({ activeClients: 0, retention: 0, mrr: 1 }))
      .toContain("first_revenue");
    expect(checkBadgeEligibility({ activeClients: 0, retention: 0, mrr: 1000 }))
      .toEqual(expect.arrayContaining(["first_revenue", "mrr_1000"]));
    expect(checkBadgeEligibility({ activeClients: 0, retention: 0, mrr: 3500 }))
      .toEqual(expect.arrayContaining(["first_revenue", "mrr_1000", "mrr_3000"]));
  });

  test("transformation badge", () => {
    expect(checkBadgeEligibility({ activeClients: 0, retention: 0, mrr: 0, clientsWithWeightLoss: 1 }))
      .toContain("transformation");
  });

  test("six_months si coachCreatedAt > 6 mois", () => {
    const sevenMonthsAgo = new Date(Date.now() - 7 * 30 * 86400000).toISOString();
    const r = checkBadgeEligibility({
      activeClients: 0, retention: 0, mrr: 0,
      coachCreatedAt: sevenMonthsAgo,
    });
    expect(r).toContain("six_months");
  });

  test("pas de six_months si coach jeune", () => {
    const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const r = checkBadgeEligibility({
      activeClients: 0, retention: 0, mrr: 0,
      coachCreatedAt: oneMonthAgo,
    });
    expect(r).not.toContain("six_months");
  });
});

describe("calculatePlatformRank", () => {
  test("aucun autre coach → rank 1, percentile 100", () => {
    expect(calculatePlatformRank(50, [])).toEqual({ rank: 1, total: 1, percentile: 100 });
  });

  test("meilleur score → rank 1", () => {
    const r = calculatePlatformRank(100, [50, 60, 70, 80]);
    expect(r.rank).toBe(1);
  });

  test("pire score → dernier rank", () => {
    const r = calculatePlatformRank(10, [50, 60, 70, 80]);
    expect(r.rank).toBe(4);
  });

  test("score median", () => {
    const r = calculatePlatformRank(65, [50, 60, 70, 80]);
    expect(r.rank).toBeGreaterThanOrEqual(2);
    expect(r.rank).toBeLessThanOrEqual(3);
  });
});

describe("rankPhrase", () => {
  test("top 20 → message elitiste", () => {
    expect(rankPhrase(85)).toMatch(/top 20%/i);
  });

  test("median → message neutre", () => {
    expect(rankPhrase(60)).toMatch(/top 40%/i);
  });

  test("bas → message d'encouragement", () => {
    expect(rankPhrase(20)).toMatch(/grimper/i);
  });
});
