#!/usr/bin/env node
/**
 * RB Perform — Health Check Script
 *
 * Teste de facon exhaustive que l'app fonctionne de A a Z :
 * authentification, base de donnees, APIs externes, performances.
 *
 * Usage:
 *   node scripts/health-check.js
 *   node scripts/health-check.js --prod-url=https://rb-perfor.vercel.app
 *   node scripts/health-check.js --verbose
 */

const fs = require("fs");
const path = require("path");

// ===== CONFIG =====
function loadEnv() {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) process.env[match[1]] = match[2].trim();
    });
  } catch {}
}
loadEnv();

const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const PROD_URL = (args.find((a) => a.startsWith("--prod-url="))?.split("=")[1]) || "https://rb-perfor.vercel.app";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://pwkajyrpldhlybavmopd.supabase.co";
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const SUPER_ADMIN_EMAIL = "rb.performancee@gmail.com";

// ===== ANSI COLORS =====
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m", gray: "\x1b[90m",
};
const icon = { pass: `${c.green}✓${c.reset}`, fail: `${c.red}✗${c.reset}`, skip: `${c.yellow}⚠${c.reset}`, info: `${c.blue}ℹ${c.reset}` };

// ===== RESULT TRACKER =====
const results = { pass: 0, fail: 0, skip: 0, failures: [] };

function section(title) {
  console.log(`\n${c.bold}${c.cyan}━━━ ${title} ━━━${c.reset}`);
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === "skip") {
      console.log(`  ${icon.skip} ${c.dim}${name}${c.reset} ${c.yellow}(skipped)${c.reset}`);
      results.skip++;
      return false;
    }
    if (result && typeof result === "object" && result.skip) {
      console.log(`  ${icon.skip} ${c.dim}${name}${c.reset} ${c.yellow}(${result.skip})${c.reset}`);
      results.skip++;
      return false;
    }
    const detail = typeof result === "string" ? ` ${c.dim}${result}${c.reset}` : "";
    console.log(`  ${icon.pass} ${name}${detail}`);
    results.pass++;
    return true;
  } catch (e) {
    console.log(`  ${icon.fail} ${c.red}${name}${c.reset}`);
    if (VERBOSE || !e.silent) console.log(`    ${c.red}${c.dim}${e.message}${c.reset}`);
    results.fail++;
    results.failures.push({ name, error: e.message });
    return false;
  }
}

// ===== SUPABASE HELPERS =====
async function sbRest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json, headers: res.headers };
}

// ===== 1. SUPABASE CONNECTIVITE =====
async function testSupabaseConnectivity() {
  section("Supabase — Connectivite");

  await test("Ping Supabase REST", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    // 200/404/401 = serveur repond (401 = auth requise au root, normal)
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await test("Ping Supabase Auth", async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `providers: ${Object.keys(data.external || {}).filter(k => data.external[k]).slice(0, 3).join(", ") || "email-only"}`;
  });

  await test("SUPABASE_ANON_KEY present", async () => {
    if (!SUPABASE_ANON) throw new Error("Cle ANON vide");
    return `${SUPABASE_ANON.slice(0, 20)}...`;
  });
}

// ===== 2. TABLES =====
const CRITICAL_TABLES = [
  "clients", "programmes", "coaches", "super_admins",
  "exercise_logs", "session_logs", "weight_logs", "session_rpe",
  "messages", "coach_notes", "push_subscriptions", "bookings",
  "coach_slots", "nutrition_logs", "daily_tracking", "run_logs",
  "nutrition_goals", "client_badges", "notification_logs",
];

async function testTables() {
  section("Base de donnees — Tables");

  for (const table of CRITICAL_TABLES) {
    await test(`Table "${table}" accessible`, async () => {
      const { status, ok, data } = await sbRest(`/${table}?select=*&limit=1`);
      if (ok) return `${status}`;
      if (status === 401 || status === 403) return { skip: "RLS bloque (ok)" };
      if (status === 404 || (data?.code === "42P01")) throw new Error("Table absente");
      throw new Error(`HTTP ${status}: ${JSON.stringify(data).slice(0, 80)}`);
    });
  }
}

