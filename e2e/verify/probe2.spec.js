const { test } = require("@playwright/test");
test.use({ viewport: { width: 1280, height: 900 } });
test("probe2", async ({ page }) => {
  await page.goto("https://rbperform.app/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);
  // Click Clients via aria
  await page.locator("button[aria-label='Clients']").first().click().catch(e => console.log("err:", e.message));
  await page.waitForTimeout(3500);
  const dump = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const interesting = [];
    for (const e of all) {
      const t = (e.textContent||"").trim();
      if (e.children.length === 0 && t.length > 0 && t.length < 100) {
        if (/Lucas|Sophie|Bernard|Marie|Camille|Alex|@/i.test(t)) {
          const r = e.getBoundingClientRect();
          interesting.push({ tag: e.tagName, t: t.slice(0,70), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
    }
    return { items: interesting.slice(0,30), bodyH: document.body.scrollHeight, vp: { w: window.innerWidth, h: window.innerHeight } };
  });
  console.log("AFTER CLICK CLIENTS:", JSON.stringify(dump, null, 2));
  await page.screenshot({ path: "/tmp/verify-builder/probe-after-click.png", fullPage: true });
});
