/**
 * POST /api/gdpr/export
 *
 * RGPD art. 20 — data portability. The authenticated coach requests a
 * complete export of their personal data as a single downloadable JSON
 * blob. Covers :
 *   - Coach profile (public.coaches)
 *   - Auth metadata (email, created_at, last_sign_in)
 *   - Clients they manage
 *   - Active programmes
 *   - Notification / payment / subscription history (if tables exist)
 *
 * Auth : Supabase JWT in `Authorization: Bearer <token>` header. A coach
 * can only export their own data — service-role key is used for the
 * actual queries but scoped to `user.id`.
 *
 * Output : JSON with a top-level `exported_at` and the coach's scope.
 */

const { getServiceClient } = require("./_supabase");
const { secureRequest } = require("./_security");
const { captureException } = require("./_sentry");
const { RB_SUPPORT_EMAIL } = require("./_branding");

// Tables where we pull data keyed by coach_id. Unknown tables are skipped
// without erroring — the export tolerates schema drift.
const COACH_SCOPED_TABLES = [
  "clients",
  "programmes",
  "notification_logs",
  "invoices",
  "coach_plans",
];

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  // Low ceiling — an export touches many tables, not something to spam.
  if (!secureRequest(req, res, { max: 5, windowMs: 3600000 })) return;

  try {
    // 1. Extract JWT
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing Authorization header" });

    const supabase = getServiceClient();

    // 2. Verify + resolve user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    // 3. Fetch coach profile
    const { data: coach, error: coachErr } = await supabase
      .from("coaches")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (coachErr) throw coachErr;
    if (!coach) return res.status(404).json({ error: "Coach profile not found" });

    // 4. Fetch coach-scoped data from each known table. Skip missing tables.
    const collected = {};
    for (const table of COACH_SCOPED_TABLES) {
      try {
        const { data, error } = await supabase.from(table).select("*").eq("coach_id", user.id);
        if (!error) collected[table] = data || [];
      } catch {
        // Table doesn't exist or column mismatch — tolerate, log for awareness
        console.log(`[GDPR_EXPORT] skipped table=${table} (not present or non-standard schema)`);
      }
    }

    // 5. Package + emit
    const blob = {
      exported_at: new Date().toISOString(),
      export_version: 1,
      article: "RGPD art. 20 — droit à la portabilité des données",
      subject: {
        user_id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      coach_profile: coach,
      scoped_data: collected,
      notice:
        "Ce fichier contient l'ensemble des données personnelles que RB Perform détient " +
        "sur votre compte coach. Pour une demande de rectification ou de suppression " +
        `(art. 16 + 17 RGPD), écrivez à ${RB_SUPPORT_EMAIL}.`,
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rbperform-export-${user.id}-${Date.now()}.json"`
    );
    return res.status(200).end(JSON.stringify(blob, null, 2));
  } catch (err) {
    console.error(`[GDPR_EXPORT_FAILED] reason="${err.message}"`);
    await captureException(err, { tags: { endpoint: "gdpr-export" } });
    return res.status(500).json({ error: "Export failed" });
  }
};
