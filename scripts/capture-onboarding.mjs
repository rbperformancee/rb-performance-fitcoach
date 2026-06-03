import { chromium } from "playwright";
import fs from "fs";

const URL = "http://localhost:3001";
const OUT = "/tmp/onb-shots";
fs.mkdirSync(OUT, { recursive: true });

const EMAIL = `test${Date.now()}@local.test`;
const PWD = "TestLocal2026!";
const FIRST = "Kévin";
const LAST = "Test";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } }); // iPhone 11
const page = await ctx.newPage();

// 1. SIGNUP
await page.goto(`${URL}/signup`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${OUT}/00-signup.png`, fullPage: true });
console.log("00 signup");

await page.fill('input[autocomplete="given-name"]', FIRST);
await page.fill('input[autocomplete="family-name"]', LAST);
await page.fill('input[type="email"]', EMAIL);
const pwInputs = await page.$$('input[type="password"]');
if (pwInputs.length >= 2) {
  await pwInputs[0].fill(PWD);
  await pwInputs[1].fill(PWD);
}
const cgu = await page.$('input[type="checkbox"]');
if (cgu) await cgu.check();
await page.screenshot({ path: `${OUT}/00b-signup-filled.png`, fullPage: true });

// Click create account
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);
console.log("submitted, URL:", page.url());
await page.screenshot({ path: `${OUT}/01-after-signup.png`, fullPage: true });

// Wait for onboarding to render (intro step has 2s delay then advances)
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/02-step1-identity.png`, fullPage: true });
console.log("step 1 identity");

// Try to fill step 1 specialties (pick first 2) + click continue
const pills = await page.$$('.onboarding-pill');
console.log(`Found ${pills.length} pills`);
if (pills.length > 0) {
  await pills[0].click();
  if (pills[1]) await pills[1].click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/02b-step1-pills.png`, fullPage: true });
  const btn = await page.$('.onboarding-btn:not(:disabled)');
  if (btn) await btn.click();
  await page.waitForTimeout(1500);
}

await page.screenshot({ path: `${OUT}/03-step2-push.png`, fullPage: true });
console.log("step 2 push");
// Skip push
const skipPush = await page.$('.onboarding-skip');
if (skipPush) await skipPush.click();
await page.waitForTimeout(800);

await page.screenshot({ path: `${OUT}/04-step3-invite.png`, fullPage: true });
console.log("step 3 invite");

// Skip invite
const skipInvite = await page.$('.onboarding-skip');
if (skipInvite) await skipInvite.click();
await page.waitForTimeout(800);

await page.screenshot({ path: `${OUT}/05-step4-recap.png`, fullPage: true });
console.log("step 4 recap");

await browser.close();
console.log("done →", OUT);
