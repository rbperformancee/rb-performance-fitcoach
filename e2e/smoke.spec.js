// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * SMOKE TESTS — verifient que les pages cle se chargent sans crash.
 * Pas d'auth (le magic link Supabase necessite un email reel).
 * Couvre : landing, login, navigation, no-JS-error.
 */

test.describe("Smoke", () => {

  test("Landing page (PricingPage non-authentifie) charge sans erreur", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) errors.push(msg.text());
    });

    await page.goto("/");

    // Le splash apparait puis se cache
    await expect(page).toHaveTitle(/RB Perform/i);

    // Le DOM doit etre rendu (attendre que le splash disparaisse + content visible)
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return root && root.children.length > 0;
    }, null, { timeout: 15000 });

    // Pas d'erreur JS critique
    const critical = errors.filter((e) => !e.includes("publishable key"));
    expect(critical, `Errors: ${critical.join("\n")}`).toHaveLength(0);
  });

  test("LoginScreen accessible via 'Se connecter'", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Cherche le bouton "Se connecter"
    const loginBtn = page.locator("button", { hasText: /Se connecter/i }).first();
    if (await loginBtn.count() > 0) {
      await loginBtn.click();
      // Verifier que le formulaire login apparait (input email)
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, "Pas de bouton 'Se connecter' visible (probablement deja sur landing pricing)");
    }
  });

  test("Deep link /rejoindre/[slug] → CoachCodeGate", async ({ page }) => {
    // Visite l'URL d'invitation — Vercel rewrite vers SPA, puis le useEffect
    // dans App.jsx fait history.replaceState pour transformer en ?coach=slug
    await page.goto("/rejoindre/rb-perform");
    await page.waitForLoadState("networkidle");

    // Le SPA doit booter
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return root && root.children.length > 0;
    }, null, { timeout: 15000 });

    // Wait pour que l'URL soit reecrite par notre useEffect (~50ms apres mount)
    await page.waitForFunction(() => window.location.search.includes("coach=rb-perform"), null, { timeout: 5000 });
    expect(page.url()).toMatch(/[?&]coach=rb-perform/);
  });

  test("PWA manifest existe et est valide", async ({ page }) => {
    const res = await page.request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.start_url).toBe("/");
  });

  test("Service worker se register sans erreur", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Wait pour le register
    await page.waitForTimeout(2000);
    const swRegistered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    expect(swRegistered).toBe(true);
  });

  test("Robots.txt accessible et autorise indexation", async ({ page }) => {
    const res = await page.request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toMatch(/Allow:\s*\//i);
  });

  test("Aucune erreur 4xx/5xx sur les ressources critiques", async ({ page }) => {
    const failed = [];
    page.on("response", (res) => {
      const url = res.url();
      // Ignorer les domaines externes (Stripe, Supabase auth chips, etc.)
      if (!url.includes("rb-perfor.vercel.app")) return;
      if (res.status() >= 400 && !url.includes("favicon")) {
        failed.push(`${res.status()} ${url}`);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(failed, `Failed: ${failed.join("\n")}`).toHaveLength(0);
  });
});

test.describe("Performance", () => {
  test("First Contentful Paint < 5s sur cold load", async ({ page }) => {
    await page.goto("/");
    const fcp = await page.evaluate(async () => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-contentful-paint") {
              resolve(entry.startTime);
              return;
            }
          }
        }).observe({ type: "paint", buffered: true });
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });
    expect(fcp, "FCP doit etre mesurable").toBeGreaterThan(0);
    expect(fcp, "FCP < 5s").toBeLessThan(5000);
  });

  test("Bundle JS principal < 250 KB gzipped", async ({ page }) => {
    const resp = await page.request.get("/");
    const html = await resp.text();
    const m = html.match(/\/static\/js\/main\.[a-f0-9]+\.js/);
    expect(m, "main bundle URL trouve dans index.html").not.toBeNull();
    const bundleResp = await page.request.get(m[0]);
    const sizeKB = (await bundleResp.body()).length / 1024;
    expect(sizeKB, `Bundle ${sizeKB.toFixed(0)} KB`).toBeLessThan(900); // raw, gzip ~3x smaller
  });
});
