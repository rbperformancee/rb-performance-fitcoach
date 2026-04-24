/**
 * GET /api/health
 *
 * Public liveness + readiness probe for external monitoring
 * (UptimeRobot, BetterStack, Vercel itself, etc.).
 *
 *   GET /api/health           → cheap liveness check, always 200 when process is alive
 *   GET /api/health?deep=1    → readiness: also pings Supabase + Stripe,
 *                               returns 503 if any critical dependency is down
 *
 * Response shape:
 *   {
 *     "status": "ok" | "degraded" | "down",
 *     "uptime_s": 42,
 *     "commit": "abcdef1",
 *     "region": "cdg1",
 *     "env": "production",
 *     "checks"?: {
 *       "supabase": "ok" | "fail",
 *       "stripe":   "ok" | "fail"
 *     }
 *   }
 *
 * No auth, no rate limit — probe needs to be public.
 * No env var reads beyond metadata; never expose secrets.
 */

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json');

  const body = {
    status: 'ok',
    uptime_s: Math.round(process.uptime()),
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  };

  // Shallow liveness: reply immediately
  if (req.query?.deep !== '1' && !req.url?.includes('deep=1')) {
    return res.status(200).json(body);
  }

  // Deep readiness: ping critical deps with short timeouts
  body.checks = {};
  const supaUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;

  // Supabase check — the auth health endpoint doesn't require a key
  if (supaUrl) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(`${supaUrl}/auth/v1/health`, { signal: ctrl.signal });
      clearTimeout(t);
      body.checks.supabase = r.ok ? 'ok' : `http_${r.status}`;
    } catch (e) {
      body.checks.supabase = 'fail';
    }
  } else {
    body.checks.supabase = 'not_configured';
  }

  // Stripe check — GET /v1/balance needs auth, but a raw GET on /v1/ returns 404
  // from their CDN which still proves the network path works. Use a small
  // public endpoint that 200s without auth.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch('https://api.stripe.com/v1/', { signal: ctrl.signal, method: 'HEAD' });
    clearTimeout(t);
    // Stripe returns 401 for HEAD without auth — treat as "reachable".
    body.checks.stripe = r.status === 401 || r.ok ? 'ok' : `http_${r.status}`;
  } catch (e) {
    body.checks.stripe = 'fail';
  }

  // Global status based on critical deps
  const critical = [body.checks.supabase];
  const anyDown = critical.some((c) => c === 'fail' || (typeof c === 'string' && c.startsWith('http_5')));
  const anyDegraded = critical.some((c) => typeof c === 'string' && c.startsWith('http_'));

  if (anyDown) {
    body.status = 'down';
    return res.status(503).json(body);
  }
  if (anyDegraded) {
    body.status = 'degraded';
    return res.status(200).json(body); // 200 so monitors don't page, but status signals
  }
  return res.status(200).json(body);
};
