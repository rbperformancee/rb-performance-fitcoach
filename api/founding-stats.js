/**
 * GET /api/founding-stats
 *
 * Renvoie l'état du Founding Coach Program pour afficher la scarcity-places
 * sur landing.html et founding.html (en remplacement du countdown-date qui
 * était incohérent avec une stratégie long-haul).
 *
 * Compte les vrais Founding actifs en excluant les comptes internes (Rayan,
 * démo, comptes +alias de test). Pas de migration DB : la liste d'exclusion
 * est ici, modifiable sans redeploy si on ajoute un compte interne.
 *
 * Réponse :
 *   { totalPlaces: 30,
 *     placesTaken: 1,
 *     placesLeft: 29,
 *     locked: false,         // true quand placesLeft === 0
 *     priceCurrent: 199,
 *     priceAfter: 299 }
 *
 * Cache : 5 min edge (la valeur bouge rarement, pas besoin de hit Supabase
 * à chaque pageview landing). Stale-while-revalidate pour résilience.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Emails à exclure du compte (comptes internes : toi, démo, tests).
// Si tu ajoutes un coach interne, ajoute son email ici.
const INTERNAL_EMAILS = new Set([
  "rb.performancee@gmail.com",
  "demo@rbperform.app",
]);

// Le compte +alias regex (rayan.b2701+xxx@gmail.com) — capture tous les
// comptes de test que tu crées avec ton Gmail principal.
const INTERNAL_ALIAS_RE = /^rayan\.b2701\+/;

const TOTAL_PLACES = 30;
const PRICE_CURRENT = 199;
const PRICE_AFTER = 299;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      // Fallback safe : si env vars manquent, on assume "vide" (mode marketing).
      return res.status(200).json({
        totalPlaces: TOTAL_PLACES,
        placesTaken: 0,
        placesLeft: TOTAL_PLACES,
        locked: false,
        priceCurrent: PRICE_CURRENT,
        priceAfter: PRICE_AFTER,
        degraded: true,
      });
    }

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/coaches?subscription_plan=eq.founding&select=email`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!r.ok) throw new Error(`supabase_${r.status}`);
    const rows = await r.json();

    // Filtre les internes
    const realFounding = (Array.isArray(rows) ? rows : []).filter((row) => {
      const e = (row.email || "").toLowerCase();
      if (!e) return false;
      if (INTERNAL_EMAILS.has(e)) return false;
      if (INTERNAL_ALIAS_RE.test(e)) return false;
      return true;
    });

    const placesTaken = realFounding.length;
    const placesLeft = Math.max(0, TOTAL_PLACES - placesTaken);

    return res.status(200).json({
      totalPlaces: TOTAL_PLACES,
      placesTaken,
      placesLeft,
      locked: placesLeft === 0,
      priceCurrent: PRICE_CURRENT,
      priceAfter: PRICE_AFTER,
    });
  } catch (err) {
    console.error(`[FOUNDING_STATS] error="${err.message}"`);
    // Fallback safe : on n'affiche jamais un mauvais chiffre, on renvoie
    // l'état "fresh" (30 places dispo). Mieux que d'afficher "0 restant"
    // par erreur et de tuer la conversion.
    return res.status(200).json({
      totalPlaces: TOTAL_PLACES,
      placesTaken: 0,
      placesLeft: TOTAL_PLACES,
      locked: false,
      priceCurrent: PRICE_CURRENT,
      priceAfter: PRICE_AFTER,
      degraded: true,
    });
  }
};
