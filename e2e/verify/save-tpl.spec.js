const { test } = require("@playwright/test");
test.use({ viewport: { width: 1280, height: 900 } });
test.setTimeout(180000);

test("save template only", async ({ page }) => {
  page.on("console", msg => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (/CORS|net::ERR|send-push|favicon|404|406/.test(t)) return;
      console.log("BROWSER ERR:", t.slice(0, 250));
    }
  });
  page.on("pageerror", err => console.log("PAGE ERR:", err.message));
  page.on("dialog", async d => { console.log("ALERT:", d.message()); await d.accept(); });
  
  await page.goto("https://rbperform.app/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  
  // dismiss home overlay
  await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll("nav")).map(n => ({
      n, z: parseInt(getComputedStyle(n).zIndex || "0", 10),
      r: n.getBoundingClientRect()
    })).filter(x => x.r.width > 0).sort((a,b) => b.z - a.z);
    if (navs.length) navs[0].n.querySelectorAll("button")[1].click();
  });
  await page.waitForTimeout(3500);
  
  await page.getByText("Lucas Bernard").first().click();
  await page.waitForTimeout(2500);
  
  const editBtns = page.locator("button:has-text('Éditer')");
  const cnt = await editBtns.count();
  for (let i = 0; i < cnt; i++) {
    const isPPL = await editBtns.nth(i).evaluate(el => {
      let p = el.parentElement;
      for (let d=0; d<6 && p; d++) { if (/PPL Hyper/.test(p.textContent||"")) return true; p = p.parentElement; }
      return false;
    });
    if (isPPL) { await editBtns.nth(i).click(); break; }
  }
  await page.waitForTimeout(3500);
  
  // Click "Sauver comme template"
  await page.locator("button:has-text('Sauver comme template')").first().click();
  await page.waitForTimeout(800);
  
  // Use Playwright click via locator inside modal
  // Modal contains "Sauvegarder ce programme" header — find input nested
  const modal = page.locator("div", { hasText: "Sauvegarder ce programme" }).last();
  // Fill name
  const nameField = page.locator("input[placeholder*='PPL Hypertrophie 4 sem']").first();
  await nameField.fill("Test verify template");
  await page.waitForTimeout(300);
  const descField = page.locator("input[placeholder*='Volume']").first();
  await descField.fill("Test");
  await page.waitForTimeout(300);
  
  // Click the Sauvegarder button INSIDE the modal — button text "Sauvegarder" with type=button.
  // The button has linear-gradient background. Use locator within modal area.
  const submitBtn = page.locator("button[type='button']:has-text('Sauvegarder')").last();
  await submitBtn.click({ timeout: 5000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "/tmp/verify-builder/40-after-save-tpl-v2.png", fullPage: false });
  
  // Modal still open?
  const stillOpen = await page.locator("text=Sauvegarder ce programme").count();
  console.log("Modal open after submit:", stillOpen);
  // Look for toast
  const toasts = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*")).filter(e => {
      const t = (e.textContent||"").trim();
      const cs = getComputedStyle(e);
      return /enregistré|Erreur|template|Saved/i.test(t) && t.length < 100 && parseInt(cs.zIndex||"0",10) > 1000;
    });
    return all.slice(0,5).map(e => e.textContent.trim().slice(0,100));
  });
  console.log("Toasts:", JSON.stringify(toasts));
});
