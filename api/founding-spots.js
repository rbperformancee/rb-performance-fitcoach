/**
 * GET /api/founding-spots
 *
 * Compteur public et HONNÊTE du programme Founding Coach.
 * La page /founding.html affichait « 30 places restantes » en statique —
 * dès la 1re inscription c'était un mensonge visible, tueur de crédibilité.
 *
 * Réponse :
 *   { total: 30, taken: <int>, remaining: <int>, closed: <bool> }
 *
 * Cache CDN 60s + SWR 300s : la valeur change rarement, on évite de taper
 * la DB à chaque pageview.
 */

const { getServiceClient } = require('./_supabase');
const { attachRequestId } = require('./_security');
const { captureException } = require('./_sentry');

const FOUNDING_TOTAL = 30;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  attachRequestId(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from('coaches')
      .select('id', { count: 'exact', head: true })
      .eq('founding_coach', true);
    if (error) throw error;

    const taken = count || 0;
    const remaining = Math.max(0, FOUNDING_TOTAL - taken);
    return res.status(200).json({
      total: FOUNDING_TOTAL,
      taken,
      remaining,
      closed: remaining === 0,
    });
  } catch (e) {
    captureException(e, { tag: 'founding-spots' });
    // En cas d'erreur, on retourne le total complet plutôt que de bloquer
    // l'affichage. Mieux vaut une page qui affiche le total que rien.
    return res.status(200).json({
      total: FOUNDING_TOTAL,
      taken: 0,
      remaining: FOUNDING_TOTAL,
      closed: false,
      degraded: true,
    });
  }
};
