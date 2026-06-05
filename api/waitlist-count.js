// GET /api/waitlist-count?source=methode-athlete
//
// Renvoie le nombre d'inscrits sur une source donnée. Cache 60s côté
// edge (s-maxage) pour éviter de hammer Supabase à chaque visite.
//
// Réponse :
//   { count: 47, places_total: 30, places_restantes: 30 }
//
// Ici places_total/restantes restent à 30 jusqu'au lancement lundi 15 juin.
// Après le launch, le coach mettra à jour places_restantes manuellement
// ou on connectera à la table ebook_purchases (TODO).

const { getServiceClient } = require('./_supabase');

const PLACES_TOTAL = 30;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const source = (req.query?.source || 'methode-athlete').toString().slice(0, 50);

  try {
    const sb = getServiceClient();
    const { count, error } = await sb
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('source', source);

    if (error) {
      console.error('[WAITLIST_COUNT_ERR]', error.message);
      // Fallback : on retourne 0 plutôt que de casser la page
      return res.status(200).json({
        count: 0,
        places_total: PLACES_TOTAL,
        places_restantes: PLACES_TOTAL,
        error: 'count_unavailable',
      });
    }

    return res.status(200).json({
      count: count || 0,
      places_total: PLACES_TOTAL,
      places_restantes: PLACES_TOTAL, // pre-launch : aucune vendue encore
      source,
    });
  } catch (e) {
    console.error('[WAITLIST_COUNT_UNCAUGHT]', e.message);
    return res.status(200).json({
      count: 0,
      places_total: PLACES_TOTAL,
      places_restantes: PLACES_TOTAL,
      error: 'fatal',
    });
  }
};