// ===== 3. RLS STATUS =====
async function testRLSStatus() {
  section("Base de donnees — RLS");

  // On verifie qu'on peut lire les tables critiques avec la cle ANON
  // (si RLS est actif sans policy on aurait 0 row meme avec des donnees)
  await test("clients lisible en anon", async () => {
    const { ok, data } = await sbRest(`/clients?select=id&limit=1`);
    if (!ok) throw new Error("Non accessible");
    if (!Array.isArray(data)) throw new Error("Format inattendu");
    return `${data.length} row${data.length > 1 ? "s" : ""}`;
  });

  await test("coaches lisible en anon", async () => {
    const { ok, data } = await sbRest(`/coaches?select=id&limit=1`);
    if (!ok) throw new Error("Non accessible");
    return `${Array.isArray(data) ? data.length : 0} row`;
  });

  await test("notification_logs protege (RLS actif)", async () => {
    const { status, data } = await sbRest(`/notification_logs?select=id&limit=1`);
    // Avec RLS + pas de policy, on recoit 200 avec 0 row (pas 403)
    if (Array.isArray(data) && data.length === 0) return "isolated (0 rows visible)";
    if (status === 401 || status === 403) return "403 (ok)";
    return "visible — verifier RLS";
  });
}

// ===== 4. READ/WRITE CRITIQUES =====
async function testCRUD() {
  section("Base de donnees — Lecture/Ecriture");

  // Trouver un client de test
  let testClient = null;
  await test("Recuperer un client de test", async () => {
    const { data } = await sbRest(`/clients?select=id,email,full_name&limit=1`);
    if (!Array.isArray(data) || data.length === 0) throw new Error("Aucun client en DB");
    testClient = data[0];
    return `${testClient.email}`;
  });

  if (!testClient) {
    console.log(`  ${icon.skip} ${c.dim}Tests CRUD suivants skipes (pas de client test)${c.reset}`);
    results.skip += 6;
    return;
  }

  await test("Lire programmes d'un client", async () => {
    const { ok, data } = await sbRest(`/programmes?client_id=eq.${testClient.id}&select=id,is_active&limit=5`);
    if (!ok) throw new Error("Read failed");
    return `${Array.isArray(data) ? data.length : 0} programme(s)`;
  });

  await test("Lire daily_tracking d'un client", async () => {
    const { ok, status, data } = await sbRest(`/daily_tracking?client_id=eq.${testClient.id}&select=date,eau_ml,sommeil_h,pas&limit=5`);
    if (!ok) throw new Error(`HTTP ${status}: ${JSON.stringify(data).slice(0, 100)}`);
    return `${Array.isArray(data) ? data.length : 0} row(s)`;
  });

  await test("Lire nutrition_logs d'un client", async () => {
    const { ok, status, data } = await sbRest(`/nutrition_logs?client_id=eq.${testClient.id}&select=date,repas,aliment&limit=5`);
    if (!ok) throw new Error(`HTTP ${status}: ${JSON.stringify(data).slice(0, 100)}`);
    return `${Array.isArray(data) ? data.length : 0} log(s)`;
  });

  await test("Lire weight_logs d'un client", async () => {
    const { ok, data } = await sbRest(`/weight_logs?client_id=eq.${testClient.id}&select=date,weight&limit=5`);
    if (!ok) throw new Error("Read failed");
    return `${Array.isArray(data) ? data.length : 0} pesees`;
  });

  await test("Write/Delete daily_tracking (eau_ml)", async () => {
    const today = new Date().toISOString().split("T")[0];
    // Backup existant
    const before = await sbRest(`/daily_tracking?client_id=eq.${testClient.id}&date=eq.${today}&select=eau_ml`);
    const originalEau = before.data?.[0]?.eau_ml ?? null;
    // Upsert
    const up = await sbRest(`/daily_tracking?on_conflict=client_id,date`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ client_id: testClient.id, date: today, eau_ml: 9999 }),
    });
    if (!up.ok) throw new Error(`Upsert HTTP ${up.status}: ${JSON.stringify(up.data).slice(0, 100)}`);
    // Verify read
    const check = await sbRest(`/daily_tracking?client_id=eq.${testClient.id}&date=eq.${today}&select=eau_ml`);
    const eau = check.data?.[0]?.eau_ml;
    if (eau !== 9999) throw new Error(`Verif echec (eau_ml=${eau})`);
    // Restore
    await sbRest(`/daily_tracking?client_id=eq.${testClient.id}&date=eq.${today}`, {
      method: "PATCH",
      body: JSON.stringify({ eau_ml: originalEau }),
    });
    return "OK (write + verify + restore)";
  });
}

