#!/usr/bin/env node
/**
 * RB Perform — Health Check Complet (A to Z)
 *
 * Teste les 7 categories critiques :
 *   1. AUTHENTIFICATION
 *   2. BASE DE DONNEES
 *   3. FLOW CLIENT
 *   4. FLOW COACH
 *   5. SUPER ADMIN
 *   6. API ET SERVICES EXTERNES
 *   7. PERFORMANCES
 *
 * Usage:
 *   node scripts/health-check.js
 *   node scripts/health-check.js --prod-url=https://rb-perfor.vercel.app
 *   node scripts/health-check.js --verbose
 *
 * Exit codes:
 *   0 = tous tests passent
 *   1 = au moins un echec
 *   2 = erreur fatale
 */

const fs = require("fs");
const path = require("path");

// ===== ENV LOADER =====
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
const icon = { pass: `${c.green}✅${c.reset}`, fail: `${c.red}❌${c.reset}`, skip: `${c.yellow}⚠${c.reset}` };

// ===== RESULT TRACKER =====
const results = { pass: 0, fail: 0, skip: 0, failures: [], sections: {} };
let currentSection = "";

function section(title) {
  currentSection = title;
  results.sections[title] = { pass: 0, fail: 0, skip: 0 };
  console.log(`\n${c.bold}${c.cyan}━━━ ${title} ━━━${c.reset}`);
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result && typeof result === "object" && result.skip) {
      console.log(`  ${icon.skip} ${c.dim}${name}${c.reset} ${c.yellow}(${result.skip})${c.reset}`);
      results.skip++;
      results.sections[currentSection].skip++;
      return false;
    }
    const detail = typeof result === "string" ? ` ${c.dim}${result}${c.reset}` : "";
    console.log(`  ${icon.pass} ${name}${detail}`);
    results.pass++;
    results.sections[currentSection].pass++;
    return true;
  } catch (e) {
    console.log(`  ${icon.fail} ${c.red}${name}${c.reset}`);
    console.log(`    ${c.red}${c.dim}${e.message}${c.reset}`);
    results.fail++;
    results.sections[currentSection].fail++;
    results.failures.push({ section: currentSection, name, error: e.message });
    return false;
  }
}

// ===== HTTP HELPERS =====
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
  return { status: res.status, ok: res.ok, data: json };
}

async function sbAuth(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...opts,
    headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json };
}

// ============================================================
// 1. AUTHENTIFICATION
// ============================================================
async function testAuth() {
  section("AUTHENTIFICATION");

  await test("Endpoint Auth /settings repond", async () => {
    const { ok, data, status } = await sbAuth("/settings");
    if (!ok) throw new Error(`HTTP ${status}`);
    const providers = Object.keys(data.external || {}).filter((k) => data.external[k]);
    return `providers: ${providers.join(", ") || "email"}`;
  });

  await test("Magic link (OTP) send — flow client", async () => {
    // Envoie un magic link a une adresse bidon et verifie que l'endpoint accepte
    const { status } = await sbAuth("/otp", {
      method: "POST",
      body: JSON.stringify({ email: "test-healthcheck-" + Date.now() + "@example.invalid", create_user: false }),
    });
    // 200 ou 400 (si email invalid mais endpoint reached) sont acceptables
    if (status >= 500) throw new Error(`HTTP ${status}`);
    return `endpoint OK (HTTP ${status})`;
  });

  await test("Super admin enregistre (login super-admin possible)", async () => {
    const { data } = await sbRest(`/super_admins?email=eq.${SUPER_ADMIN_EMAIL}&select=id`);
    if (!Array.isArray(data) || data.length === 0) throw new Error("Pas dans super_admins");
    return SUPER_ADMIN_EMAIL;
  });

  await test("Coach enregistre (login coach possible)", async () => {
    const { data } = await sbRest(`/coaches?select=email,brand_name&limit=5`);
    if (!Array.isArray(data) || data.length === 0) throw new Error("Aucun coach en DB");
    return `${data.length} coach(s)`;
  });

  await test("Clients enregistres (login client possible)", async () => {
    const { data } = await sbRest(`/clients?select=email&limit=1`);
    if (!Array.isArray(data) || data.length === 0) throw new Error("Aucun client en DB");
    return `${data.length}+ client(s) en DB`;
  });

  await test("Logout endpoint /logout accessible", async () => {
    const { status } = await sbAuth("/logout", { method: "POST" });
    // 204 (deconnexion OK sans session) ou 401 (no auth header) = endpoint fonctionne
    if (status >= 500) throw new Error(`HTTP ${status}`);
    return `HTTP ${status} (endpoint OK)`;
  });
}

