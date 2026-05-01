const { test, expect } = require("@playwright/test");

test("explore demo home", async ({ page }) => {
  page.on("console", msg => {
    if (msg.type() === "error") console.log("BROWSER ERR:", msg.text());
  });
  await page.goto("https://rbperform.app/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "/tmp/verify-builder/01-home.png", fullPage: true });
  console.log("Title:", await page.title());
  console.log("URL:", page.url());
  // Dump visible texts that look like nav
  const nav = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("button, a, [role='tab']"));
    return els.slice(0, 80).map(e => e.textContent.trim().slice(0, 60)).filter(t => t.length > 0 && t.length < 60);
  });
  console.log("NAV ITEMS:", JSON.stringify(nav, null, 2));
});
