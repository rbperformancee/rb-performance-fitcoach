/**
 * _sentinel-helpers.js — shared utilities for Sentinel cron jobs.
 *
 * Handles:
 * - Supabase service_role client (bypass RLS)
 * - Mistral API calls with retry + timeout
 * - Cost budget enforcement
 * - Logging to sentinel_mistral_logs
 * - Idempotent card insertion via dedupe_key
 * - CRON_SECRET auth check
 */

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const DAILY_BUDGET = parseFloat(process.env.MISTRAL_DAILY_BUDGET_USD || "50");

// Sentinel-eligible plans
const SENTINEL_PLANS = ["pro", "elite"];

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

// Supabase REST helper (service_role — bypasses RLS)
async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=minimal",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return null;
}

// Get all sentinel-eligible coaches
async function getSentinelCoaches() {
  // Founding coaches + Pro/Elite
  const data = await sb(
    `/rest/v1/coaches?select=id,full_name,email,plan,is_founding,features,subscription_plan&or=(is_founding.eq.true,subscription_plan.in.(${SENTINEL_PLANS.join(",")}))`,
    { headers: { Prefer: "return=representation" } }
  );
  return Array.isArray(data) ? data : [];
}

// Check daily Mistral cost budget
async function getDailyCostSoFar() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const data = await sb(
    `/rest/v1/sentinel_mistral_logs?select=cost_usd&created_at=gte.${since.toISOString()}&status=eq.success`,
    { headers: { Prefer: "return=representation" } }
  );
  if (!Array.isArray(data)) return 0;
  return data.reduce((sum, r) => sum + (parseFloat(r.cost_usd) || 0), 0);
}

async function isBudgetExceeded() {
  const spent = await getDailyCostSoFar();
  return { exceeded: spent >= DAILY_BUDGET, spent, budget: DAILY_BUDGET };
}

// Call Mistral with retry + timeout
// Returns { content, promptTokens, completionTokens } or throws
async function callMistral(systemPrompt, userPrompt, { maxRetries = 2, timeoutMs = 30000 } = {}) {
  if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY missing");

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 3s
      await new Promise((r) => setTimeout(r, attempt === 1 ? 1000 : 3000));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Mistral ${res.status}: ${text}`);
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      if (!choice?.message?.content) throw new Error("Empty Mistral response");

      return {
        content: choice.message.content,
        promptTokens: json.usage?.prompt_tokens || 0,
        completionTokens: json.usage?.completion_tokens || 0,
      };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (err.name === "AbortError") lastError = new Error("Mistral timeout");
      // Don't retry on 4xx (bad request, auth error)
      if (err.message?.includes("Mistral 4")) throw lastError;
    }
  }
  throw lastError;
}

// Mistral cost estimate
const COST_PER_1K_INPUT = 0.002;
const COST_PER_1K_OUTPUT = 0.006;

function estimateCost(promptTokens, completionTokens) {
  return (promptTokens / 1000) * COST_PER_1K_INPUT + (completionTokens / 1000) * COST_PER_1K_OUTPUT;
}

// Log a Mistral call to sentinel_mistral_logs
async function logMistralCall({ coachId, module, promptTokens, completionTokens, costUsd, status, errorMessage }) {
  try {
    await sb("/rest/v1/sentinel_mistral_logs", {
      method: "POST",
      body: JSON.stringify({
        coach_id: coachId,
        module,
        prompt_tokens: promptTokens || 0,
        completion_tokens: completionTokens || 0,
        cost_usd: costUsd || 0,
        status,
        error_message: errorMessage || null,
      }),
    });
  } catch (e) {
    console.error("[sentinel] log error:", e.message);
  }
}

// Insert a sentinel card (idempotent via dedupe_key)
async function insertCard({ coachId, module, priority, title, body, data, ctaLabel, ctaAction, expiresAt, dedupeKey }) {
  try {
    await sb("/rest/v1/sentinel_cards", {
      method: "POST",
      headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify({
        coach_id: coachId,
        module,
        priority: priority || 50,
        title,
        body,
        data: data || {},
        cta_label: ctaLabel || null,
        cta_action: ctaAction || null,
        status: "active",
        expires_at: expiresAt || null,
        dedupe_key: dedupeKey,
      }),
    });
    return true;
  } catch (e) {
    // Duplicate dedupe_key → already exists, skip
    if (e.message?.includes("409") || e.message?.includes("duplicate") || e.message?.includes("23505")) {
      return false; // idempotent skip
    }
    throw e;
  }
}

// Expire old cards (run at start of each cron)
async function expireOldCards() {
  try {
    await sb(
      `/rest/v1/sentinel_cards?status=eq.active&expires_at=lt.${new Date().toISOString()}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "expired" }),
      }
    );
  } catch (e) {
    console.error("[sentinel] expire error:", e.message);
  }
}

// Sanitize text inputs for Mistral prompts
const INJECTION_PATTERNS = [
  /#{2,}/g,
  /<\/?prompt>/gi,
  /<\/?system>/gi,
  /<\/?user>/gi,
  /<\/?assistant>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,
];

function sanitize(text) {
  if (!text || typeof text !== "string") return "";
  let clean = text.slice(0, 500);
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, "");
  }
  return clean.trim();
}

// Anonymize client for Mistral prompt
function anonymizeClient(client) {
  const initials = (client.full_name || "??").split(" ").map((s) => (s[0] || "").toUpperCase()).join("").slice(0, 2) || "XX";
  const shortId = (client.id || "").slice(0, 4);
  return `${initials}-${shortId}`;
}

// Date helpers
function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

module.exports = {
  isAuthorizedCron,
  sb,
  getSentinelCoaches,
  isBudgetExceeded,
  callMistral,
  estimateCost,
  logMistralCall,
  insertCard,
  expireOldCards,
  sanitize,
  anonymizeClient,
  todayKey,
  weekKey,
  SENTINEL_PLANS,
};
