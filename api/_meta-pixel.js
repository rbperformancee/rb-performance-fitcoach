/**
 * Meta Conversions API helper — server-side pixel events.
 *
 * Bypasse les adblockers en envoyant les conversions directement à
 * graph.facebook.com côté serveur. Hashing SHA256 sur email/phone
 * conformément aux specs Meta (PII matching).
 *
 * Doc : https://developers.facebook.com/docs/marketing-api/conversions-api
 *
 * Pour Rayan en solo : pas de table ad_pixels multi-tenant comme FunnelOps.
 * On lit directement META_PIXEL_ID + META_CONVERSIONS_API_TOKEN depuis env.
 *
 * Events posés :
 *   - "Lead"          (candidature soumise)
 *   - "ViewContent"   (landing /candidature vue)
 *   - "InitiateCheckout" (clic CTA candidature)
 *   - "Schedule"      (créneau call confirmé)
 *   - "Contact"       (mail opt-in pack découverte)
 *   - "Purchase"      (closed_won marqué)
 */

const crypto = require('crypto');

const API_VERSION = 'v20.0';
const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE; // ex: TEST123 (debug)

function sha256(s) {
  if (!s) return undefined;
  return crypto.createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex');
}

/**
 * Normalise un téléphone au format E.164 simplifié (digits seulement) pour
 * le hashing. Meta accepte format "33612345678" (sans +).
 */
function normalizePhone(phone) {
  if (!phone) return undefined;
  const digits = String(phone).replace(/[^\d]/g, '');
  if (!digits) return undefined;
  return digits;
}

/**
 * Pousse un event Meta. Fire-and-forget : ne plante jamais l'app si Meta
 * répond mal. Logue les erreurs en console + Sentry si dispo.
 *
 * @param {Object} opts
 * @param {string} opts.event_name - "Lead" | "ViewContent" | "InitiateCheckout" |
 *                                    "Schedule" | "Contact" | "Purchase" | ...
 * @param {string} [opts.email]
 * @param {string} [opts.phone]
 * @param {number} [opts.value]
 * @param {string} [opts.currency='EUR']
 * @param {string} [opts.event_id] - pour dedup avec le pixel browser-side
 * @param {string} [opts.event_source_url] - URL où l'event s'est produit
 * @param {string} [opts.client_ip] - IP client (récupérée depuis x-forwarded-for)
 * @param {string} [opts.user_agent] - UA client
 * @param {Object} [opts.custom_data] - extra props
 */
async function pushMetaEvent(opts) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    // Pas de config Meta → skip silencieux. Pas d'erreur en dev.
    return { ok: false, skipped: true };
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const eventId = opts.event_id || crypto.randomUUID();

  const userData = {};
  if (opts.email) userData.em = [sha256(opts.email)];
  const normalizedPhone = normalizePhone(opts.phone);
  if (normalizedPhone) userData.ph = [sha256(normalizedPhone)];
  if (opts.client_ip) userData.client_ip_address = opts.client_ip;
  if (opts.user_agent) userData.client_user_agent = opts.user_agent;

  const customData = {
    currency: opts.currency || 'EUR',
    ...(opts.value !== undefined ? { value: opts.value } : {}),
    ...(opts.custom_data || {}),
  };

  const payload = {
    data: [
      {
        event_name: opts.event_name,
        event_time: eventTime,
        event_id: eventId,
        action_source: 'website',
        event_source_url: opts.event_source_url || 'https://rbperform.app',
        user_data: userData,
        custom_data: customData,
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(
      ACCESS_TOKEN
    )}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[meta-pixel] ${opts.event_name} HTTP ${resp.status}: ${text.slice(0, 300)}`);
      return { ok: false, status: resp.status, body: text };
    }
    const body = await resp.json();
    return { ok: true, body, event_id: eventId };
  } catch (err) {
    console.error(`[meta-pixel] ${opts.event_name} exception:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Extrait IP + UA depuis une req Vercel pour les passer à Meta (improves match).
 */
function extractRequestContext(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    undefined;
  const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 500);
  return { client_ip: ip, user_agent: userAgent };
}

module.exports = {
  pushMetaEvent,
  extractRequestContext,
  sha256,
  normalizePhone,
};
