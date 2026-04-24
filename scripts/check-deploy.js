#!/usr/bin/env node
/**
 * Post-deploy smoke test — run after `npm run deploy:prod` to verify
 * the critical surface is healthy in under 10 seconds.
 *
 *   npm run check:deploy
 *
 * Exits 0 on green, 1 on any failure.
 */

const BASE = process.env.CHECK_URL || "https://rbperform.app";

const CHECKS = [
  // Public pages
  { name: "Landing",                 method: "GET",  url: "/",                                         expect: 200 },
  { name: "Founding page",           method: "GET",  url: "/founding",                                 expect: 200 },
  { name: "Waitlist page",           method: "GET",  url: "/waitlist",                                 expect: 200 },
  { name: "Legal page",              method: "GET",  url: "/legal.html",                               expect: 200 },
  { name: "Status page",             method: "GET",  url: "/status",                                   expect: 200 },
  // Vercel applies SPA fallback for CRA projects: unknown paths serve the
  // landing page (HTTP 200) rather than a hard 404. Intentional UX — a
  // mistyped URL still converts. The explicit /404.html file is reachable
  // by path and exists for edge cases (bookmarks, share-preview crawlers).
  { name: "404.html direct",         method: "GET",  url: "/404.html",                                 expect: 200 },
  { name: "Unknown path (SPA fallback)", method: "GET", url: "/this-does-not-exist-xxx",               expect: 200 },
  { name: ".well-known/security.txt",method: "GET",  url: "/.well-known/security.txt",                 expect: 200 },
  // Monitoring
  { name: "/api/health liveness",    method: "GET",  url: "/api/health",                               expect: 200, json: (j) => j.status === "ok" },
  { name: "/api/health deep",        method: "GET",  url: "/api/health?deep=1",                        expect: 200, json: (j) => j.status === "ok" && j.checks?.supabase === "ok" },
  // Stripe endpoints — should reject bad input with 4xx, not crash with 5xx
  { name: "/api/billing-portal no auth", method: "POST", url: "/api/billing-portal",                   expect: 401, headers: { "Origin": BASE, "Content-Type": "application/json" }, body: "{}" },
  { name: "/api/checkout OPTIONS",   method: "OPTIONS", url: "/api/checkout",                          expect: 200, headers: { "Origin": BASE } },
  { name: "/api/webhook bad sig",    method: "POST", url: "/api/webhook-stripe",                       expect: 400, headers: { "stripe-signature": "invalid", "Origin": BASE }, body: "{}" },
  // Capture endpoints
  { name: "/api/waitlist OPTIONS",   method: "OPTIONS", url: "/api/waitlist",                          expect: 200, headers: { "Origin": BASE } },
  { name: "/api/vitals OPTIONS",     method: "OPTIONS", url: "/api/vitals",                            expect: 200, headers: { "Origin": BASE } },
  // CORS headers
  { name: "CSP header present",      method: "GET",  url: "/",                                         expect: 200, header: "content-security-policy" },
  { name: "HSTS header present",     method: "GET",  url: "/",                                         expect: 200, header: "strict-transport-security" },
  { name: "X-Request-ID on /api/*",  method: "OPTIONS", url: "/api/waitlist",                          expect: 200, headers: { "Origin": BASE }, header: "x-request-id" },
  // SEO
  { name: "sitemap.xml",             method: "GET",  url: "/sitemap.xml",                              expect: 200 },
  { name: "robots.txt",              method: "GET",  url: "/robots.txt",                               expect: 200 },
];

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

async function run(c) {
  const url = BASE + c.url;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: c.method,
      headers: c.headers || {},
      body: c.body,
      redirect: "manual",
    });
    const dt = Date.now() - t0;
    const codeOk = res.status === c.expect;
    let jsonOk = true, headerOk = true;
    if (c.json) {
      try {
        const j = await res.clone().json();
        jsonOk = !!c.json(j);
      } catch {
        jsonOk = false;
      }
    }
    if (c.header) {
      headerOk = !!res.headers.get(c.header);
    }
    const ok = codeOk && jsonOk && headerOk;
    return { ok, code: res.status, dt, reason: !codeOk ? `got ${res.status}` : !jsonOk ? "json predicate failed" : !headerOk ? `missing ${c.header}` : "" };
  } catch (e) {
    return { ok: false, code: 0, dt: Date.now() - t0, reason: e.message };
  }
}

(async () => {
  console.log(`\n  Checking ${BASE} ...\n`);
  let failed = 0;
  const t0 = Date.now();
  const results = await Promise.all(CHECKS.map(run));
  CHECKS.forEach((c, i) => {
    const r = results[i];
    const mark = r.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const dt = `${GRAY}${r.dt}ms${RESET}`;
    const detail = r.ok ? "" : ` ${RED}(${r.reason})${RESET}`;
    console.log(`  ${mark}  ${c.name.padEnd(35)} ${c.method.padEnd(8)} ${c.url.padEnd(35)} ${dt}${detail}`);
    if (!r.ok) failed++;
  });
  const total = Date.now() - t0;
  const passed = CHECKS.length - failed;
  console.log(`\n  ${passed}/${CHECKS.length} passed in ${total}ms\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
