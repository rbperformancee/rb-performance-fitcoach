import {
  calculateMRR,
  countActiveClients,
  calculateRetention,
  calculateActivityScore,
  calculateBusinessScore,
  getScoreMessage,
  getScoreColor,
  annualizedRevenue,
  clientsNeededForGoal,
  nextMilestone,
  mrrVariation,
  PLAN_MRR,
} from "./coachBusiness";

describe("calculateMRR", () => {
  test("liste vide → 0", () => {
    expect(calculateMRR([])).toBe(0);
    expect(calculateMRR()).toBe(0);
  });

  test("ignore les clients non-actifs", () => {
    const clients = [
      { subscription_status: "active", _plan_price: 100 },
      { subscription_status: "canceled", _plan_price: 200 },
      { subscription_status: "past_due", _plan_price: 50 },
    ];
    expect(calculateMRR(clients)).toBe(100);
  });

  test("utilise _plan_price denormalise en priorite", () => {
    const clients = [
      { subscription_status: "active", subscription_plan: "8sem", _plan_price: 250 },
    ];
    expect(calculateMRR(clients)).toBe(250);
  });

  test("fallback sur PLAN_MRR si pas de _plan_price", () => {
    const clients = [
      { subscription_status: "active", subscription_plan: "3m" },
    ];
    expect(calculateMRR(clients)).toBe(PLAN_MRR["3m"]);
  });

  test("plan inconnu → 0", () => {
    const clients = [
      { subscription_status: "active", subscription_plan: "unknown" },
    ];
    expect(calculateMRR(clients)).toBe(0);
  });

  test("somme correcte de plusieurs clients actifs", () => {
    const clients = [
      { subscription_status: "active", _plan_price: 100 },
      { subscription_status: "active", _plan_price: 150 },
      { subscription_status: "active", subscription_plan: "12m" },
    ];
    expect(calculateMRR(clients)).toBe(100 + 150 + PLAN_MRR["12m"]);
  });
});

describe("countActiveClients", () => {
  test("compte uniquement actifs", () => {
    expect(countActiveClients([
      { subscription_status: "active" },
      { subscription_status: "canceled" },
      { subscription_status: "active" },
    ])).toBe(2);
  });

  test("liste vide → 0", () => {
    expect(countActiveClients([])).toBe(0);
  });
});

describe("calculateRetention", () => {
  const dayAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

  test("aucun client > 30j → 0", () => {
    expect(calculateRetention([
      { created_at: dayAgo(5), subscription_status: "active" },
    ])).toBe(0);
  });

  test("100% retention si tous les anciens sont actifs", () => {
    expect(calculateRetention([
      { created_at: dayAgo(60), subscription_status: "active" },
      { created_at: dayAgo(45), subscription_status: "active" },
    ])).toBe(100);
  });

  test("50% retention", () => {
    expect(calculateRetention([
      { created_at: dayAgo(60), subscription_status: "active" },
      { created_at: dayAgo(60), subscription_status: "canceled" },
    ])).toBe(50);
  });

  test("clients sans created_at sont ignores", () => {
    expect(calculateRetention([
      { subscription_status: "active" },
      { created_at: dayAgo(60), subscription_status: "active" },
    ])).toBe(100);
  });
});

describe("calculateActivityScore", () => {
  test("liste vide → 0", () => {
    expect(calculateActivityScore([])).toBe(0);
  });

  test("100% si tous actifs < 7j", () => {
    expect(calculateActivityScore([
      { _inactiveDays: 1 },
      { _inactiveDays: 6 },
    ])).toBe(100);
  });

  test("0% si aucun actif", () => {
    expect(calculateActivityScore([
      { _inactiveDays: 10 },
      { _inactiveDays: 30 },
    ])).toBe(0);
  });

  test("clients sans _inactiveDays comptes comme inactifs", () => {
    expect(calculateActivityScore([
      { _inactiveDays: 1 },
      {},
    ])).toBe(50);
  });
});

