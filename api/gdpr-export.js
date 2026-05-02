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

// Tables où on pull les données par coach_id (rôle coach).
// Inconnues / schéma drift / RLS deny → skipped sans erreur.
// Couverture exhaustive RGPD art. 20 : toutes les tables qui contiennent
// des données personnelles du coach OU qu'il a créées.
const COACH_SCOPED_TABLES = [
  "clients",                     // ses clients (data managed)
  "programmes",                  // programmes assignés
  "coach_programme_templates",   // templates persos
  "coach_notes",                 // notes privées sur clients
  "coach_plans",                 // plans tarifaires custom
  "coach_reminders",             // rappels CRM
  "coach_monthly_goals",         // objectifs mensuels
  "coach_testimonials",          // témoignages publics
  "coach_invitations",           // invitations envoyées
  "coach_messages_flash",        // messages flash
  "coach_activity_log",          // log activité
  "coach_badges",                // badges débloqués
  "coach_business_snapshots",    // snapshots biz quotidiens
  "coach_slots",                 // créneaux dispo
  "invoices",                    // factures émises
  "client_payments",             // paiements reçus loggés
  "sentinel_cards",              // feed IA business
  "notification_logs",           // logs notif (filtré via clients)
];

// Tables où on pull par client_id (rôle client).
const CLIENT_SCOPED_TABLES = [
  "programmes",                  // programmes assignés au client
  "weight_logs",                 // pesées
  "exercise_logs",               // logs exos
  "nutrition_logs",              // logs repas
  "nutrition_goals",             // macros cibles
  "run_logs",                    // logs course
  "daily_tracking",              // tracking quotidien
  "session_completions",         // séances complétées
  "session_live",                // séance vivante
  "session_logs",                // logs séances
  "session_rpe",                 // RPE par exo
  "weekly_checkins",             // check-ins hebdo
  "supplement_logs",             // logs compléments
  "client_supplements",          // compléments configurés
  "client_goals",                // objectifs personnels
  "client_badges",               // badges débloqués
  "transformation_sessions",     // sessions photos transfo
  "onboarding_forms",            // formulaire d'onboarding
  "programme_overrides",         // ajustements perso programme
  "messages",                    // messages avec coach
  "push_subscriptions",          // souscriptions push
  "notification_logs",           // logs notif reçues
  "activity_logs",               // logs activité app
  "client_payments",             // paiements faits au coach
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

    // 3. Détecter le rôle (coach OU client) — un user peut être l'un OU l'autre
    const [{ data: coach }, { data: client }] = await Promise.all([
      supabase.from("coaches").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("clients").select("*").or(`id.eq.${user.id},email.eq.${user.email}`).maybeSingle(),
    ]);

    if (!coach && !client) {
      return res.status(404).json({ error: "Profile not found (neither coach nor client)" });
    }

    // 4. Collecte exhaustive selon le rôle
    const collected = {};
    let role = null;
    let scopeKey = null; // "coach_id" ou "client_id"
    let scopeId = null;
    let tables = [];

    if (coach) {
      role = "coach";
      scopeKey = "coach_id";
      scopeId = user.id;
      tables = COACH_SCOPED_TABLES;
    } else {
      role = "client";
      scopeKey = "client_id";
      scopeId = client.id;
      tables = CLIENT_SCOPED_TABLES;
    }

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("*").eq(scopeKey, scopeId);
        if (!error) collected[table] = data || [];
        else console.log(`[GDPR_EXPORT] table=${table} skipped (${error.message})`);
      } catch (e) {
        console.log(`[GDPR_EXPORT] table=${table} threw (${e.message})`);
      }
    }

    // 5. Package + emit
    const blob = {
      exported_at: new Date().toISOString(),
      export_version: 2,
      article: "RGPD art. 20 — droit à la portabilité des données",
      subject: {
        user_id: user.id,
        email: user.email,
        role,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      profile: coach || client,
      scoped_data: collected,
      tables_exported: Object.keys(collected),
      notice:
        "Ce fichier contient l'ensemble des données personnelles que RB Perform détient " +
        "sur votre compte. Vous pouvez demander la suppression complète (art. 17 RGPD) " +
        `via Settings → Sécurité → Supprimer mon compte, ou écrire à ${RB_SUPPORT_EMAIL}.`,
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
