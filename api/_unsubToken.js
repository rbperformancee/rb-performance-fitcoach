/**
 * Helper HMAC pour les liens /api/unsubscribe.
 *
 * Avant ce helper, n'importe qui pouvait faire :
 *   curl https://rbperform.app/api/unsubscribe?email=victim@example.com&type=all
 * et désabonner n'importe quel email connu → désabonnement de masse,
 * délivrabilité cassée pour tous les coachs payants (audit ULTRA-SECURITY HIGH).
 *
 * Maintenant chaque lien dans un email signé inclut un token HMAC :
 *   &t=<hex(hmac-sha256(email|type, SECRET))>
 *
 * Le secret est UNSUB_SECRET en env var. Si non configuré (cas dev),
 * fallback sur SUPABASE_SERVICE_ROLE_KEY (toujours présent en prod).
 *
 * Le token n'inclut PAS de timestamp d'expiration : un user qui clique
 * 6 mois plus tard depuis un vieil email peut toujours se désabonner
 * (c'est l'intention de RFC 8058). On ne protège que contre l'abus
 * (attaquant qui forge des URLs sans avoir reçu un email signé).
 */

const crypto = require('crypto');

function getSecret() {
  return process.env.UNSUB_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || 'rb_unsub_dev_only_do_not_use_in_prod';
}

/**
 * Signe un (email, type) → token hex 16 chars (sha256 tronqué).
 * 16 chars = 64 bits d'entropie, suffisant pour empêcher le brute-force
 * raisonnable (bien plus que les 4 caractères des codes coach).
 */
function signUnsubToken(email, type) {
  const data = `${String(email).toLowerCase().trim()}|${String(type || 'all').toLowerCase().trim()}`;
  return crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Vérifie le token. Comparaison constante-time pour éviter les timing
 * attacks. Retourne true si valide, false sinon.
 */
function verifyUnsubToken(email, type, token) {
  if (!token || typeof token !== 'string') return false;
  const expected = signUnsubToken(email, type);
  if (expected.length !== token.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(token, 'utf8'),
    );
  } catch {
    return false;
  }
}

/**
 * Construit l'URL complète /api/unsubscribe avec le token signé.
 * Usage : `<${buildUnsubUrl(email, 'weekly_digest')}>`
 */
function buildUnsubUrl(email, type = 'all', baseUrl = 'https://rbperform.app') {
  const t = signUnsubToken(email, type);
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&type=${encodeURIComponent(type)}&t=${t}`;
}

module.exports = { signUnsubToken, verifyUnsubToken, buildUnsubUrl };