describe("calculateBusinessScore", () => {
  test("retention 100 + activity 100 + mrr 3000 → 100", () => {
    expect(calculateBusinessScore({ retention: 100, activity: 100, mrr: 3000 })).toBe(100);
  });

  test("zero partout → 0", () => {
    expect(calculateBusinessScore({ retention: 0, activity: 0, mrr: 0 })).toBe(0);
  });

  test("retention seule (40% du score)", () => {
    expect(calculateBusinessScore({ retention: 100, activity: 0, mrr: 0 })).toBe(40);
  });

  test("mrr cap a 3000", () => {
    const at3k = calculateBusinessScore({ retention: 0, activity: 0, mrr: 3000 });
    const at10k = calculateBusinessScore({ retention: 0, activity: 0, mrr: 10000 });
    expect(at3k).toBe(at10k);
  });
});

describe("getScoreMessage / getScoreColor", () => {
  test("paliers de message", () => {
    expect(getScoreMessage(90)).toMatch(/elite/i);
    expect(getScoreMessage(75)).toMatch(/excellent/i);
    expect(getScoreMessage(60)).toMatch(/solide/i);
    expect(getScoreMessage(40)).toMatch(/debut/i);
    expect(getScoreMessage(10)).toMatch(/premiers pas/i);
  });

  test("paliers de couleur", () => {
    expect(getScoreColor(80)).toBe("#02d1ba");
    expect(getScoreColor(50)).toBe("#f97316");
    expect(getScoreColor(20)).toBe("#ef4444");
  });
});

describe("annualizedRevenue", () => {
  test("MRR x 12", () => {
    expect(annualizedRevenue(100)).toBe(1200);
    expect(annualizedRevenue(0)).toBe(0);
  });
});

describe("clientsNeededForGoal", () => {
  test("goal deja atteint → 0", () => {
    expect(clientsNeededForGoal(2000, 1000, [])).toBe(0);
  });

  test("goal 0 ou negatif → 0", () => {
    expect(clientsNeededForGoal(0, 0, [])).toBe(0);
    expect(clientsNeededForGoal(0, -100, [])).toBe(0);
  });

  test("calcule avec moyenne des clients actifs", () => {
    const clients = [
      { subscription_status: "active", _plan_price: 100 },
      { subscription_status: "active", _plan_price: 100 },
    ];
    // gap = 1000 - 0 = 1000, avg = 100 → 10 clients
    expect(clientsNeededForGoal(0, 1000, clients)).toBe(10);
  });

  test("fallback 100 EUR si pas de clients actifs", () => {
    expect(clientsNeededForGoal(0, 500, [])).toBe(5);
  });

  test("au moins 1 client meme si gap minuscule", () => {
    const clients = [{ subscription_status: "active", _plan_price: 1000 }];
    expect(clientsNeededForGoal(990, 1000, clients)).toBe(1);
  });
});

describe("nextMilestone", () => {
  test("0 → 500", () => {
    expect(nextMilestone(0)).toBe(500);
  });

  test("500 → 1000", () => {
    expect(nextMilestone(500)).toBe(1000);
  });

  test("au-dela des paliers → +5000", () => {
    expect(nextMilestone(25000)).toBe(30000);
  });
});

describe("mrrVariation", () => {
  test("previous = 0 → flat", () => {
    expect(mrrVariation(100, 0)).toEqual({ variation: 0, pct: 0, direction: "up" });
  });

  test("previous undefined → flat", () => {
    expect(mrrVariation(100)).toEqual({ variation: 0, pct: 0, direction: "up" });
  });

  test("croissance positive", () => {
    expect(mrrVariation(150, 100)).toEqual({ variation: 50, pct: 50, direction: "up" });
  });

  test("decroissance", () => {
    expect(mrrVariation(80, 100)).toEqual({ variation: -20, pct: -20, direction: "down" });
  });

  test("flat", () => {
    expect(mrrVariation(100, 100)).toEqual({ variation: 0, pct: 0, direction: "flat" });
  });
});
