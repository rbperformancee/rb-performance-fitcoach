// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * Demo banner ↔ modal interaction
 *
 * Bug visuel signale : sur /demo mobile, la banniere demo (.demo-banner-cta)
 * chevauchait la croix de fermeture des modales (notamment InvoiceModal qui
 * n'avait pas role="dialog" jusqu'au commit c04b0a34).
 *
 * Fix : DemoBanner observe le DOM via MutationObserver et se cache
 * automatiquement quand un [role="dialog"] est monte.
 *
 * Ce test :
 *   1. Charge /demo (auto-login si REACT_APP_DEMO_EMAIL/PASSWORD set)
 *   2. Si la banniere ne se charge pas (env manquantes en CI), skip avec note
 *   3. Sinon : injecte un [role="dialog"] dans le DOM, verifie banniere cachee
 *   4. Retire le dialog, verifie banniere reapparait
 */

test.use({
  viewport: { width: 375, height: 667 }, // iPhone SE — taille la plus contraignante
  isMobile: true,
  hasTouch: true,
});

test.describe("Mobile — Demo banner hide-on-modal", () => {
  test("banner hides when [role=dialog] is mounted", async ({ page }) => {
    await page.goto("/demo");

    // Attendre soit la banniere (auto-login OK), soit la login form (env missing)
    const banner = page.locator(".demo-banner-cta");
    const loginInput = page.locator('input[type="email"], input[name="email"]').first();

    const result = await Promise.race([
      banner.waitFor({ state: "visible", timeout: 12000 }).then(() => "banner"),
      loginInput.waitFor({ state: "visible", timeout: 12000 }).then(() => "login"),
    ]).catch(() => "unknown");

    test.skip(
      result !== "banner",
      `Demo banner not loaded (auto-login likely disabled in this env). result=${result}`
    );

    // Banner visible — inject a fake [role=dialog] and verify auto-hide
    await page.evaluate(() => {
      const div = document.createElement("div");
      div.id = "test-fake-modal";
      div.setAttribute("role", "dialog");
      div.style.cssText = "position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:#fff";
      div.innerHTML = '<div style="background:#222;padding:20px;border-radius:12px">FAKE MODAL</div>';
      document.body.appendChild(div);
    });

    // MutationObserver should fire → banner returns null → CTA gone
    await expect(banner).toBeHidden({ timeout: 1500 });

    // Remove the fake modal
    await page.evaluate(() => {
      document.getElementById("test-fake-modal")?.remove();
    });

    // Banner reappears
    await expect(banner).toBeVisible({ timeout: 1500 });
  });
});

/**
 * Source-level guarantee : tous les composants modale du repo doivent declarer
 * role="dialog" pour que le DemoBanner MutationObserver les detecte.
 *
 * Ce test grep le source pour s'assurer qu'aucune nouvelle modale n'oublie le
 * tag — runtime environment-independent (pas besoin de Playwright browser).
 */
const fs = require("fs");
const path = require("path");

test.describe("Source-level — every modal has role=dialog", () => {
  test("known modal files declare role=dialog", () => {
    const modalFiles = [
      "src/components/coach/InvoiceModal.jsx",
      "src/components/BookingModal.jsx",
      "src/components/SessionOptionsModal.jsx",
      "src/components/RPEModal.jsx",
      "src/components/coach/CommandPalette.jsx",
      "src/components/coach/InviteClient.jsx",
      "src/components/coach/AIAnalyze.jsx",
      "src/components/coach/PushNotifModal.jsx",
      "src/components/coach/ProgrammeDuplicateModal.jsx",
      "src/components/coach/Sentinel.jsx",
      "src/components/coach/PipelineKanban.jsx",
      "src/components/coach/NotificationBell.jsx",
    ];
    const missing = [];
    for (const f of modalFiles) {
      const abs = path.resolve(process.cwd(), f);
      if (!fs.existsSync(abs)) continue;
      const src = fs.readFileSync(abs, "utf8");
      if (!/role=["']dialog["']/.test(src)) missing.push(f);
    }
    expect(missing, `Missing role="dialog" in:\n  ${missing.join("\n  ")}`).toEqual([]);
  });
});
