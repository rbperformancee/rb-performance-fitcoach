/**
 * api/_apns.js — helper Apple Push Notification service (APNs)
 *
 * Permet d'envoyer une notification push au token APNs d'un device iOS
 * natif (Capacitor wrapper). Le module est PURE — il n'a aucun effet de
 * bord à l'import, ce qui est important :
 *   - si les env vars APNs ne sont pas définies, l'endpoint qui consomme
 *     ce helper renvoie 503 et le cron skip silencieusement → zéro
 *     régression sur le web push existant.
 *
 * Auth APNs (token-based, .p8) :
 *   - APNS_KEY_ID        : identifiant 10 chars de la clé Apple
 *   - APNS_TEAM_ID       : Team ID Apple Developer (10 chars)
 *   - APNS_AUTH_KEY      : contenu du fichier .p8 (PEM, multi-lignes)
 *   - APNS_BUNDLE_ID     : bundle ID de l'app (défaut 'app.rbperform')
 *   - APNS_USE_SANDBOX   : '1' pour TestFlight/dev, unset pour prod
 *
 * Roadmap : APP_STORE_ROADMAP.md (Wave 5).
 */

const crypto = require("crypto");
const http2 = require("http2");

const APNS_HOST_PROD = "api.push.apple.com";
const APNS_HOST_SANDBOX = "api.sandbox.push.apple.com";

let _jwtCache = null; // { jwt, exp } — APNs accepte un JWT jusqu'à 60 min

/**
 * `true` si les env vars APNs sont définies (donc envoi possible).
 * L'appelant (endpoint, cron) doit gater son comportement sur cette valeur.
 */
function isApnsConfigured() {
  return !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_AUTH_KEY);
}

/**
 * Construit (ou ré-utilise depuis le cache) un JWT ES256 signé avec la clé
 * .p8 Apple. Apple accepte le même JWT jusqu'à 60 min — on rotate à 50 min
 * pour avoir une marge.
 */
function getApnsJwt() {
  const now = Math.floor(Date.now() / 1000);
  if (_jwtCache && _jwtCache.exp > now + 60) {
    return _jwtCache.jwt;
  }

  const kid = process.env.APNS_KEY_ID;
  const iss = process.env.APNS_TEAM_ID;
  const keyPem = process.env.APNS_AUTH_KEY;
  if (!kid || !iss || !keyPem) {
    throw new Error("APNS_KEY_ID / APNS_TEAM_ID / APNS_AUTH_KEY missing");
  }

  // Header + payload base64url
  const b64url = (obj) => Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const header = b64url({ alg: "ES256", kid, typ: "JWT" });
  const payload = b64url({ iss, iat: now });
  const signingInput = `${header}.${payload}`;

  // ES256 = ECDSA P-256 SHA-256 → Node's crypto.sign retourne DER, mais
  // JWT requiert le format IEEE P1363 (r||s sur 32 octets chacun). On
  // convertit.
  const der = crypto.sign("SHA256", Buffer.from(signingInput), {
    key: keyPem,
    dsaEncoding: "ieee-p1363", // garantit format JWT-compatible directement
  });

  const sig = der
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${sig}`;
  _jwtCache = { jwt, exp: now + 50 * 60 }; // rotate à 50 min
  return jwt;
}

/**
 * Envoie une notification APNs au token donné.
 *
 * @param {string} apnsToken   Token APNs du device (64+ chars hex)
 * @param {object} notification { title, body, url?, badge? }
 * @returns {Promise<{ok:boolean, status:number, dead:boolean, error?:string}>}
 *   `dead` vaut `true` pour 410 (Unregistered) → l'appelant doit DELETE la row.
 */
async function sendApnsNotification(apnsToken, notification) {
  if (!isApnsConfigured()) {
    return { ok: false, status: 0, dead: false, error: "APNS_NOT_CONFIGURED" };
  }
  if (!apnsToken || apnsToken.length < 32) {
    return { ok: false, status: 0, dead: false, error: "INVALID_TOKEN" };
  }

  const host = process.env.APNS_USE_SANDBOX === "1" ? APNS_HOST_SANDBOX : APNS_HOST_PROD;
  const bundleId = process.env.APNS_BUNDLE_ID || "app.rbperform";

  let jwt;
  try { jwt = getApnsJwt(); }
  catch (e) { return { ok: false, status: 0, dead: false, error: e.message }; }

  // Payload APNs standard. On embarque `url` dans le custom field pour le
  // deep-link traité par le pushNotificationActionPerformed listener.
  const apsBody = {
    aps: {
      alert: {
        title: String(notification.title || "RB Perform"),
        body: String(notification.body || ""),
      },
      sound: "default",
      ...(notification.badge ? { badge: Number(notification.badge) } : {}),
    },
    ...(notification.url ? { url: String(notification.url) } : {}),
  };

  // Apple APNs n'expose QUE de l'HTTP/2 — `fetch` (undici) sur Vercel
  // échoue avec "fetch failed" car la nego ALPN h2 ne passe pas dans le
  // runtime serverless. On utilise donc `node:http2` directement.
  return new Promise((resolve) => {
    let settled = false;
    const safeResolve = (v) => { if (!settled) { settled = true; resolve(v); } };

    let client;
    try {
      client = http2.connect(`https://${host}`);
    } catch (e) {
      return safeResolve({ ok: false, status: 0, dead: false, error: `h2_connect: ${e.message}` });
    }

    const timer = setTimeout(() => {
      safeResolve({ ok: false, status: 0, dead: false, error: "h2_timeout_10s" });
      try { client.close(); } catch {}
    }, 10000);

    client.on("error", (e) => {
      clearTimeout(timer);
      safeResolve({ ok: false, status: 0, dead: false, error: `h2_socket: ${e.message}` });
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${apnsToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 86400),
      "content-type": "application/json",
    });

    let status = 0;
    let body = "";
    req.on("response", (h) => { status = h[":status"]; });
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("error", (e) => {
      clearTimeout(timer);
      safeResolve({ ok: false, status: 0, dead: false, error: `h2_req: ${e.message}` });
      try { client.close(); } catch {}
    });
    req.on("end", () => {
      clearTimeout(timer);
      try { client.close(); } catch {}
      if (status === 200) {
        return safeResolve({ ok: true, status: 200, dead: false });
      }
      const dead = status === 410 || (status === 400 && /BadDeviceToken|Unregistered/i.test(body));
      safeResolve({ ok: false, status, dead, error: body.slice(0, 300) });
    });

    req.write(JSON.stringify(apsBody));
    req.end();
  });
}

module.exports = {
  isApnsConfigured,
  getApnsJwt,
  sendApnsNotification,
  // Exposés pour test seulement — ne pas utiliser depuis du code applicatif
  _resetCache: () => { _jwtCache = null; },
};