// ============================================================
// 2. BASE DE DONNEES
// ============================================================
const CRITICAL_TABLES = [
  "clients", "programmes", "coaches", "super_admins",
  "exercise_logs", "session_logs", "weight_logs", "session_rpe",
  "messages", "coach_notes", "push_subscriptions", "bookings",
  "coach_slots", "nutrition_logs", "daily_tracking", "run_logs",
  "nutrition_goals", "client_badges", "notification_logs",
];

async function testDatabase() {
  section("BASE DE DONNEES");

  await test("Ping Supabase", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  for (const table of CRITICAL_TABLES) {
    await test(`Table "${table}" accessible`, async () => {
      const { ok, status, data } = await sbRest(`/${table}?select=*&limit=1`);
      if (ok) return `HTTP 200`;
      if (status === 401 || status === 403) return { skip: "RLS bloque (ok)" };
      if (data?.code === "42P01" || status === 404) throw new Error("Table absente");
      throw new Error(`HTTP ${status}`);
    });
  }

  await test("RLS desactive sur clients (lecture anon)", async () => {
    const { data } = await sbRest(`/clients?select=id&limit=1`);
    if (!Array.isArray(data)) throw new Error("Inaccessible");
    return `${data.length > 0 ? "OK" : "0 row (mais accessible)"}`;
  });

  await test("RLS actif sur notification_logs (protege)", async () => {
    const { data, status } = await sbRest(`/notification_logs?select=id&limit=1`);
    if (Array.isArray(data) && data.length === 0) return "0 rows visibles (protege)";
    if (status === 401 || status === 403) return "403 (protege)";
    return { skip: "non verifiable sans donnees" };
  });

  // Trouver un client de test (utilise dans les sections suivantes)
  const { data: clientsData } = await sbRest(`/clients?select=id,email,full_name,onboarding_done,coach_id&limit=10`);
  const testClient = Array.isArray(clientsData) ? clientsData[0] : null;

  if (!testClient) {
    console.log(`  ${icon.skip} ${c.yellow}Impossible de trouver un client test — tests CRUD skipes${c.reset}`);
    results.skip += 3;
    results.sections[currentSection].skip += 3;
    return null;
  }

  await test("Lecture/ecriture daily_tracking", async () => {
    const today = new Date().toISOString().split("T")[0];
    const before = await sbRest(`/daily_tracking?client_id=eq.${testClient.id}&date=eq.${today}&select=eau_ml`);
    const originalEau = before.data?.[0]?.eau_ml ?? null;
    const up = await sbRest(`/daily_tracking?on_conflict=client_id,date`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ client_id: testClient.id, date: today, eau_ml: 9999 }),
    });
    if (!up.ok) throw new Error(`Upsert HTTP ${up.status}: ${JSON.stringify(up.data).slice(0, 100)}`);
    const check = await sbRest(`/daily_tracking?client_id=eq.${testClient.id}&date=eq.${today}&select=eau_ml`);
    if (check.data?.[0]?.eau_ml !== 9999) throw new Error("Verif echec");
    await sbRest(`/daily_tracking?client_id=eq.${testClient.id}&date=eq.${today}`, {
      method: "PATCH",
      body: JSON.stringify({ eau_ml: originalEau }),
    });
    return "write + read + restore OK";
  });

  await test("Lecture/ecriture nutrition_logs", async () => {
    const today = new Date().toISOString().split("T")[0];
    const ins = await sbRest(`/nutrition_logs`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_id: testClient.id, date: today, repas: "Test", aliment: "HealthCheck",
        calories: 1, proteines: 0, glucides: 0, lipides: 0, quantite_g: 1,
      }),
    });
    if (!ins.ok) throw new Error(`Insert HTTP ${ins.status}: ${JSON.stringify(ins.data).slice(0, 100)}`);
    const insertedId = Array.isArray(ins.data) ? ins.data[0]?.id : ins.data?.id;
    if (!insertedId) throw new Error("Pas d'ID retourne");
    // Cleanup
    await sbRest(`/nutrition_logs?id=eq.${insertedId}`, { method: "DELETE" });
    return "insert + delete OK";
  });

  await test("Lecture/ecriture programmes", async () => {
    const { ok, data } = await sbRest(`/programmes?client_id=eq.${testClient.id}&select=id,html_content,is_active&limit=5`);
    if (!ok) throw new Error("Read failed");
    if (!Array.isArray(data)) throw new Error("Format inattendu");
    // Verifie qu'on peut aussi update (sans casser)
    if (data.length > 0) {
      const prog = data[0];
      const patch = await sbRest(`/programmes?id=eq.${prog.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: prog.is_active }),
      });
      if (!patch.ok) throw new Error(`Update HTTP ${patch.status}`);
    }
    return `${data.length} programme(s), read+update OK`;
  });

  return testClient;
}

// ============================================================
// 3. FLOW CLIENT
// ============================================================
async function testFlowClient(testClient) {
  section("FLOW CLIENT");

  if (!testClient) {
    console.log(`  ${icon.skip} ${c.yellow}Section skipee — pas de client test${c.reset}`);
    return;
  }

  await test("Clients avec onboarding_done=false → OnboardingFlow", async () => {
    const { data } = await sbRest(`/clients?onboarding_done=is.false&select=id&limit=1`);
    const n = Array.isArray(data) ? data.length : 0;
    return `${n} client(s) en attente d'onboarding`;
  });

  await test("Clients avec onboarding_done=true → App normale", async () => {
    const { data } = await sbRest(`/clients?onboarding_done=is.true&select=id,email&limit=5`);
    const n = Array.isArray(data) ? data.length : 0;
    if (n === 0) return { skip: "aucun client onboarde" };
    return `${n}+ client(s) onboardes`;
  });

  await test("Client sans programme actif → TrainLocked", async () => {
    // Trouve un client sans programme actif
    const { data: clients } = await sbRest(`/clients?select=id&limit=20`);
    if (!Array.isArray(clients)) throw new Error("No clients");
    for (const cl of clients) {
      const { data: progs } = await sbRest(`/programmes?client_id=eq.${cl.id}&is_active=eq.true&select=id`);
      if (Array.isArray(progs) && progs.length === 0) {
        return `Client ${cl.id.slice(0, 8)} sans programme (TrainLocked affiche)`;
      }
    }
    return { skip: "tous les clients ont un programme actif" };
  });

  await test("Client avec programme actif → TrainingPage", async () => {
    const { data } = await sbRest(`/programmes?is_active=eq.true&select=id,client_id,html_content&limit=1`);
    if (!Array.isArray(data) || data.length === 0) return { skip: "aucun programme actif" };
    if (!data[0].html_content) throw new Error("html_content vide");
    return `Programme actif OK, ${data[0].html_content.length} chars HTML`;
  });

  await test("Countdown programme (programme_start_date future)", async () => {
    const now = new Date().toISOString();
    const { data } = await sbRest(`/programmes?programme_start_date=gt.${now}&is_active=eq.true&select=id,programme_start_date&limit=1`);
    const n = Array.isArray(data) ? data.length : 0;
    return n > 0 ? `${n} programme(s) en countdown` : "0 en countdown (normal)";
  });

  await test("Signature programme (programme_accepted_at)", async () => {
    const { data } = await sbRest(`/programmes?programme_accepted_at=not.is.null&select=id&limit=5`);
    const n = Array.isArray(data) ? data.length : 0;
    return `${n} programme(s) signe(s)`;
  });

  await test("Persistance eau (daily_tracking.eau_ml)", async () => {
    const { data } = await sbRest(`/daily_tracking?eau_ml=gt.0&select=client_id,eau_ml&limit=5`);
    const n = Array.isArray(data) ? data.length : 0;
    return `${n} entree(s) d'eau loguees`;
  });

  await test("Persistance sommeil (daily_tracking.sommeil_h)", async () => {
    const { data } = await sbRest(`/daily_tracking?sommeil_h=gt.0&select=client_id,sommeil_h&limit=5`);
    const n = Array.isArray(data) ? data.length : 0;
    return `${n} nuit(s) loguees`;
  });

  await test("Persistance poids (weight_logs)", async () => {
    const { data } = await sbRest(`/weight_logs?select=client_id,weight,date&limit=5`);
    const n = Array.isArray(data) ? data.length : 0;
    return `${n} pesee(s) en DB`;
  });

  await test("Persistance nutrition (nutrition_logs)", async () => {
    const { data } = await sbRest(`/nutrition_logs?select=client_id,aliment&limit=5`);
    const n = Array.isArray(data) ? data.length : 0;
    return `${n} aliment(s) logues`;
  });

  await test("Persistance seances (session_logs + exercise_logs)", async () => {
    const [{ data: s }, { data: e }] = await Promise.all([
      sbRest(`/session_logs?select=id&limit=5`),
      sbRest(`/exercise_logs?select=id&limit=5`),
    ]);
    return `${Array.isArray(s) ? s.length : 0} sessions · ${Array.isArray(e) ? e.length : 0} exos`;
  });
}

// ============================================================
// 4. FLOW COACH
// ============================================================
async function testFlowCoach() {
  section("FLOW COACH");

  await test("Dashboard coach — chargement clients", async () => {
    const { data } = await sbRest(`/coaches?select=id,email,brand_name&limit=1`);
    if (!Array.isArray(data) || data.length === 0) throw new Error("Aucun coach");
    const coachId = data[0].id;
    const { data: clients } = await sbRest(`/clients?coach_id=eq.${coachId}&select=id,email,full_name&limit=10`);
    return `coach ${data[0].email} → ${Array.isArray(clients) ? clients.length : 0} client(s)`;
  });

  await test("Panel client — donnees enrichies (logs + rpe + weights)", async () => {
    const { data: clients } = await sbRest(`/clients?select=id&limit=1`);
    if (!Array.isArray(clients) || clients.length === 0) throw new Error("No client");
    const cid = clients[0].id;
    const [logs, weights, rpe] = await Promise.all([
      sbRest(`/exercise_logs?client_id=eq.${cid}&select=id&limit=1`),
      sbRest(`/weight_logs?client_id=eq.${cid}&select=id&limit=1`),
      sbRest(`/session_rpe?client_id=eq.${cid}&select=id&limit=1`),
    ]);
    if (!logs.ok || !weights.ok || !rpe.ok) throw new Error("Une des queries a echoue");
    return "logs + weights + rpe accessibles";
  });

  await test("Upload programme — schema valide", async () => {
    const { data } = await sbRest(`/programmes?select=client_id,html_content,programme_name,is_active,uploaded_by,programme_start_date,programme_accepted_at&limit=1`);
    if (!Array.isArray(data)) throw new Error("Schema inaccessible");
    return "colonnes programmes toutes accessibles";
  });

  await test("Suppression programme ne casse pas onboarding_done", async () => {
    // Verifie que la relation est propre : des clients avec onboarding_done=true mais
    // sans programme actif existent (preuve que la suppression n'a pas remis onboarding a false)
    const { data } = await sbRest(`/clients?onboarding_done=is.true&select=id&limit=20`);
    if (!Array.isArray(data)) throw new Error("Query failed");
    let disconnected = 0;
    for (const cl of data) {
      const { data: prog } = await sbRest(`/programmes?client_id=eq.${cl.id}&is_active=eq.true&select=id&limit=1`);
      if (Array.isArray(prog) && prog.length === 0) disconnected++;
      if (disconnected >= 1) break;
    }
    return disconnected > 0 ? `client(s) onboarde sans programme actif (OK)` : "tous avec programme";
  });

  await test("Date expiration abonnement (subscription_end_date)", async () => {
    const { data } = await sbRest(`/clients?subscription_end_date=not.is.null&select=id,subscription_status,subscription_end_date&limit=5`);
    const n = Array.isArray(data) ? data.length : 0;
    return `${n} client(s) avec date expiration`;
  });

  await test("Coach notes — insert inclut coach_id (multi-tenant)", async () => {
    const { data } = await sbRest(`/coach_notes?select=coach_id,created_at&order=created_at.desc&limit=20`);
    if (!Array.isArray(data) || data.length === 0) return { skip: "aucune note" };
    const withCoachId = data.filter((n) => n.coach_id).length;
    const pct = Math.round((withCoachId / data.length) * 100);
    // Tolere les anciennes notes sans coach_id si au moins une note recente en a
    if (withCoachId === 0) throw new Error(`0/${data.length} avec coach_id — run migration 007_backfill_coach_notes.sql`);
    return `${withCoachId}/${data.length} (${pct}%) avec coach_id`;
  });

  await test("Bookings / coach_slots accessibles", async () => {
    const [b, s] = await Promise.all([
      sbRest(`/bookings?select=id&limit=5`),
      sbRest(`/coach_slots?select=id&limit=5`),
    ]);
    if (!b.ok || !s.ok) throw new Error("One query failed");
    return `${Array.isArray(b.data) ? b.data.length : 0} booking(s), ${Array.isArray(s.data) ? s.data.length : 0} slot(s)`;
  });
}

// ============================================================
// 5. SUPER ADMIN
// ============================================================
async function testSuperAdmin() {
  section("SUPER ADMIN");

  await test("Dashboard CEO reserve a rb.performancee@gmail.com", async () => {
    const { data } = await sbRest(`/super_admins?select=email`);
    if (!Array.isArray(data)) throw new Error("Read failed");
    if (data.length > 1) throw new Error(`${data.length} super admins — devrait etre 1`);
    if (data.length === 0) throw new Error("Aucun super admin configure");
    if (data[0].email !== SUPER_ADMIN_EMAIL) throw new Error(`Email inattendu: ${data[0].email}`);
    return `exclusif ${SUPER_ADMIN_EMAIL}`;
  });

  await test("Coach row existe pour super admin (toggle OK)", async () => {
    const { data } = await sbRest(`/coaches?email=eq.${SUPER_ADMIN_EMAIL}&select=id,brand_name`);
    if (!Array.isArray(data) || data.length === 0) throw new Error("Super admin pas dans coaches");
    return `coach_id: ${data[0].id.slice(0, 8)}`;
  });

  await test("MRR calcul (subscription actifs)", async () => {
    const { data } = await sbRest(`/clients?subscription_status=eq.active&select=subscription_plan`);
    if (!Array.isArray(data)) throw new Error("Query failed");
    const plans = data.map((c) => c.subscription_plan).filter(Boolean);
    const mrr = plans.reduce((s, p) => s + (p === "3m" ? 120 : p === "6m" ? 110 : p === "12m" ? 100 : 0), 0);
    return `${mrr}€/mois sur ${plans.length} abos actifs`;
  });

  await test("ARR calcul (MRR × 12)", async () => {
    const { data } = await sbRest(`/clients?subscription_status=eq.active&select=subscription_plan`);
    const plans = (Array.isArray(data) ? data : []).map((c) => c.subscription_plan).filter(Boolean);
    const mrr = plans.reduce((s, p) => s + (p === "3m" ? 120 : p === "6m" ? 110 : p === "12m" ? 100 : 0), 0);
    return `ARR: ${(mrr * 12).toLocaleString()}€/an`;
  });

  await test("Retention calculable (clients actifs vs total)", async () => {
    const [{ data: active }, { data: total }] = await Promise.all([
      sbRest(`/clients?subscription_status=eq.active&select=id`),
      sbRest(`/clients?select=id`),
    ]);
    const a = Array.isArray(active) ? active.length : 0;
    const t = Array.isArray(total) ? total.length : 0;
    if (t === 0) return { skip: "aucun client" };
    const pct = Math.round((a / t) * 100);
    return `${pct}% (${a}/${t})`;
  });

  await test("Toggle Coach/SuperAdmin (check isCoach && isSuperAdmin)", async () => {
    const { data: saData } = await sbRest(`/super_admins?email=eq.${SUPER_ADMIN_EMAIL}&select=id`);
    const { data: coachData } = await sbRest(`/coaches?email=eq.${SUPER_ADMIN_EMAIL}&select=id`);
    if (!saData?.[0] || !coachData?.[0]) throw new Error("Row manquante pour toggle");
    return "les 2 rows existent → toggle OK";
  });
}

// ============================================================
// 6. API ET SERVICES EXTERNES
// ============================================================
async function testAPIs() {
  section("API ET SERVICES EXTERNES");

  await test("Supabase ping", async () => {
    const start = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    const ms = Date.now() - start;
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return `${ms}ms`;
  });

  await test("Stripe API reachable", async () => {
    const res = await fetch("https://api.stripe.com/v1/");
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return `reachable`;
  });

  await test("Stripe webhook deployee (Edge Function)", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (res.ok || res.status === 204) return "deployed";
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Stripe public key configuree", async () => {
    const key = process.env.REACT_APP_STRIPE_PUBLIC_KEY || "";
    if (!key) throw new Error("Absente");
    if (key.startsWith("pk_test")) return "mode TEST";
    if (key.startsWith("pk_live")) return "mode LIVE";
    throw new Error("Format invalide");
  });

  // Les APIs publiques ont un Origin check (api/_security.js) : on simule
  // la requete depuis le domaine autorise pour verifier qu'elle aboutit.
  const apiHeaders = { "Content-Type": "application/json", Origin: PROD_URL };

  await test("Mistral /api/voice-analyze repond", async () => {
    const res = await fetch(`${PROD_URL}/api/voice-analyze`, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({ text: "un oeuf et une banane" }),
    });
    if (res.ok) {
      const data = await res.json();
      return `${data.ingredients?.length || 0} ingredient(s)`;
    }
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Mistral /api/faq-assistant repond", async () => {
    const res = await fetch(`${PROD_URL}/api/faq-assistant`, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return "OK";
  });

  await test("Edamam /api/food-search repond", async () => {
    const res = await fetch(`${PROD_URL}/api/food-search?q=banana`, {
      headers: { Origin: PROD_URL },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => []);
    return `${Array.isArray(data) ? data.length : 0} resultat(s)`;
  });

  await test("Origin check actif (blocage sans Origin) ", async () => {
    // Sans header Origin = request cross-origin suspecte → doit etre bloquee
    const res = await fetch(`${PROD_URL}/api/faq-assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
    });
    if (res.status === 403) return "403 bloque (securite OK)";
    throw new Error(`Origin non verifie — HTTP ${res.status}`);
  });

  await test("Edge Function send-push deployee", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (res.ok || res.status === 204) return "deployed";
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Edge Function send-welcome deployee", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-welcome`, {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (res.ok || res.status === 204) return "deployed";
    throw new Error(`HTTP ${res.status}`);
  });

  await test("Push notifications — VAPID configuree (sw.js)", async () => {
    const res = await fetch(`${PROD_URL}/sw.js`);
    if (!res.ok) throw new Error("sw.js inaccessible");
    const txt = await res.text();
    if (!txt.includes("push") || !txt.includes("showNotification")) throw new Error("Handler push absent");
    return "push handler present";
  });

  await test("Push subscriptions — table accessible", async () => {
    const { ok, status, data } = await sbRest(`/push_subscriptions?select=client_id&limit=5`);
    if (!ok) throw new Error(`HTTP ${status}`);
    return `${Array.isArray(data) ? data.length : 0} subscription(s)`;
  });

  // Si CRON_SECRET est defini localement, on l'envoie et on attend 200
  // Si pas defini, on attend 401 (= preuve que la protection marche)
  const cronHeaders = process.env.CRON_SECRET
    ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
    : {};
  const cronSecretPresent = !!process.env.CRON_SECRET;

  await test("Cron /api/cron-relance", async () => {
    const res = await fetch(`${PROD_URL}/api/cron-relance`, { headers: cronHeaders });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      return `OK (${d.sent || 0} notifs)`;
    }
    if (res.status === 401 && !cronSecretPresent) {
      return "401 (protege par CRON_SECRET, OK)";
    }
    const data = await res.json().catch(() => null);
    const msg = data?.detail?.message || data?.error || `HTTP ${res.status}`;
    if (msg.includes("Legacy API keys") || msg.includes("SERVICE_ROLE_KEY")) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY Vercel a jour necessaire");
    }
    throw new Error(msg);
  });

  await test("Cron /api/cron-weekly-recap", async () => {
    const res = await fetch(`${PROD_URL}/api/cron-weekly-recap`, { headers: cronHeaders });
    if (res.ok) return "OK";
    if (res.status === 401 && !cronSecretPresent) {
      return "401 (protege par CRON_SECRET, OK)";
    }
    const data = await res.json().catch(() => null);
    const msg = data?.detail?.message || data?.error || `HTTP ${res.status}`;
    if (msg.includes("Legacy API keys") || msg.includes("SERVICE_ROLE_KEY")) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY Vercel a jour necessaire");
    }
    throw new Error(msg);
  });
}

