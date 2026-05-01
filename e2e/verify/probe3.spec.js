const { test } = require("@playwright/test");
test.use({ viewport: { width: 1280, height: 900 } });
test("probe3 - find what blocks", async ({ page }) => {
  await page.goto("https://rbperform.app/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);
  // Find overlays at high z-index
  const dump = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("body *"));
    const overlays = all.filter(e => {
      const cs = getComputedStyle(e);
      const z = parseInt(cs.zIndex || "0", 10);
      return z >= 100 && cs.position === "fixed" && cs.display !== "none";
    }).map(e => ({
      tag: e.tagName,
      cls: (e.className||"").toString().slice(0,80),
      z: getComputedStyle(e).zIndex,
      txt: (e.textContent||"").trim().slice(0,80),
      r: e.getBoundingClientRect()
    }));
    return overlays;
  });
  console.log(JSON.stringify(dump, null, 2));
  
  // Try direct State manipulation: use react-devtools-style hack
  // Try clicking "Clients" pill while logging click events
  const clickResult = await page.evaluate(() => {
    return new Promise(resolve => {
      const btn = document.querySelector("button[aria-label='Clients']");
      if (!btn) return resolve("no btn");
      let captured = false;
      btn.addEventListener("click", () => { captured = true; }, { once: true });
      btn.click();
      setTimeout(() => resolve(captured ? "click handler fired" : "click did NOT fire"), 200);
    });
  });
  console.log("click test:", clickResult);
});
