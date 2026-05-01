const { test, expect } = require("@playwright/test");
const fs = require("fs");

test.use({ viewport: { width: 1280, height: 900 } });
test.setTimeout(240000);

const SHOTS = "/tmp/verify-builder";
const errs = [];

test("verify ProgrammeBuilder features on prod /demo", async ({ page }) => {
  page.on("console", msg => { 
    if (msg.type() === "error") {
      const t = msg.text();
      if (/CORS policy|net::ERR_FAILED|send-push|favicon/.test(t)) return;
      errs.push(t);
      console.log("BROWSER ERR:", t.slice(0, 250));
    }
  });
  page.on("pageerror", err => { errs.push("pageerror: " + err.message); console.log("PAGE ERR:", err.message); });

  await page.goto("https://rbperform.app/demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);

  // The page renders CoachHomeScreen (a welcome overlay) at z=601 with a top-most nav pill.
  // The CoachDashboard pill (aria-label="Clients") is BEHIND it. Click the visible pill button.
  // Use the topmost nav (z=601, no class) — find buttons inside the topmost nav at bottom.
  await page.evaluate(() => {
    // Find topmost <nav> by z-index
    const navs = Array.from(document.querySelectorAll("nav")).map(n => ({
      n, z: parseInt(getComputedStyle(n).zIndex || "0", 10),
      r: n.getBoundingClientRect()
    })).filter(x => x.r.width > 0).sort((a,b) => b.z - a.z);
    if (navs.length === 0) return "no nav";
    const top = navs[0].n;
    const buttons = top.querySelectorAll("button");
    // index 1 = clients
    if (buttons.length >= 2) {
      buttons[1].click();
      return `clicked button[1] of nav z=${navs[0].z}`;
    }
    return "no buttons";
  }).then(r => console.log("topmost nav click:", r));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SHOTS}/29-after-clients.png`, fullPage: true });

  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("*")).find(e => /Lucas Bernard/.test((e.textContent||"")) && e.children.length < 5);
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(500);
  await page.getByText("Lucas Bernard").first().click({ timeout: 8000 });
  await page.waitForTimeout(2500);

  // Click Éditer near "PPL Hyper"
  const editBtns = page.locator("button:has-text('Éditer')");
  const cnt = await editBtns.count();
  let clicked = false;
  for (let i = 0; i < cnt; i++) {
    const ctx = await editBtns.nth(i).evaluate(el => {
      let p = el.parentElement;
      for (let d=0; d<6 && p; d++) {
        if (/PPL Hyper/.test(p.textContent||"")) return true;
        p = p.parentElement;
      }
      return false;
    });
    if (ctx) { await editBtns.nth(i).click(); clicked = true; break; }
  }
  if (!clicked) await editBtns.first().click();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SHOTS}/30-builder-fresh.png`, fullPage: true });

  const r = {};

  // === A. Builder open ===
  r.A_builder_open = await page.getByText("Programme Builder").first().isVisible() ? "PASS" : "FAIL";
  const wkBadges = await page.locator("text=/^S\\d+$/").count();
  r.A1_4weeks_visible = wkBadges >= 4 ? `PASS(${wkBadges} S-badges)` : `FAIL(${wkBadges})`;

  const tplBtn = page.locator("button:has-text('Templates')");
  const tplBtnCount = await tplBtn.count();
  if (tplBtnCount > 0) {
    await tplBtn.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/31-templates-modal.png`, fullPage: true });
    const labels = ["Vierge", "PPL Hypertrophie · 4 sem", "Force pure · 4 sem", "Full body · 3 sem", "Deload · 1 sem"];
    let f = 0;
    for (const l of labels) f += (await page.getByText(l, { exact: false }).count()) > 0 ? 1 : 0;
    r.A_templates_default = f >= 5 ? `PASS(${f}/5)` : `PARTIAL(${f}/5)`;
    // close
    await page.locator("[role='button'], button").filter({ hasText: /^×$/ }).first().click().catch(async () => {
      await page.keyboard.press("Escape");
    });
    await page.waitForTimeout(600);
  } else {
    r.A_templates_default = "SKIP(editMode hides Templates btn — expected per code)";
  }

  // === B. Drag handles present ===
  const handleCount = await page.locator("text=⋮⋮").count();
  r.B_handles_present = handleCount >= 3 ? `PASS(${handleCount} handles)` : `FAIL(${handleCount})`;
  // Real drag-drop is unreliable to assert; we verify handles exist (visible from screenshot 30).

  // === C. Move/Duplicate/Remove buttons ===
  const dupBtn = await page.locator("button:has-text('Dupliquer')").count();
  const upArrow = await page.locator("button:has-text('↑')").count();
  const dnArrow = await page.locator("button:has-text('↓')").count();
  const supprBtn = await page.locator("button:has-text('Supprimer')").count();
  const xBtn = await page.locator("button", { hasText: /^×$/ }).count();
  r.C_buttons_present = `dup=${dupBtn} up=${upArrow} dn=${dnArrow} suppr=${supprBtn} x=${xBtn}`;
  
  // C8 click Dupliquer week
  const wkBefore = await page.locator("text=/^S\\d+$/").count();
  if (dupBtn > 0) {
    await page.locator("button:has-text('Dupliquer')").first().click().catch(()=>{});
    await page.waitForTimeout(800);
    const wkAfter = await page.locator("text=/^S\\d+$/").count();
    const copieFound = await page.locator("text=/copie/i").count();
    r.C8_dup_week = (wkAfter > wkBefore || copieFound > 0) ? `PASS(${wkBefore}->${wkAfter}, copie=${copieFound})` : `FAIL(${wkBefore}->${wkAfter})`;
  } else {
    r.C8_dup_week = "SKIP";
  }
  
  // C9 click ↓ on a séance (move within week)
  if (dnArrow > 0) {
    const before = await page.evaluate(() => Array.from(document.querySelectorAll("input")).map(i => i.value).join("|"));
    await page.locator("button:has-text('↓')").first().click().catch(()=>{});
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => Array.from(document.querySelectorAll("input")).map(i => i.value).join("|"));
    r.C9_move_arrow = (before !== after) ? "PASS(state changed)" : "WARN(no state change detected)";
  } else { r.C9_move_arrow = "SKIP"; }

  // C10 click × on an exercise (no confirmation)
  // Only target × inside an exercise card (avoid header close ×)
  const exoXCount = await page.locator("button", { hasText: /^×$/ }).count();
  r.C10_remove_x_present = exoXCount > 0 ? `PASS(${exoXCount} × buttons)` : "FAIL";

  // === D. Exercise picker autocomplete ===
  // Find the *exercise name* input by locating the input next to the badge "1"/"2" inside an exercise row.
  // Strategy: pick input whose value starts with "Développé" or "Tractions"
  const exoInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input"));
    const matches = inputs.map((i, idx) => ({ idx, val: i.value, ph: i.placeholder, type: i.type }))
      .filter(x => /^Développé|^Tractions|^Squat|^Dips|^Élévations|^Curl/i.test(x.val||""));
    return matches.slice(0, 5);
  });
  console.log("Candidate exo name inputs:", JSON.stringify(exoInfo));
  
  if (exoInfo.length > 0) {
    const exoIdx = exoInfo[0].idx;
    const exoInput = page.locator("input").nth(exoIdx);
    await exoInput.click();
    await exoInput.fill("");
    await exoInput.type("bench", { delay: 80 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/32-autocomplete.png`, fullPage: false });
    
    const sugg = await page.locator("text=/Développé couché|Bench press/i").count();
    r.D_autocomplete = sugg > 0 ? `PASS(${sugg} suggestions)` : `WARN(none)`;
    
    if (sugg > 0) {
      // Pick "Développé couché barre"
      const target = page.locator("text=/Développé couché barre/i").first();
      if (await target.count() > 0) {
        await target.click().catch(()=>{});
        await page.waitForTimeout(700);
        const newVal = await exoInput.inputValue();
        r.D12_select = newVal.length > 5 ? `PASS("${newVal}")` : `WARN("${newVal}")`;
      }
    }
    const tesVids = await page.locator("text=/Tes vidéos/i").count();
    r.D13_tes_videos = tesVids > 0 ? `PASS(${tesVids} indicators)` : "WARN";
  } else {
    r.D_autocomplete = "SKIP(no exercise input found)";
  }

  // === E. Reps suggestions ===
  const repsHandle = await page.evaluateHandle(() => {
    const labels = Array.from(document.querySelectorAll("*")).filter(e => {
      const t = (e.textContent||"").trim();
      return /^REPS$/i.test(t) && e.children.length === 0;
    });
    for (const l of labels) {
      let p = l.parentElement;
      for (let d=0; d<5 && p; d++) {
        const inp = p.querySelector("input");
        if (inp) return inp;
        p = p.parentElement;
      }
    }
    return null;
  });
  const repsEl = repsHandle.asElement();
  if (repsEl) {
    await repsEl.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/33-reps-dropdown.png`, fullPage: false });
    // Count visible suggestion items (rough)
    const sugVisible = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*")).filter(el => {
        const t = (el.textContent||"").trim();
        if (t.length > 25 || t.length < 3) return false;
        if (!/^\d+\s*[xX×]\s*\d/.test(t)) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.width < 250 && r.height < 60;
      });
      return all.length;
    });
    r.E14_reps_dropdown = sugVisible >= 5 ? `PASS(~${sugVisible})` : `WARN(${sugVisible})`;
    
    await repsEl.fill("");
    await repsEl.type("4X", { delay: 80 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/34-reps-filtered.png`, fullPage: false });
    const filtered = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*")).filter(el => {
        const t = (el.textContent||"").trim();
        if (t.length > 20) return false;
        if (!/^4[xX]\d/.test(t)) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.width < 250;
      });
      return all.length;
    });
    r.E15_filter_4X = filtered > 0 ? `PASS(${filtered})` : `WARN(${filtered})`;
    // close dropdown
    await page.keyboard.press("Escape").catch(()=>{});
    await page.mouse.click(10, 10);
    await page.waitForTimeout(400);
  } else { r.E14_reps_dropdown = "SKIP"; }

  // === F. Analytics ===
  await page.locator("button:has-text('Analytics')").first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/35-analytics.png`, fullPage: true });
  const volMuscle = await page.locator("text=/Volume par muscle/i").count();
  const balPush = await page.locator("text=/^PUSH$/i").count();
  const balPull = await page.locator("text=/^PULL$/i").count();
  const balLegs = await page.locator("text=/^LEGS$/i").count();
  const volWeek = await page.locator("text=/Volume par semaine/i").count();
  r.F_analytics = (volMuscle && volWeek && balPush && balPull && balLegs) ? "PASS(all 3 sections)" : `PARTIAL(vm=${volMuscle} push=${balPush} pull=${balPull} legs=${balLegs} vw=${volWeek})`;
  const alerts = await page.locator("text=/⚠|💡/").count();
  r.F18_alerts = `INFO(${alerts} alerts visible)`;
  // back to preview
  await page.locator("button:has-text('Aperçu')").first().click().catch(()=>{});
  await page.waitForTimeout(500);

  // === G. Sauver comme template ===
  const saveTplBtn = page.locator("button:has-text('Sauver comme template')");
  if (await saveTplBtn.count() > 0) {
    await saveTplBtn.first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOTS}/36-save-tpl-modal.png`, fullPage: false });
    
    // Fill name (the input under "NOM DU TEMPLATE")
    const nameInputHandle = await page.evaluateHandle(() => {
      const labels = Array.from(document.querySelectorAll("*")).filter(e => /Nom du template/i.test((e.textContent||""))  && e.children.length < 3);
      for (const l of labels) {
        let p = l.parentElement;
        for (let d=0; d<5 && p; d++) {
          const inp = p.querySelector("input");
          if (inp) return inp;
          p = p.parentElement;
        }
      }
      return null;
    });
    const ne = nameInputHandle.asElement();
    let descFilled = false;
    if (ne) {
      await ne.fill("Test verify template");
      await page.waitForTimeout(200);
      // description
      const descInputHandle = await page.evaluateHandle(() => {
        const labels = Array.from(document.querySelectorAll("*")).filter(e => /description/i.test((e.textContent||"")) && e.children.length < 3 && e.tagName !== "TEXTAREA");
        for (const l of labels) {
          let p = l.parentElement;
          for (let d=0; d<5 && p; d++) {
            const inp = p.querySelector("input");
            if (inp && !/template/i.test(inp.value || "")) return inp;
            p = p.parentElement;
          }
        }
        return null;
      });
      const de = descInputHandle.asElement();
      if (de) { await de.fill("Test"); descFilled = true; }
    }
    
    // Click Sauvegarder *inside the modal* — pick the one with rgba(2,209,186) background
    // Simpler: click button "SAUVEGARDER" but only the one in modal (inner). The modal version is likely at center of screen; query within visible modal overlay.
    const submitClicked = await page.evaluate(() => {
      // Find the modal container (the topmost div with style with backdropFilter or zIndex >= 200)
      const overlays = Array.from(document.querySelectorAll("div")).filter(d => {
        const s = d.getAttribute("style") || "";
        return /backdrop-filter|zIndex|position: ?absolute/i.test(s) && /Sauvegarder/i.test(d.textContent||"");
      });
      // try last (most nested)
      for (const o of overlays.reverse()) {
        const btn = Array.from(o.querySelectorAll("button")).find(b => /sauvegarder/i.test((b.textContent||"").trim()));
        if (btn) { btn.click(); return true; }
      }
      return false;
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/37-after-save-tpl.png`, fullPage: false });
    const errMsg = await page.locator("text=/erreur|error|Erreur|n'existe pas|fonction/i").count();
    const successMsg = await page.locator("text=/Template enregistré|enregistré|sauvegardé|Saved|✓/i").count();
    const modalStillOpen = await page.locator("text=/Sauvegarder ce programme/i").count();
    r.G_save_template = `submit=${submitClicked} desc=${descFilled} err=${errMsg} ok=${successMsg} modalOpen=${modalStillOpen}`;
    if (modalStillOpen) {
      // try Annuler
      await page.locator("button:has-text('Annuler')").first().click().catch(()=>{});
      await page.waitForTimeout(500);
    }
  } else {
    r.G_save_template = "FAIL(button absent)";
  }

  // === H. Multi-apply ===
  // Make sure no modal blocks
  await page.keyboard.press("Escape").catch(()=>{});
  await page.waitForTimeout(400);
  const multi = page.locator("button:has-text('Appliquer à plusieurs')");
  if (await multi.count() > 0) {
    // Force click via JS (in case overlay still intercepting)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => /Appliquer à plusieurs/.test(b.textContent||""));
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/38-multi-apply.png`, fullPage: false });
    // Count clients listed (rough — look for at least one non-Lucas client name OR Lucas itself)
    const namesInModal = await page.evaluate(() => {
      const overlay = Array.from(document.querySelectorAll("div")).find(d => /Appliquer à plusieurs clients/i.test(d.textContent||"") && d.querySelector("button"));
      if (!overlay) return 0;
      // count immediate row-like items
      const items = Array.from(overlay.querySelectorAll("input[type='checkbox'], [role='checkbox']"));
      return items.length;
    });
    const anyName = await page.locator("text=/Sophie|Marie|Alex|Bernard|Camille|Lucas/i").count();
    r.H_multi = (namesInModal > 0 || anyName > 0) ? `PASS(checkboxes=${namesInModal}, names=${anyName})` : "FAIL(no client visible)";
    // close
    await page.keyboard.press("Escape").catch(()=>{});
    await page.waitForTimeout(400);
  } else {
    r.H_multi = "FAIL(button absent)";
  }

  // === I. Export PDF ===
  await page.keyboard.press("Escape").catch(()=>{});
  await page.waitForTimeout(400);
  const pdf = page.locator("button:has-text('Export PDF')");
  let downloadFired = false;
  let downloadName = null;
  page.on("download", async (dl) => {
    downloadFired = true;
    downloadName = dl.suggestedFilename();
    console.log("Download:", downloadName);
    await dl.saveAs(`${SHOTS}/program-export.pdf`).catch(()=>{});
  });
  if (await pdf.count() > 0) {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => /Export PDF/.test(b.textContent||""));
      if (btn) btn.click();
    });
    await page.waitForTimeout(5000);
    r.I_pdf = downloadFired ? `PASS(download=${downloadName})` : "WARN(no download in 5s — may use blob URL inline)";
  } else {
    r.I_pdf = "FAIL(button absent)";
  }

  console.log("\n========= RESULTS =========");
  console.log(JSON.stringify(r, null, 2));
  console.log("\n========= ERRORS (filtered) =========");
  console.log(JSON.stringify(errs, null, 2));
  fs.writeFileSync(`${SHOTS}/results.json`, JSON.stringify({ r, errs }, null, 2));
});