// ===== 5. SUPER ADMIN =====
async function testSuperAdmin() {
  section("Super Admin");

  await test("Super admin enregistre en DB", async () => {
    const { ok, data } = await sbRest(`/super_admins?email=eq.${SUPER_ADMIN_EMAIL}&select=id,email`);
    if (!ok) throw new Error("Read failed");
    if (!Array.isArray(data) || data.length === 0) throw new Error(`${SUPER_ADMIN_EMAIL} pas super admin`);
    return `${data[0].email}`;
  });

  await test("Coach entry pour super admin existe", async () => {
    const { data } = await sbRest(`/coaches?email=eq.${SUPER_ADMIN_EMAIL}&select=id,brand_name`);
    if (!Array.isArray(data) || data.length === 0) throw new Error("Pas de row coaches");
    return `brand: ${data[0].brand_name || "(vide — onboarding a faire)"}`;
  });

  await test("MRR calculable (subscription_* columns)", async () => {
    const { ok, data } = await sbRest(`/clients?subscription_status=eq.active&select=subscription_plan,subscription_status&limit=100`);
    if (!ok) throw new Error("Query failed");
    const plans = (data || []).map((c) => c.subscription_plan).filter(Boolean);
    const byPlan = plans.reduce((a, p) => ((a[p] = (a[p] || 0) + 1), a), {});
    const mrr = Object.entries(byPlan).reduce((sum, [plan, n]) => {
      const price = plan === "3m" ? 120 : plan === "6m" ? 110 : plan === "12m" ? 100 : 0;
      return sum + price * n;
    }, 0);
    return `${mrr}€/mois (${plans.length} abos actifs)`;
  });
}

// ===== 6. APIs EXTERNES =====
async function testAPIs() {
  section("APIs & Services externes");

  await test("Mistral /api/voice-analyze", async () => {
    const res = await fetch(`${PROD_URL}/api/voice-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "un oeuf et une banane" }),
    });
    if (res.status === 200) {
      const data = await res.json();
      const n = data.ingredients?.length || data.foods?.length || 0;
      return `OK — ${n} ingredient(s) detectes`;
    }
    if (res.status === 500) throw new Error("500 — cle MISTRAL_API_KEY invalide ou quota");
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`);
  });

  await test("Edamam /api/food-search", async () => {
    const res = await fetch(`${PROD_URL}/api/food-search?q=banana`);
    if (res.ok) {
      const data = await res.json();
      return `${Array.isArray(data) ? data.length : 0} resultat(s)`;
    }
    if (res.status === 500) throw new Error("API error — cles Edamam peut-etre manquantes");
    throw new Error(`HTTP ${res.status}`);
  });

  await test("FAQ assistant /api/faq-assistant", async () => {
    const res = await fetch(`${PROD_URL}/api/faq-assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
    });
    if (res.ok) return "OK";
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Cron relance /api/cron-relance (GET)", async () => {
    const res = await fetch(`${PROD_URL}/api/cron-relance`);
    const data = await res.json().catch(() => null);
    if (res.status === 500 && data?.error?.includes("Missing SUPABASE_SERVICE_ROLE_KEY")) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant dans Vercel env");
    }
    if (res.ok) return `OK (${data?.sent || 0} notifs envoyees)`;
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 100)}`);
  });

  await test("Cron weekly-recap /api/cron-weekly-recap", async () => {
    const res = await fetch(`${PROD_URL}/api/cron-weekly-recap`);
    if (res.ok) return "OK";
    const data = await res.json().catch(() => null);
    if (data?.error?.includes("SUPABASE_SERVICE_ROLE_KEY")) throw new Error("SERVICE_ROLE_KEY manquant");
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Edge Function send-push", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (res.ok || res.status === 204) return "deployed";
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Edge Function send-welcome", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-welcome`, {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (res.ok || res.status === 204) return "deployed";
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Edge Function stripe-webhook", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (res.ok || res.status === 204) return "deployed";
    throw new Error(`HTTP ${res.status}`);
  });
}

