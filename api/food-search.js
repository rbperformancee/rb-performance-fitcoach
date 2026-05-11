// Vercel Serverless Function — proxy vers l'API Edamam Nutrition.
//
// Pourquoi Edamam :
// - Base de millions d'aliments : generiques, marques mondiales (US, EU, Asie),
//   produits niche, restaurants. C'est l'API qui sert MyFitnessPal-like apps.
// - Multilingue : on peut chercher en francais ("poulet roti") OU en anglais
//   ("chicken roast") et obtenir les memes resultats.
// - Free tier : 10000 requetes/mois, 10/min — largement suffisant pour une
//   app coaching qui demarre. Tier suivant 89 USD/mois pour 50000 req.
// - Multi-format : retourne en plus du parser une categorie ("Generic foods",
//   "Branded foods", "Fast foods", etc.) qu'on peut afficher pour aider l'user.
//
// Lit EDAMAM_APP_ID et EDAMAM_APP_KEY depuis les env vars Vercel (jamais
// exposees au browser).

const { secureRequest } = require("./_security");

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "https://rbperform.app");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Securite : origin + rate limit (60 requetes / heure / IP — recherche en live typing)
  if (!secureRequest(req, res, { max: 60, windowMs: 3600000 })) return;

  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) {
    return res.status(500).json({ error: "EDAMAM_APP_ID or EDAMAM_APP_KEY missing on server" });
  }

  const query = String(req.query.q || "").trim().slice(0, 100);
  if (!query || query.length < 2) return res.status(400).json({ error: "Missing or too short 'q' query param" });

  try {
    const url =
      "https://api.edamam.com/api/food-database/v2/parser" +
      "?app_id=" + encodeURIComponent(appId) +
      "&app_key=" + encodeURIComponent(appKey) +
      "&ingr=" + encodeURIComponent(query) +
      "&nutrition-type=logging";

    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Edamam error", details: data });
    }

    // Edamam renvoie :
    // - parsed[] : matches exacts pour le query (ingredient parsing)
    // - hints[]  : suggestions/alternatives, meme structure que parsed
    // On combine les deux, parsed en premier (plus pertinent).
    const allHints = [
      ...(data.parsed || []),
      ...(data.hints || []),
    ];

    // Dedup par foodId (Edamam donne le meme aliment plusieurs fois sous formes
    // differentes — generic, brand, restaurant)
    const seen = new Set();
    const foods = [];
    for (const h of allHints) {
      const food = h.food;
      if (!food || !food.foodId) continue;
      if (seen.has(food.foodId)) continue;
      seen.add(food.foodId);

      const n = food.nutrients || {};
      const calories = Math.round(n.ENERC_KCAL || 0);
      if (calories <= 0 || calories > 1000) continue;

      // Edamam fournit des "measures" : tailles de portion typiques
      // ("1 medium egg" = 50g, "1 cup" = 240g, etc.). On les expose
      // pour que le client puisse loguer "3 œufs" au lieu de "150g".
      // On garde uniquement les unités naturelles (compter) — on skip
      // les masses "Gram", "Ounce", "Kilogram" déjà couvertes par le
      // toggle grammes par défaut.
      const SKIP_LABELS = /^(gram|ounce|pound|kilogram|liter|milliliter|fluid ounce)$/i;
      const measures = (h.measures || [])
        .filter((m) => m && m.label && m.weight > 0 && !SKIP_LABELS.test(m.label))
        .slice(0, 8)
        .map((m) => ({ label: m.label, grams: Math.round(m.weight * 10) / 10 }));

      foods.push({
        name: food.label || "",
        brand: food.brand || food.category || "",
        category: food.category || "", // "Generic foods", "Branded foods", "Fast foods", "Packaged foods"
        calories,
        proteines: parseFloat((n.PROCNT || 0).toFixed(1)),
        glucides: parseFloat((n.CHOCDF || 0).toFixed(1)),
        lipides: parseFloat((n.FAT || 0).toFixed(1)),
        fibres: parseFloat((n.FIBTG || 0).toFixed(1)),
        image: food.image || null,
        measures,
      });
      if (foods.length >= 25) break;
    }

    return res.status(200).json({ foods });
  } catch (e) {
    const { captureException } = require("./_sentry");
    console.error(`[FOOD_SEARCH_FAILED] reason="${e.message || e}"`);
    await captureException(e, { tags: { endpoint: "food-search" } });
    return res.status(500).json({ error: "Proxy failure", message: String(e) });
  }
}
