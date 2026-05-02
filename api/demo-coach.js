/**
 * /api/demo-coach — Serverless function (Vercel)
 *
 * Genere une session Supabase pour le compte demo coach
 * (demo@rbperform.app) SANS mot de passe.
 *
 * Remplace le pattern précédent qui utilisait REACT_APP_DEMO_PASSWORD
 * inliné dans le bundle JS public (faille critique : n'importe qui
 * pouvait grep le main.js et récupérer le password). Maintenant le
 * password n'existe plus dans le client — la session est créée par
 * un magic link OTP côté serveur via service role.
 *
 * Flow (identique à demo-client.js mais pour le compte coach) :
 *   1. Admin SDK genere un magic link → recupere le OTP brut
 *   2. Anon SDK echange le OTP contre une session (access_token + refresh_token)
 *   3. Retourne les tokens au frontend
 *   4. Le frontend fait supabase.auth.setSession({ access_token, refresh_token })
 *
 * Securite :
 *   - Rate limit (1 req / 3s par IP via in-memory)
 *   - Origin check pour bloquer les server-to-server / bot callers
 *   - Pas de secrets exposes cote client
 *   - Le compte demo a des RLS qui limitent l'acces aux donnees demo uniquement
 */

const { getServiceClient, getAnonClient } = require("./_supabase");
const { isOriginAllowed } = require("./_security");

const DEMO_EMAIL = "demo@rbperform.app";

const lastCall = {};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (lastCall[ip] && now - lastCall[ip] < 3000) {
    return res.status(429).json({ error: "Too fast — retry in a few seconds" });
  }
  lastCall[ip] = now;

  try {
    const adminClient = getServiceClient();

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: DEMO_EMAIL,
      });

    if (linkError || !linkData?.properties?.email_otp) {
      console.error("[demo-coach] generateLink error:", linkError?.message);
      return res.status(500).json({
        error: "Could not generate demo session",
        detail: linkError?.message,
      });
    }

    const anonClient = getAnonClient();

    const { data: session, error: sessionError } =
      await anonClient.auth.verifyOtp({
        email: DEMO_EMAIL,
        token: linkData.properties.email_otp,
        type: "email",
      });

    if (sessionError || !session?.session) {
      console.error("[demo-coach] verifyOtp error:", sessionError?.message);
      return res.status(500).json({
        error: "Could not verify demo OTP",
        detail: sessionError?.message,
      });
    }

    return res.status(200).json({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    });
  } catch (err) {
    console.error("[demo-coach] unexpected:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