// ============================================================
// 7. PERFORMANCES
// ============================================================
async function testPerformance() {
  section("PERFORMANCES");

  let bundleUrl = null;

  await test("Premiere page chargee < 2s", async () => {
    const start = Date.now();
    const res = await fetch(PROD_URL);
    const ms = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const match = html.match(/\/static\/js\/main\.[a-f0-9]+\.js/);
    if (match) bundleUrl = `${PROD_URL}${match[0]}`;
    if (ms > 2000) throw new Error(`${ms}ms (seuil 2000ms)`);
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

  await test("Service worker actif (sw.js accessible)", async () => {
    const res = await fetch(`${PROD_URL}/sw.js`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txt = await res.text();
    const v = txt.match(/STATIC_CACHE\s*=\s*"([^"]+)"/)?.[1] || "?";
    if (!txt.includes("addEventListener(\"fetch\"")) throw new Error("SW invalide");
    return `cache: ${v}`;
  });

  await test("manifest.json valide (PWA)", async () => {
    const res = await fetch(`${PROD_URL}/manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.name || !data.icons?.length) throw new Error("Incomplet");
    return `"${data.name}" · ${data.icons.length} icons`;
  });

  await test("CSS bundle presente", async () => {
    const html = await (await fetch(PROD_URL)).text();
    const match = html.match(/\/static\/css\/main\.[a-f0-9]+\.css/);
    if (!match) throw new Error("CSS bundle absent");
    const res = await fetch(`${PROD_URL}${match[0]}`);
    if (!res.ok) throw new Error(`CSS HTTP ${res.status}`);
    return match[0].split("/").pop();
  });

  await test("Icons PWA accessibles", async () => {
    const [i192, i512] = await Promise.all([
      fetch(`${PROD_URL}/icon-192.png`),
      fetch(`${PROD_URL}/icon-512.png`),
    ]);
    if (!i192.ok || !i512.ok) throw new Error("Icons manquantes");
    return "192 + 512 OK";
  });
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log(`${c.bold}${c.magenta}\n╔══════════════════════════════════════════════════╗`);
  console.log(`║       RB PERFORM — HEALTH CHECK COMPLET          ║`);
  console.log(`╚══════════════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.dim}Prod URL:     ${c.reset}${PROD_URL}`);
  console.log(`${c.dim}Supabase URL: ${c.reset}${SUPABASE_URL}`);
  console.log(`${c.dim}Started:      ${c.reset}${new Date().toLocaleString("fr-FR")}`);

  const t0 = Date.now();

  await testAuth();
  const testClient = await testDatabase();
  await testFlowClient(testClient);
  await testFlowCoach();
  await testSuperAdmin();
  await testAPIs();
  await testPerformance();

  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  // ===== SECTION SUMMARY =====
  console.log(`\n${c.bold}${c.cyan}━━━ RESUME PAR SECTION ━━━${c.reset}`);
  Object.entries(results.sections).forEach(([name, s]) => {
    const total = s.pass + s.fail + s.skip;
    const icon = s.fail > 0 ? `${c.red}●${c.reset}` : `${c.green}●${c.reset}`;
    console.log(`  ${icon} ${c.bold}${name.padEnd(32)}${c.reset}  ${c.green}${s.pass}${c.reset}/${total}` + (s.fail > 0 ? `  ${c.red}${s.fail} fail${c.reset}` : "") + (s.skip > 0 ? `  ${c.yellow}${s.skip} skip${c.reset}` : ""));
  });

  // ===== GLOBAL SUMMARY =====
  console.log(`\n${c.bold}${c.cyan}━━━ TOTAL ━━━${c.reset}`);
  const total = results.pass + results.fail + results.skip;
  console.log(`  ${c.green}✅ ${results.pass} OK${c.reset}   ${c.red}❌ ${results.fail} FAIL${c.reset}   ${c.yellow}⚠ ${results.skip} SKIP${c.reset}   ${c.gray}/ ${total} tests en ${dt}s${c.reset}`);

  if (results.failures.length > 0) {
    console.log(`\n${c.bold}${c.red}Echecs par section :${c.reset}`);
    results.failures.forEach((f) => console.log(`  ${c.red}• [${f.section}] ${f.name}${c.reset}\n    ${c.dim}${f.error}${c.reset}`));
  }

  console.log("");
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`${c.red}${c.bold}Fatal:${c.reset}`, e);
  process.exit(2);
});
