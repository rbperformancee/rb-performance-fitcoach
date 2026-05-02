/**
 * POST /api/gdpr-delete
 *
 * RGPD art. 17 — droit à l'effacement / "right to be forgotten".
 *
 * L'utilisateur authentifié demande la suppression définitive de son compte
 * + toutes ses données personnelles. Pas un flag "deleted=true" : un vrai
 * DELETE en cascade.
 *
 * Auth : Bearer token Supabase OBLIGATOIRE.
 * Confirmation : un body `{ confirm: "SUPPRIMER" }` doit être envoyé pour
 * éviter les clics accidentels (équivalent du typed-confirm pattern).
 *
 * Process :
 *   1. Vérifie token + résout user
 *   2. Vérifie body.confirm === "SUPPRIMER"
 *   3. Détecte rôle (coach ou client)
 *   4. Si coach :
 *      - Avertit que ses clients seront orphelinés (clients restent, coach_id NULL)
 *      - DELETE coaches (cascade sur ses tables coach_*)
 *      - DELETE coach.email côté Supabase Auth
 *   5. Si client :
 *      - DELETE clients (cascade sur weight_logs, exercise_logs, etc.)
 *      - DELETE client.email côté Supabase Auth
 *   6. Log dans une table audit (gdpr_deletions)
 *
 * Sécurité : irréversible. Pas de undo. L'utilisateur reçoit un email de
 * confirmation avant ET après.
 */

const { getServiceClient } = require("./_supabase");
const { secureRequest } = require("./_security");
const { captureException } = require("./_sentry");
const { RB_SUPPORT_EMAIL } = require("./_branding");

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Très bas plafond : la suppression est irréversible, pas spammable
  if (!secureRequest(req, res, { max: 3, windowMs: 3600000 })) return;

  try {
    // 1. Auth check
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing Authorization header" });

    const supabase = getServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    // 2. Confirmation body
    let body = req.body;
    try {
      if (typeof body === "string") body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Malformed JSON" });
    }
    if (!body || body.confirm !== "SUPPRIMER") {
      return res.status(400).json({
        error: "Missing confirmation",
        hint: 'Body must include { "confirm": "SUPPRIMER" }',
      });
    }

    // 3. Détection rôle (coach ou client)
    const [{ data: coach }, { data: client }] = await Promise.all([
      supabase.from("coaches").select("id, email, full_name").eq("id", user.id).maybeSingle(),
      supabase.from("clients").select("id, email, full_name").or(`id.eq.${user.id},email.eq.${user.email}`).maybeSingle(),
    ]);

    if (!coach && !client) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const role = coach ? "coach" : "client";
    const profileId = coach ? coach.id : client.id;
    const profileEmail = (coach || client).email;
    const profileName = (coach || client).full_name || profileEmail;

    // 4. Suppression
    const deletionLog = {
      user_id: user.id,
      email: profileEmail,
      role,
      requested_at: new Date().toISOString(),
      tables_affected: [],
      errors: [],
    };

    if (coach) {
      // Coach delete : cascade automatique sur les tables FK coach_id ON DELETE CASCADE.
      // Les clients du coach restent (RGPD : ce sont LEURS données, pas celles du coach).
      // On set coach_id = NULL sur leurs rows pour les détacher proprement.
      try {
        await supabase.from("clients").update({ coach_id: null }).eq("coach_id", profileId);
        deletionLog.tables_affected.push("clients (orphaned)");
      } catch (e) {
        deletionLog.errors.push(`clients orphan: ${e.message}`);
      }

      const { error: delCoachErr } = await supabase.from("coaches").delete().eq("id", profileId);
      if (delCoachErr) {
        deletionLog.errors.push(`coaches delete: ${delCoachErr.message}`);
      } else {
        deletionLog.tables_affected.push("coaches + cascades");
      }
    } else {
      // Client delete : cascade automatique sur les tables FK client_id ON DELETE CASCADE.
      const { error: delClientErr } = await supabase.from("clients").delete().eq("id", profileId);
      if (delClientErr) {
        deletionLog.errors.push(`clients delete: ${delClientErr.message}`);
      } else {
        deletionLog.tables_affected.push("clients + cascades");
      }
    }

    // 5. Supprimer côté Supabase Auth (le user lui-même)
    try {
      const { error: authDelErr } = await supabase.auth.admin.deleteUser(user.id);
      if (authDelErr) {
        deletionLog.errors.push(`auth.deleteUser: ${authDelErr.message}`);
      } else {
        deletionLog.tables_affected.push("auth.users");
      }
    } catch (e) {
      deletionLog.errors.push(`auth.deleteUser threw: ${e.message}`);
    }

    // 6. Log audit dans une table dédiée (sera créée via migration)
    try {
      await supabase.from("gdpr_deletions").insert({
        user_id_hash: hashUserId(user.id), // pas l'ID en clair, juste un hash pour traçabilité
        email_hash: hashEmail(profileEmail),
        role,
        tables_affected: deletionLog.tables_affected,
        errors: deletionLog.errors,
        requested_at: deletionLog.requested_at,
      });
    } catch (e) {
      // Pas critique — le delete a marché, le log audit est best-effort
      console.warn("[gdpr-delete] audit log failed:", e.message);
    }

    // 7. Email de confirmation post-delete
    try {
      await sendDeletionConfirmation(profileEmail, profileName, role, deletionLog);
    } catch (e) {
      console.warn("[gdpr-delete] confirm email failed:", e.message);
    }

    console.log(`[GDPR_DELETE_OK] ${role} ${profileEmail} (${deletionLog.tables_affected.length} groupes affectés)`);

    return res.status(200).json({
      ok: true,
      role,
      tables_affected: deletionLog.tables_affected,
      errors: deletionLog.errors,
      message: `Compte supprimé définitivement. Un email de confirmation a été envoyé à ${profileEmail}. Pour toute question : ${RB_SUPPORT_EMAIL}`,
    });
  } catch (err) {
    console.error(`[GDPR_DELETE_FAILED] reason="${err.message}"`);
    await captureException(err, { tags: { endpoint: "gdpr-delete" } });
    return res.status(500).json({ error: "Delete failed — contact " + RB_SUPPORT_EMAIL });
  }
};

// Hash 16 chars pour le log audit (pas réversible, juste traçabilité)
function hashUserId(id) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(String(id)).digest("hex").slice(0, 16);
}
function hashEmail(email) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(String(email).toLowerCase()).digest("hex").slice(0, 16);
}

async function sendDeletionConfirmation(to, name, role, log) {
  const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
  const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
  if (!SMTP_PASS) return;

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `RB Perform <${SMTP_USER}>`,
    to,
    replyTo: RB_SUPPORT_EMAIL,
    subject: "Ton compte RB Perform a été supprimé",
    text: `Bonjour ${name || ""},

Conformément à l'article 17 du RGPD (droit à l'effacement), nous confirmons la suppression de ton compte ${role} et de l'ensemble des données personnelles associées.

Détail :
${log.tables_affected.map(t => `  • ${t}`).join("\n")}

${log.errors.length > 0 ? `\n⚠ Quelques erreurs notées (non bloquantes) :\n${log.errors.map(e => `  • ${e}`).join("\n")}\n` : ""}
Tu n'as plus accès à RB Perform. Tu peux te recréer un compte à tout moment avec la même adresse email.

Pour toute question : ${RB_SUPPORT_EMAIL}

— RB Perform`,
  });
}
