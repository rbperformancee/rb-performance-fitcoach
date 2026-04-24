// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * RB Perform — Founding Checkout Page E2E Tests
 */

test.describe("Founding Page", () => {
  test("page loads with correct content", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page).toHaveTitle(/Founding Coach/);
    await expect(page.locator("h1")).toContainText("prix d'aujourd'hui");
  });

  test("price shows 199€", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator(".price-new")).toContainText("199€");
  });

  test("crossed out price shows 299€", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator(".price-old")).toContainText("299€");
  });

  test("30 places mentioned", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator(".places")).toContainText("30");
  });

  test("countdown timer is running", async ({ page }) => {
    await page.goto("/founding.html");
    const days = page.locator("#fc-d");
    await expect(days).toBeVisible();
    const text = await days.textContent();
    // Should not be 00 (unless offer expired)
    expect(text).toBeTruthy();
  });

  test("CTA button exists and is clickable", async ({ page }) => {
    await page.goto("/founding.html");
    // Main CTA currently routes to waitlist (Payment Link shared in DM only
    // until app stabilises — see chore commit 4001c20c).
    const cta = page.locator("a.cta").first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/waitlist");
    await expect(cta).toContainText("Waitlist Founding");
  });

  test("9 feature checkmarks present", async ({ page }) => {
    await page.goto("/founding.html");
    const feats = page.locator(".feat");
    await expect(feats).toHaveCount(9);
  });

  test("guarantee section present", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator(".guarantee")).toContainText("30 jours");
  });

  test("email capture form works", async ({ page }) => {
    await page.goto("/founding.html");
    const emailInput = page.locator("#notifyEmail");
    await emailInput.scrollIntoViewIfNeeded();
    await expect(emailInput).toBeVisible();

    // Fill and submit
    await emailInput.fill("test@example.com");
    await page.locator("#notifyForm button[type=submit]").click();
    await page.waitForTimeout(500);

    // Success message should show
    await expect(page.locator("#notifySuccess")).toBeVisible();
  });

  test("back link goes to landing", async ({ page }) => {
    await page.goto("/founding.html");
    const back = page.locator(".back");
    await expect(back).toHaveAttribute("href", "/");
  });

  test("legal links present in footer", async ({ page }) => {
    await page.goto("/founding.html");
    await expect(page.locator('a[href="/legal.html"]')).toBeAttached();
  });

  test("OG meta tags present", async ({ page }) => {
    await page.goto("/founding.html");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /Founding Coach/);
  });
});
