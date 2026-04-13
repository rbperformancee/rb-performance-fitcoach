// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Playwright config — tests E2E sur la prod (par defaut) ou local.
 *
 * Lance:
 *   npx playwright test                       # tous les tests
 *   npx playwright test --headed              # voir le navigateur
 *   npx playwright test smoke                 # un fichier specifique
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test  # local
 */
module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 60 * 1000, // 60s par test (cold start lent)
  expect: { timeout: 10 * 1000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://rb-perfor.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
});
