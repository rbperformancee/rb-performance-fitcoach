// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * RB Perform — Founding Page E2E
 * Updated post-marathon (29/04) : selectors realigne sur le markup
 * actuel founding.html (form #waitlistForm, .feat ×8, CTA #join).
 */

test.describe("Founding Page", () => {
  test("page loads with correct content", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page).toHaveTitle(/Founding Coach/);
    // Locale-agnostic : Playwright Chromium par defaut en-US — on cible
    // l'attribut data-i18n au lieu du texte FR/EN
    await expect(page.locator('h1[data-i18n="founding.h1"]')).toBeVisible();
  });

  test("price shows 199€", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator(".price-new")).toContainText("199");
  });

  test("crossed out price shows 299€", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator(".price-old")).toContainText("299");
  });

  test("30 places mentioned", async ({ page }) => {
    await page.goto("/founding.html");
    // .places-text wraps the mention "30 fondateurs"
    await expect(page.locator(".places-text")).toContainText("30");
  });

  test("countdown timer is running", async ({ page }) => {
    await page.goto("/founding.html");
    const days = page.locator("#fc-d");
    await expect(days).toBeVisible();
    const text = await days.textContent();
    expect(text).toBeTruthy();
  });

  test("CTA button exists and links to #join anchor", async ({ page }) => {
    await page.goto("/founding.html");
    // Le CTA principal scroll vers le formulaire waitlist en bas de page
    const cta = page.locator("a.cta").first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "#join");
  });

  test("8 feature checkmarks present", async ({ page }) => {
    await page.goto("/founding.html");
    const feats = page.locator(".feat");
    // Apres retrait iOS/Android (29/04) il reste 8 features
    await expect(feats).toHaveCount(8);
  });

  test("waitlist form works", async ({ page }) => {
    await page.goto("/founding.html");
    // Form was renamed #notifyForm → #waitlistForm avec 4 champs
    const emailInput = page.locator("#wl-email");
    await emailInput.scrollIntoViewIfNeeded();
    await expect(emailInput).toBeVisible();

    // Fill all required fields + submit
    await page.locator("#wl-name").fill("Coach Test");
    await emailInput.fill("test@example.com");
    await page.locator("#wl-clients").selectOption("0-5");
    await page.locator("#wl-problem").selectOption("visibility");
    await page.locator("#wlBtn").click();
    await page.waitForTimeout(800);

    // Apres submit, le form se cache et le successWrap s'affiche
    await expect(page.locator("#successWrap")).toBeVisible();
  });

  test("back link goes to landing", async ({ page }) => {
    await page.goto("/founding.html");
    const back = page.locator(".back");
    await expect(back).toHaveAttribute("href", "/");
  });

  test("legal links present in footer", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator('a[href*="/legal.html"]').first()).toBeAttached();
  });

  test("OG meta tags present", async ({ page }) => {
    await page.goto("/founding.html");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /Founding Coach/);
  });
});
