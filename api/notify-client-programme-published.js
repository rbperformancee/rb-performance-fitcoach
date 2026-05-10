/**
 * POST /api/notify-client-programme-published
 *
 * Notification instantanée : "Ton programme est dispo" → push + email au client.
 * Appelé par ProgrammeBuilder après un "Publier maintenant" pour pas attendre la cron.
 *
 * Auth : Bearer token coach OBLIGATOIRE — vérifie ownership clients.coach_id.
 * Body : { programmeId: uuid }
 *
 * Le programme doit avoir is_active=true AND published_at <= NOW().
 * Si la condition n'est pas remplie (ex: planifié futur), refuse pour éviter
 * de spoiler le client avant la date prévue.
 *
 * Idempotent : marque programmes.notif_sent_at = NOW(), donc la cron skip ensuite.
 */

const { getServiceClient } = require("./_supabase");
const { secureRequest } = require("./_security");
const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || "https://rbperform.app";

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!secureRequest(req, res, { max: 60, windowMs: 3600000 })) return;

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing Authorization header" });

    const supabase = getServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid session" });

    const { data: coach } = await supabase
      .from("coaches").select("id").eq("id", user.id).maybeSingle();
    if (!coach) return res.status(403).json({ error: "Reserved to coaches" });

    let body = req.body;
    try { if (typeof body === "string") body = JSON.parse(body); } catch {
      return res.status(400).json({ error: "Malformed JSON" });
    }
    const programmeId = String(body?.programmeId || "").trim();
    if (!programmeId) return res.status(400).json({ error: "programmeId required" });

    // Récup programme + ownership + état "live"
    const { data: prog, error: progErr } = await supabase
      .from("programmes")
      .select("id, client_id, programme_name, is_active, published_at, notif_sent_at, clients(coach_id, email, full_name)")
      .eq("id", programmeId)
      .maybeSingle();
    if (progErr || !prog) return res.status(404).json({ error: "Programme not found" });
    if (!prog.clients || prog.clients.coach_id !== coach.id) {
      return res.status(403).json({ error: "Not your client" });
    }
    if (!prog.is_active) return res.status(400).json({ error: "Programme not active" });
    if (!prog.published_at) return res.status(400).json({ error: "Programme is a draft" });
    if (new Date(prog.published_at) > new Date()) {
      return res.status(400).json({ error: "Programme scheduled in future — wait for the cron" });
    }
    if (prog.notif_sent_at) {
      return res.status(200).json({ ok: true, already_sent: true });
    }

    const clientName = prog.clients.full_name;
    const clientEmail = prog.clients.email;
    const progName = prog.programme_name || "Nouveau programme";

    const [pushOk, emailOk] = await Promise.all([
      sendPush(prog.client_id, "Ton programme est dispo", `${progName} — ouvre l'app pour commencer.`, "/training"),
      clientEmail ? sendEmail(clientEmail, clientName, progName) : Promise.resolve(false),
    ]);

    await supabase.from("programmes")
      .update({ notif_sent_at: new Date().toISOString() })
      .eq("id", programmeId);

    return res.status(200).json({ ok: true, push: pushOk, email: emailOk });
  } catch (err) {
    console.error("[NOTIFY_PROGRAMME_FAILED]", err.message);
    await captureException(err, { tags: { endpoint: "notify-client-programme-published" } });
    return res.status(500).json({ error: err.message });
  }
};

async function sendPush(clientId, title, body, url) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ client_id: clientId, title, body, url }),
    });
    return r.ok;
  } catch { return false; }
}

async function sendEmail(toEmail, clientName, programmeName) {
  const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
  const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
  if (!SMTP_PASS) return false;

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const firstName = (clientName || "").split(" ")[0] || "";
  const greeting = firstName ? `Salut ${firstName},` : "Salut,";
  const safeName = String(programmeName || "Nouveau programme").replace(/[<>]/g, "");

  const html = `<html><body style="background:#0a0a0a;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;padding:32px;">
    <div style="max-width:480px;margin:0 auto;">
      <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.7);margin-bottom:6px;">RB Perform</div>
      <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:16px;letter-spacing:-0.5px;">Ton programme est dispo</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;margin-bottom:24px;">
        ${greeting}<br><br>
        Ton coach vient de publier <strong style="color:#02d1ba;">${safeName}</strong>.<br>
        Tu peux le découvrir et commencer maintenant.
      </div>
      <a href="${APP_URL}/training" style="display:inline-block;background:#02d1ba;color:#000;text-decoration:none;font-weight:800;font-size:13px;padding:14px 28px;border-radius:10px;letter-spacing:0.3px;">Voir mon programme</a>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:24px;">— RB Perform</div>
    </div>
  </body></html>`;

  try {
    await transporter.sendMail({
      from: `RB Perform <${SMTP_USER}>`,
      to: toEmail, replyTo: SMTP_USER,
      subject: "Ton programme est dispo",
      html,
    });
    return true;
  } catch (e) {
    console.warn("[notify-programme] email failed", toEmail, e?.message);
    return false;
  }
}
