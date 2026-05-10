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

    // 7. Notification email (best-effort, non bloquant)
    //    - Ancien email : alerte sécurité "ton adresse a été changée"
    //    - Nouvel email : confirmation "tu peux te connecter avec ce nouvel email"
    sendChangeNotifications({
      oldEmail: client.email,
      newEmail,
      clientName: client.full_name,
      coachEmail: coach.email,
    }).catch((e) => console.warn("[coach-update-client-email] notif email failed:", e.message));

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

async function sendChangeNotifications({ oldEmail, newEmail, clientName, coachEmail }) {
  const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
  const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
  if (!SMTP_PASS) return;

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const firstName = (clientName || "").split(" ")[0] || "";
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const fromHeader = `RB Perform <${SMTP_USER}>`;

  // Alerte ancien email — sécurité
  const oldHtml = `<html><body style="background:#0a0a0a;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;">
    <div style="max-width:480px;margin:0 auto;">
      <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:#ef4444;margin-bottom:6px;">Sécurité</div>
      <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:16px;letter-spacing:-0.5px;">Ton adresse email a changé</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;margin-bottom:20px;">
        ${greeting}<br><br>
        Ton coach a modifié l'adresse email associée à ton compte RB Perform.<br><br>
        <strong>Nouvelle adresse :</strong> ${escapeHtml(newEmail)}<br>
        À partir de maintenant, tu dois utiliser cette nouvelle adresse pour te connecter.
      </div>
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:16px;margin-bottom:20px;">
        <div style="font-size:12px;color:rgba(255,255,255,0.7);line-height:1.5;">
          Si ce changement n'a pas été fait à ta demande, contacte ton coach (${escapeHtml(coachEmail)}) ou réponds à cet email.
        </div>
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);">— RB Perform</div>
    </div>
  </body></html>`;

  // Confirmation nouvel email
  const newHtml = `<html><body style="background:#0a0a0a;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;">
    <div style="max-width:480px;margin:0 auto;">
      <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.7);margin-bottom:6px;">Confirmation</div>
      <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:16px;letter-spacing:-0.5px;">Nouvelle adresse email confirmée</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;margin-bottom:20px;">
        ${greeting}<br><br>
        Ton compte RB Perform est maintenant lié à cette adresse email. Tu peux te connecter avec.<br><br>
        <strong>Ancienne adresse :</strong> ${escapeHtml(oldEmail)}<br>
        <strong>Nouvelle adresse :</strong> ${escapeHtml(newEmail)}
      </div>
      <a href="https://rbperform.app" style="display:inline-block;background:#02d1ba;color:#000;text-decoration:none;font-weight:800;font-size:13px;padding:12px 24px;border-radius:10px;letter-spacing:0.3px;">Ouvrir RB Perform</a>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:20px;">— RB Perform</div>
    </div>
  </body></html>`;

  await Promise.all([
    transporter.sendMail({
      from: fromHeader, to: oldEmail, replyTo: SMTP_USER,
      subject: "Ton email RB Perform a été changé",
      html: oldHtml,
    }).catch((e) => console.warn("[coach-update-client-email] old-email send failed:", e.message)),
    transporter.sendMail({
      from: fromHeader, to: newEmail, replyTo: SMTP_USER,
      subject: "Nouvelle adresse confirmée — RB Perform",
      html: newHtml,
    }).catch((e) => console.warn("[coach-update-client-email] new-email send failed:", e.message)),
  ]);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
