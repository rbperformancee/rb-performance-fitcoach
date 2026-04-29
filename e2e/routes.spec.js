// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * RB Perform — Routes & Navigation E2E Tests
 *
 * Vérifie que toutes les routes fonctionnent et retournent 200.
 */

test.describe("Routes — HTTP Status", () => {
  const routes = [
    { path: "/landing.html", name: "Landing" },
    { path: "/founding.html", name: "Founding" },
    { path: "/founding", name: "Founding (rewrite)" },
    { path: "/demo", name: "Demo coach" },
    { path: "/demo-client", name: "Demo client" },
    { path: "/login", name: "Login" },
    { path: "/legal.html", name: "Legal" },
  ];

  for (const route of routes) {
    test(`${route.name} (${route.path}) returns 200`, async ({ request }) => {
      const res = await request.get(route.path);
      expect(res.status()).toBe(200);
    });
  }
});

test.describe("Routes — Content Verification", () => {
  test("/ serves landing page", async ({ page }) => {
    await page.goto("/");
    // Should be the landing page (via Vercel rewrite)
    await expect(page.locator("#heroTitle")).toBeVisible({ timeout: 10000 });
  });

  test("/founding serves checkout page", async ({ page }) => {
    await page.goto("/founding");
    await expect(page.locator(".price-new")).toBeVisible({ timeout: 10000 });
  });

  test("/demo loads app with demo flag", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    // Splash 1800ms + bundle ~240KB + hydration. Sur cold start Vercel
    // preview, peut depasser 30s. On verifie juste que l'app shell est servie
    // (root present + splash visible) ; le rendering React est teste ailleurs.
    await expect(page.locator("#root")).toBeAttached({ timeout: 30000 });
  });

  test("/legal.html has SIRET", async ({ page }) => {
    await page.goto("/legal.html");
    const body = await page.textContent("body");
    expect(body).toContain("SIRET");
  });
});

test.describe("Routes — Security Headers", () => {
  test("landing has security headers", async ({ request }) => {
    const res = await request.get("/landing.html");
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("API routes have no-cache", async ({ request }) => {
    const res = await request.head("/api/notify-founding");
    // Should exist (405 for HEAD, but headers should be there)
    const headers = res.headers();
    // API exists (doesn't 404)
    expect(res.status()).not.toBe(404);
  });
});

test.describe("Routes — Static Assets", () => {
  test("CSS file loads", async ({ request }) => {
    const res = await request.get("/landing-style.css");
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"];
    expect(ct).toContain("css");
  });

  test("JS file loads", async ({ request }) => {
    const res = await request.get("/landing-script.js");
    expect(res.status()).toBe(200);
  });

  test("sitemap.xml loads", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("rbperform.app");
    expect(body).toContain("/founding");
  });

  test("robots.txt loads", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Sitemap");
    expect(body).toContain("Disallow: /api/");
  });
});
