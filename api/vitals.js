/**
 * POST /api/vitals
 *
 * Self-hosted Real-User Monitoring collection. Frontend sends Web Vitals
 * (LCP, CLS, INP, FCP, TTFB) via navigator.sendBeacon on pagehide. This
 * endpoint validates the payload, logs it structured for aggregation, and
 * emits a Sentry measurement event.
 *
 * Body:
 *   { name, value, rating, delta, id, navigationType, url }
 *
 * No auth — these are anonymous performance metrics. Rate-limit to shield
 * from abuse.
 */

const { secureRequest } = require("./_security");
const { captureException } = require("./_sentry");

// Allowed metric names (from web-vitals spec)
const ALLOWED = new Set(["LCP", "CLS", "INP", "FCP", "TTFB", "FID"]);

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  // 120/h per IP — sendBeacon fires once per metric on pagehide, so a normal
  // session emits ~5 beacons. 120 covers burst + a few sessions.
  if (!secureRequest(req, res, { max: 120, windowMs: 3600000 })) return;

  try {
    const body = req.body || {};
    const { name, value, rating, id, navigationType, url } = body;

    if (!ALLOWED.has(name)) {
      return res.status(400).json({ error: "Unknown metric" });
    }
    if (typeof value !== "number" || !isFinite(value) || value < 0 || value > 600000) {
      return res.status(400).json({ error: "Invalid value" });
    }

    const safeUrl = typeof url === "string" ? url.slice(0, 500) : "";
    const safeRating = ["good", "needs-improvement", "poor"].includes(rating) ? rating : "unknown";

    // Structured log for Vercel log aggregation / Log Drain integrations
    console.log(
      `[VITALS] name=${name} value=${Math.round(value)} rating=${safeRating} ` +
        `nav=${navigationType || "unknown"} url=${safeUrl}`
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[VITALS_FAILED] reason="${err.message}"`);
    await captureException(err, { tags: { endpoint: "vitals" } });
    return res.status(500).json({ error: "failed" });
  }
};
