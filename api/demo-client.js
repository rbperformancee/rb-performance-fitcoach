/**
 * /api/demo-client — Serverless function (Vercel)
 *
 * Genere une session Supabase pour le compte demo client
 * (lucas.demo@rbperform.app) SANS mot de passe.
 *
 * Flow :
 *   1. Admin SDK genere un magic link → recupere le OTP brut
 *   2. Anon SDK echange le OTP contre une session (access_token + refresh_token)
 *   3. Retourne les tokens au frontend
 *   4. Le frontend fait supabase.auth.setSession({ access_token, refresh_token })
 *
 * Securite :
 *   - Rate limit naif (1 req / 5s par IP via header)
 *   - Pas de secrets exposes cote client
 *   - Le compte demo a des RLS qui limitent l'acces aux donnees demo uniquement
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const DEMO_EMAIL = "lucas.demo@rbperform.app";

const lastCall = {};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return res.status(500).json({ error: "Missing Supabase config" });
  }

  // Rate limit : 1 req / 30s par IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (lastCall[ip] && now - lastCall[ip] < 30000) {
    return res.status(429).json({ error: "Too fast — retry in 30 seconds" });
  }
  lastCall[ip] = now;

  try {
    // 1. Admin client — genere un magic link pour obtenir le OTP
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: DEMO_EMAIL,
      });

    if (linkError || !linkData?.properties?.email_otp) {
      console.error("[demo-client] generateLink error:", linkError?.message);
      return res.status(500).json({
        error: "Could not generate demo session",
        detail: linkError?.message,
      });
    }

    // 2. Anon client — echange le OTP contre une vraie session
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: session, error: sessionError } =
      await anonClient.auth.verifyOtp({
        email: DEMO_EMAIL,
        token: linkData.properties.email_otp,
        type: "email",
      });

    if (sessionError || !session?.session) {
      console.error("[demo-client] verifyOtp error:", sessionError?.message);
      return res.status(500).json({
        error: "Could not verify demo OTP",
        detail: sessionError?.message,
      });
    }

    // 3. Retourne les tokens (le frontend fera setSession)
    return res.status(200).json({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    });
  } catch (err) {
    console.error("[demo-client] unexpected:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
