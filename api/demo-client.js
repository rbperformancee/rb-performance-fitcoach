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

const { getServiceClient, getAnonClient } = require("./_supabase");
const { isOriginAllowed } = require("./_security");

const DEMO_EMAIL = "lucas.demo@rbperform.app";

const lastCall = {};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  // CORS preflight — return early before any auth/rate-limit logic.
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Origin check — demo-client is invoked from the React app (/demo route).
  // Block server-to-server / bot callers that could burn Supabase admin quota.
  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  // Rate limit : 3s par IP — auto-login fires several requests on page load,
  // we just need to absorb the burst, not gate the demo behind 30s.
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (lastCall[ip] && now - lastCall[ip] < 3000) {
    return res.status(429).json({ error: "Too fast — retry in a few seconds" });
  }
  lastCall[ip] = now;

  try {
    // 1. Admin client — genere un magic link pour obtenir le OTP
    const adminClient = getServiceClient();

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
    const anonClient = getAnonClient();

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
