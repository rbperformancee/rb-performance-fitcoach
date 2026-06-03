// Capture le nouvel onboarding coach (sans passer par /signup, désormais désactivé).
// 1. Crée user temp + coach row (brand_name null → trigger l'onboarding via App.jsx:1236)
// 2. Login via supabase-js → injecte la session dans localStorage Playwright
// 3. Charge l'app, screenshot chaque step
// 4. Cleanup user + coach
import "dotenv/config";
import fs from "fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { URL as NodeURL } from "url";

const URL = "http://localhost:3001";
const OUT = "/tmp/onb-new";
fs.mkdirSync(OUT, { recursive: true });

const SUPA_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPA_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPA_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_ANON || !SUPA_SVC) {
  console.error("Missing SUPABASE env vars. Source .env.local first.");
  process.exit(1);
}
const admin = createClient(SUPA_URL, SUPA_SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const anon  = createClient(SUPA_URL, SUPA_ANON, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `onb-preview-${Date.now()}@local.test`;
const PWD = "PreviewLocal2026!";

console.log(`[setup] Creating temp coach ${EMAIL}`);
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PWD,
  email_confirm: true,
});
if (cErr) { console.error("createUser failed:", cErr.message); process.exit(1); }
const userId = created.user.id;

const { error: upsertErr } = await admin.from("coaches").upsert({
  id: userId,
  email: EMAIL,
  is_active: true,
  subscription_plan: "founding",
  // brand_name laissé null → déclenche CoachOnboarding (App.jsx:1236)
}, { onConflict: "id" });
if (upsertErr) console.warn("[setup] coach upsert warn:", upsertErr.message);

// Login pour récupérer une session valide
const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PWD });
if (sErr) { console.error("signIn failed:", sErr.message); process.exit(1); }
const session = signIn.session;
console.log("[setup] Got session, access_token len=", session.access_token.length);

// Storage key Supabase = "sb-<project-ref>-auth-token"
const projectRef = new NodeURL(SUPA_URL).host.split(".")[0];
const storageKey = `sb-${projectRef}-auth-token`;
const storageValue = JSON.stringify({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at,
  expires_in: session.expires_in,
  token_type: "bearer",
  user: session.user,
});

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();

try {
  // initScript : exécuté à CHAQUE navigation, AVANT que le JS de la page s'exécute
  await ctx.addInitScript(({ k, v }) => {
    try { window.localStorage.setItem(k, v); } catch {}
  }, { k: storageKey, v: storageValue });
  await page.goto(`${URL}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(4500);

  await page.screenshot({ path: `${OUT}/01-identity.png`, fullPage: true });
  console.log("[shot] 01 identity");

  // Step 1 — remplir
  const inputs = await page.$$('.onb-input');
  if (inputs[0]) await inputs[0].fill("Rayan");
  if (inputs[1]) await inputs[1].fill("Bonte");
  const pills = await page.$$('.onb-pill');
  if (pills[0]) await pills[0].click();
  if (pills[4]) await pills[4].click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/01b-identity-filled.png`, fullPage: true });

  const continueBtn = await page.$('.onb-btn:not(:disabled)');
  if (continueBtn) await continueBtn.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: `${OUT}/02-push.png`, fullPage: true });
  console.log("[shot] 02 push");
  const skipPush = await page.$('button.onb-link');
  if (skipPush) await skipPush.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: `${OUT}/03-invite.png`, fullPage: true });
  console.log("[shot] 03 invite");
  const skipInvite = await page.$('button.onb-link');
  if (skipInvite) await skipInvite.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: `${OUT}/04-done.png`, fullPage: true });
  console.log("[shot] 04 done");
} catch (e) {
  console.error("[shoot] failed:", e.message);
  await page.screenshot({ path: `${OUT}/_error.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

console.log(`[cleanup] Removing temp coach ${EMAIL}`);
await admin.from("coaches").delete().eq("id", userId);
await admin.auth.admin.deleteUser(userId);

console.log("done →", OUT);
