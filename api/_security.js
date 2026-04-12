/**
 * Utilitaires de securite pour les routes /api/*
 * - Rate limiting en memoire (fenetre glissante)
 * - Verification de l'Origin
 *
 * Note : Vercel serverless = stateless, donc le rate limiter est
 * par-instance (pas parfait mais efficace pour ralentir un attaquant).
 * Pour du vrai rate limiting distribue, utiliser Upstash Redis.
 */

const ALLOWED_ORIGINS = [
  "https://rb-perfor.vercel.app",
  "https://rb-performance-fitcoach.vercel.app",
];
// Tolere aussi les preview deployments vercel
const VERCEL_PREVIEW_REGEX = /^https:\/\/[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/;

// Autoriser localhost en dev
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:5173");
}

/**
 * Verifie l'origine de la requete.
 * Retourne true si autorisee, false sinon.
 * Les requetes sans Origin (server-to-server, curl) sont rejetees.
 */
function isOriginAllowed(req) {
  const origin = req.headers.origin || req.headers.referer || "";
  if (!origin) return false;
  // Match exact
  if (ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) return true;
  // Preview deployments Vercel
  try {
    const url = new URL(origin);
    if (VERCEL_PREVIEW_REGEX.test(`${url.protocol}//${url.hostname}`)) return true;
  } catch {}
  return false;
}

/**
 * Rate limiter simple par IP, fenetre glissante.
 * Utilise une Map globale partagee entre invocations de la meme instance.
 */
const buckets = new Map(); // ip → [timestamps]

function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * @param {object} req
 * @param {object} opts
 * @param {number} opts.max - Nombre max de requetes dans la fenetre
 * @param {number} opts.windowMs - Taille de la fenetre en ms
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
function rateLimit(req, { max = 20, windowMs = 3600000 } = {}) {
  const ip = getIP(req);
  const now = Date.now();
  const timestamps = (buckets.get(ip) || []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  buckets.set(ip, timestamps);

  // Nettoyage opportuniste : si la Map depasse 10k IPs, on purge les vieilles
  if (buckets.size > 10000) {
    for (const [k, v] of buckets.entries()) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  const remaining = Math.max(0, max - timestamps.length);
  const oldestInWindow = timestamps[0];
  const resetIn = oldestInWindow ? windowMs - (now - oldestInWindow) : windowMs;
  return {
    allowed: timestamps.length <= max,
    remaining,
    resetIn: Math.max(0, resetIn),
  };
}

/**
 * Wrapper complet : verifie origin + rate limit.
 * Envoie la reponse d'erreur si echec, retourne true si OK.
 */
function secureRequest(req, res, opts = {}) {
  // Verifier origin (sauf OPTIONS CORS preflight)
  if (req.method !== "OPTIONS" && !isOriginAllowed(req)) {
    res.status(403).json({ error: "Origin not allowed" });
    return false;
  }
  // Rate limiting
  const rl = rateLimit(req, opts);
  res.setHeader("X-RateLimit-Limit", opts.max || 20);
  res.setHeader("X-RateLimit-Remaining", rl.remaining);
  if (!rl.allowed) {
    res.setHeader("Retry-After", Math.ceil(rl.resetIn / 1000));
    res.status(429).json({
      error: "Too many requests",
      retry_after_seconds: Math.ceil(rl.resetIn / 1000),
    });
    return false;
  }
  return true;
}

module.exports = { isOriginAllowed, rateLimit, secureRequest, getIP };
