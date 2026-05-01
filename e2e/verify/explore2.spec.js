const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 1280, height: 900 } });

test("explore - clients tab and Lucas", async ({ page }) => {
  page.on("console", msg => { if (msg.type() === "error") console.log("BROWSER ERR:", msg.text()); });
  await page.goto("https://rbperform.app/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: "/tmp/verify-builder/02a-home-desktop.png", fullPage: true });
  
  // Find all clickable nav-like items
  const navs = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("button, a, [role='tab'], [data-tab], [role='button']"));
    return nodes.map((n,i) => {
      const r = n.getBoundingClientRect();
      const t = (n.textContent||"").trim().slice(0,50);
      const cls = (n.className||"").toString().slice(0,80);
      return { i, t, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), cls };
    }).filter(x => x.w > 0 && x.h > 0 && x.t.length < 50);
  });
  for (const n of navs) {
    if (/CLIENT|HOME|PROG|BIZ|MORE|See all clients/i.test(n.t)) console.log(JSON.stringify(n));
  }
});
