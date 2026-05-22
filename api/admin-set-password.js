/**
 * POST /api/admin-set-password
 *
 * Endpoint d'urgence pour reset/set le password d'un coach via service_role
 * (bypass complet du flow magic link Supabase). Utilisé quand le coach est
 * bloqué et que les emails Supabase reset ne fonctionnent pas.
 *
 * Sécurité : Bearer CRON_SECRET requis.
 *
 * Body : { email: string, password: string (min 8 char) }
 * Response : { ok: true, userId: string } ou { error: string }
 *
 * À supprimer dès que le flow magic link / set-password marche de bout en bout
 * pour éviter d'avoir un endpoint admin permanent qui pourrait être attaqué.
 */

const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "unauthorized — Bearer CRON_SECRET required" });
  }
  if (!SUPABASE_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email + password required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "password min 8 chars" });
  }

  try {
    // 1. Find user by email via admin API
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!listRes.ok) {
      const text = await listRes.text();
      return res.status(500).json({ error: `list users failed: ${text.slice(0, 200)}` });
    }
    const listData = await listRes.json();
    const user = (listData.users || []).find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    // 2. Update password via admin API
    const updRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    if (!updRes.ok) {
      const text = await updRes.text();
      return res.status(500).json({ error: `update failed: ${text.slice(0, 300)}` });
    }
    const updData = await updRes.json();

    return res.status(200).json({
      ok: true,
      userId: user.id,
      email: user.email,
      passwordSet: true,
      passwordLength: password.length,
    });
  } catch (err) {
    console.error("[admin-set-password]", err.message);
    await captureException(err, { tags: { endpoint: "admin-set-password" } });
    return res.status(500).json({ error: err.message });
  }
};