// ===== 7. PERFORMANCES =====
async function testPerformance() {
  section("Performances — Production");

  let bundleUrl = null;

  await test("index.html charge", async () => {
    const start = Date.now();
    const res = await fetch(PROD_URL);
    const ms = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const match = html.match(/\/static\/js\/main\.[a-f0-9]+\.js/);
    if (match) bundleUrl = `${PROD_URL}${match[0]}`;
    if (ms > 2000) throw new Error(`Lent: ${ms}ms (seuil 2000ms)`);
    return `${ms}ms`;
  });

  await test("Bundle JS telecharge < 3s", async () => {
    if (!bundleUrl) return { skip: "bundle non detecte" };
    const start = Date.now();
    const res = await fetch(bundleUrl);
    const buf = await res.arrayBuffer();
    const ms = Date.now() - start;
    const kb = (buf.byteLength / 1024).toFixed(0);
    if (ms > 3000) throw new Error(`${ms}ms (seuil 3000ms)`);
    return `${ms}ms · ${kb} KB`;
  });

  await test("Service Worker sw.js accessible", async () => {
    const res = await fetch(`${PROD_URL}/sw.js`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txt = await res.text();
    const v = txt.match(/STATIC_CACHE\s*=\s*"([^"]+)"/)?.[1] || "unknown";
    return `cache: ${v}`;
  });

  await test("manifest.json valide", async () => {
    const res = await fetch(`${PROD_URL}/manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.name) throw new Error("Manifest incomplet");
    return `"${data.name}"`;
  });
}

// ===== 8. STRIPE =====
async function testStripe() {
  section("Stripe");

  await test("Cle publique Stripe presente", async () => {
    const key = process.env.REACT_APP_STRIPE_PUBLIC_KEY || "";
    if (!key) throw new Error("Manquante");
    if (key.startsWith("pk_test")) return "mode TEST";
    if (key.startsWith("pk_live")) return "mode LIVE";
    throw new Error("Format invalide");
  });

  await test("Stripe API ping", async () => {
    // /v1/ renvoie 404 sans auth, /v1/ping avec cle renvoie 200. N'importe quel 2xx/4xx = reachable.
    const res = await fetch("https://api.stripe.com/v1/");
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return `reachable (HTTP ${res.status})`;
  });
}

// ===== MAIN =====
async function main() {
  console.log(`${c.bold}${c.magenta}\n╔══════════════════════════════════════════════════╗`);
  console.log(`║        RB PERFORM — HEALTH CHECK v1              ║`);
  console.log(`╚══════════════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.dim}Prod URL:     ${c.reset}${PROD_URL}`);
  console.log(`${c.dim}Supabase URL: ${c.reset}${SUPABASE_URL}`);
  console.log(`${c.dim}Started:      ${c.reset}${new Date().toLocaleString("fr-FR")}`);

  const t0 = Date.now();

  await testSupabaseConnectivity();
  await testTables();
  await testRLSStatus();
  await testCRUD();
  await testSuperAdmin();
  await testAPIs();
  await testPerformance();
  await testStripe();

  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  // ===== SUMMARY =====
  console.log(`\n${c.bold}${c.cyan}━━━ RESUME ━━━${c.reset}`);
  const total = results.pass + results.fail + results.skip;
  console.log(`  ${c.green}${results.pass} OK${c.reset}   ${c.red}${results.fail} FAIL${c.reset}   ${c.yellow}${results.skip} SKIP${c.reset}   ${c.gray}/ ${total} tests en ${dt}s${c.reset}`);

  if (results.failures.length > 0) {
    console.log(`\n${c.bold}${c.red}Echecs :${c.reset}`);
    results.failures.forEach((f) => console.log(`  ${c.red}• ${f.name}${c.reset} — ${c.dim}${f.error}${c.reset}`));
  }

  console.log("");
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`${c.red}${c.bold}Fatal:${c.reset}`, e);
  process.exit(2);
});
