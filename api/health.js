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
 *       "supabase": "ok" | "fail" | "http_<code>",
 *       "stripe":   "ok" | "fail" | "http_<code>",
 *       "resend":   "ok" | "fail" | "not_configured"
 *     },
 *     "latency"?: {
 *       "supabase": <ms>,
 *       "stripe":   <ms>,
 *       "resend":   <ms>
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
  body.latency = {};
  const supaUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const zohoConfigured = !!process.env.ZOHO_SMTP_PASS;

  // Reachability probe: treat 2xx, 401, 404 as "reachable" — we only want
  // to know the network path + TLS handshake work, not that we can auth.
  // Returns { status, ms } for latency tracking.
  async function ping(url, opts = {}) {
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(url, { signal: ctrl.signal, ...opts });
      clearTimeout(t);
      const ms = Date.now() - start;
      if (r.ok || r.status === 401 || r.status === 404) return { status: 'ok', ms };
      if (r.status >= 500) return { status: `http_${r.status}`, ms };
      return { status: `http_${r.status}`, ms };
    } catch {
      return { status: 'fail', ms: Date.now() - start };
    }
  }

  // Run all probes in parallel for fastest response
  // Note : pas de ping SMTP Zoho (port 465 bloque depuis Vercel + couteux).
  // On verifie juste que ZOHO_SMTP_PASS est set en env.
  const [supaR, stripeR] = await Promise.all([
    supaUrl ? ping(`${supaUrl}/auth/v1/settings`) : Promise.resolve({ status: 'not_configured', ms: 0 }),
    ping('https://api.stripe.com/v1/', { method: 'HEAD' }),
  ]);

  body.checks.supabase = supaR.status;
  body.checks.stripe = stripeR.status;
  body.checks.zoho_smtp = zohoConfigured ? 'configured' : 'not_configured';
  if (supaR.ms) body.latency.supabase = supaR.ms;
  if (stripeR.ms) body.latency.stripe = stripeR.ms;

  // Global status based on critical deps (Supabase only — Stripe + Zoho nice-to-haves)
  const critical = [body.checks.supabase];
  const anyDown = critical.some((c) => c === 'fail' || (typeof c === 'string' && c.startsWith('http_5')));
  const anyDegraded = critical.some((c) => typeof c === 'string' && c !== 'ok' && c !== 'not_configured' && !c.startsWith('http_5') && c !== 'fail');

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
