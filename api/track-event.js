/**
 * POST /api/track-event
 *
 * Endpoint d'ingestion analytics auto-hébergé. Remplace Plausible / GA.
 * Reçoit les events du funnel (Funnel:ApplicationSubmitted etc.) et les
 * insère dans analytics_events (RLS super_admin only en lecture).
 *
 * Body : { name, props?, session_id?, page_path?, referrer?, email? }
 *
 * Rate-limiting léger : 60 events / min / IP pour bloquer le spam.
 * Pas d'auth requise (endpoint public car appelé depuis le navigateur).
 */

const { z } = require('zod');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const eventSchema = z.object({
  name: z.string().min(1).max(80),
  props: z.record(z.any()).optional(),
  session_id: z.string().max(64).optional().nullable(),
  page_path: z.string().max(500).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  source: z.string().max(40).optional().nullable(),
  utm_source: z.string().max(60).optional().nullable(),
  utm_medium: z.string().max(60).optional().nullable(),
  utm_campaign: z.string().max(80).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
});

// Mémoire en RAM. Naïf mais OK pour le launch (single-region Vercel function).
// Pour scaler : remplacer par Upstash Redis ou la table notification_logs.
const ipBuckets = new Map();
const RATE_LIMIT = 60; // events / 60s / IP

function isRateLimited(ip) {
  const now = Date.now();
  const cutoff = now - 60_000;
  const arr = (ipBuckets.get(ip) || []).filter((t) => t > cutoff);
  arr.push(now);
  ipBuckets.set(ip, arr);
  return arr.length > RATE_LIMIT;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limit' });
  }

  let body;
  try {
    body = eventSchema.parse(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid event' });
  }

  // Country : Vercel geo header (https://vercel.com/docs/edge-network/headers)
  const country = (req.headers['x-vercel-ip-country'] || '').toString().slice(0, 2) || null;
  const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 500);

  try {
    const row = {
      name: body.name,
      props: body.props || {},
      session_id: body.session_id || null,
      page_path: body.page_path || null,
      referrer: body.referrer || null,
      source: body.source || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      email: body.email || null,
      country,
      user_agent: userAgent,
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[track-event] SB insert failed', resp.status, text.slice(0, 200));
      // On répond OK côté client : un échec d'analytics ne doit pas casser l'UX
      return res.status(200).json({ ok: true, persisted: false });
    }
    return res.status(200).json({ ok: true, persisted: true });
  } catch (err) {
    console.error('[track-event] exception:', err.message);
    await captureException(err, { tags: { endpoint: 'track-event' } });
    return res.status(200).json({ ok: true, persisted: false });
  }
};
