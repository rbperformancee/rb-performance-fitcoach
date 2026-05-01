const { test } = require("@playwright/test");
test.use({ viewport: { width: 1280, height: 900 } });
test("probe", async ({ page }) => {
  await page.goto("https://rbperform.app/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  const dump = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const interesting = [];
    for (const e of all) {
      const t = (e.textContent||"").trim();
      if (e.children.length === 0 && t.length > 0 && t.length < 100) {
        if (/Lucas Bernard|Sophie|See all clients|Voir tous|Mes clients|CLIENTS/i.test(t)) {
          const r = e.getBoundingClientRect();
          interesting.push({ tag: e.tagName, t: t.slice(0,60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 });
        }
      }
    }
    return { items: interesting.slice(0,30), bodyH: document.body.scrollHeight, vp: { w: window.innerWidth, h: window.innerHeight } };
  });
  console.log(JSON.stringify(dump, null, 2));
});
