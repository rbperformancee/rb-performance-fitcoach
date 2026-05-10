/**
 * POST /api/coach-update-client-email
 *
 * Permet à un coach de changer l'email d'un de ses clients.
 *
 * Auth : Bearer token Supabase OBLIGATOIRE — doit être un coach propriétaire
 *        du client cible (clients.coach_id === coach.id).
 *
 * Body : { clientId: uuid, newEmail: string }
 *
 * Process :
 *   1. Vérifie le token + résout coach
 *   2. Vérifie que le client existe et appartient à ce coach
 *   3. Valide format email + non-vide + différent de l'actuel
 *   4. Vérifie que le nouvel email n'est pas déjà pris (clients ou auth.users)
 *   5. Update auth.users.email (admin.updateUserById) si user existe
 *   6. Update clients.email
 *   7. Retour ok
 *
 * Note : on ne met pas à jour Stripe car les clients (pas les coaches)
 *        n'ont pas de stripe_customer_id en DB. Si tu factures via Stripe,
 *        c'est sur la table coaches, pas clients.
 */

const { getServiceClient } = require("./_supabase");
const { secureRequest } = require("./_security");
const { captureException } = require("./_sentry");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit modéré — pas critique mais pas spammable
  if (!secureRequest(req, res, { max: 30, windowMs: 3600000 })) return;

  try {
    // 1. Auth
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing Authorization header" });

    const supabase = getServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid or expired session" });

    // Vérifie que c'est un coach
    const { data: coach } = await supabase
      .from("coaches").select("id, email").eq("id", user.id).maybeSingle();
    if (!coach) return res.status(403).json({ error: "Reserved to coaches" });

    // 2. Body
    let body = req.body;
    try { if (typeof body === "string") body = JSON.parse(body); } catch {
      return res.status(400).json({ error: "Malformed JSON" });
    }
    const clientId = String(body?.clientId || "").trim();
    const newEmail = String(body?.newEmail || "").trim().toLowerCase();

    if (!clientId) return res.status(400).json({ error: "clientId required" });
    if (!newEmail) return res.status(400).json({ error: "newEmail required" });
    if (!EMAIL_RE.test(newEmail)) return res.status(400).json({ error: "Invalid email format" });
    if (newEmail.length > 254) return res.status(400).json({ error: "Email too long" });

    // 3. Verify ownership
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, email, full_name, coach_id")
      .eq("id", clientId).maybeSingle();
    if (clientErr) return res.status(500).json({ error: "DB error: " + clientErr.message });
    if (!client) return res.status(404).json({ error: "Client not found" });
    if (client.coach_id !== coach.id) return res.status(403).json({ error: "Not your client" });

    if (client.email === newEmail) {
      return res.status(400).json({ error: "Same email, no change" });
    }

    // 4. Check uniqueness on clients table
    const { data: existingClient } = await supabase
      .from("clients").select("id").eq("email", newEmail).maybeSingle();
    if (existingClient) return res.status(409).json({ error: "Email already used by another client" });

    // 5. Update auth.users si un user existe avec l'ancien email
    // (les clients invités via /join n'ont pas forcément encore un compte auth)
    let authUpdated = false;
    let authId = null;
    try {
      // Recherche du user auth par email
      const { data: list } = await supabase.auth.admin.listUsers({
        page: 1, perPage: 200,
      });
      const oldEmailLc = (client.email || "").toLowerCase();
      const found = (list?.users || []).find((u) => (u.email || "").toLowerCase() === oldEmailLc);
      if (found) {
        authId = found.id;
        const { error: updErr } = await supabase.auth.admin.updateUserById(authId, {
          email: newEmail,
          email_confirm: true, // skip email validation, le coach a la responsabilité
        });
        if (updErr) {
          // Si le nouvel email est déjà pris en auth → conflit
          if (/already (exists|registered|been used)/i.test(updErr.message)) {
            return res.status(409).json({ error: "Email already registered in auth" });
          }
          throw updErr;
        }
        authUpdated = true;
      }
    } catch (e) {
      console.error("[coach-update-client-email] auth update failed:", e.message);
      return res.status(500).json({ error: "Auth update failed: " + e.message });
    }

    // 6. Update clients.email
    const { error: updClientErr } = await supabase
      .from("clients").update({ email: newEmail }).eq("id", clientId);
    if (updClientErr) {
      // Rollback best-effort sur auth si on a déjà update
      if (authUpdated && authId) {
        try {
          await supabase.auth.admin.updateUserById(authId, { email: client.email, email_confirm: true });
        } catch (_) { /* noop */ }
      }
      return res.status(500).json({ error: "DB update failed: " + updClientErr.message });
    }

    console.log(`[COACH_UPDATE_CLIENT_EMAIL_OK] coach=${coach.email} client=${clientId} ${client.email} → ${newEmail} authUpdated=${authUpdated}`);

    return res.status(200).json({
      ok: true,
      old_email: client.email,
      new_email: newEmail,
      auth_updated: authUpdated,
    });
  } catch (err) {
    console.error(`[COACH_UPDATE_CLIENT_EMAIL_FAILED] ${err.message}`);
    await captureException(err, { tags: { endpoint: "coach-update-client-email" } });
    return res.status(500).json({ error: "Update failed: " + err.message });
  }
};
