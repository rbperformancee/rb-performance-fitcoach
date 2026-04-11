import { useState, useCallback } from "react";
import { searchLocalFoods } from "../lib/foodDatabase";

// Hook de recherche d'aliments en 3 etages :
//
// 1. Base locale CIQUAL (synchrone, instantane, ~456 aliments generiques francais)
//    -> badge vert "CIQUAL"
// 2. Edamam Nutrition API via /api/food-search (millions d'aliments generiques +
//    marques mondiales + restaurants + fast food). Multilingue.
//    -> badge bleu de la categorie ("Branded", "Generic", "Fast food", etc.)
// 3. OpenFoodFacts v2 API (3M produits de marque europeens, scan code-barre)
//    -> affichage de la marque sans badge specifique
//
// Les 3 sources sont appelees en parallele et mergees. La locale est affichee
// instantanement (sync), puis les 2 APIs s'ajoutent quand elles repondent.

export function useOpenFoodFacts() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);

    // ========== ETAGE 1 : LOCAL (synchrone, instantane) ==========
    const localResults = searchLocalFoods(query)
      .slice(0, 12)
      .map((f) => ({ ...f, _source: "local" }));
    setResults(localResults);

    // ========== ETAGE 2 et 3 : Edamam + OpenFoodFacts en parallele ==========
    const edamamPromise = fetch(`/api/food-search?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const offPromise = fetch(
      `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=15&sort_by=popularity_key&fields=product_name,brands,nutriments,nutriscore_grade`
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const [edamamData, offData] = await Promise.all([edamamPromise, offPromise]);

    // Mapping Edamam
    const edamamFoods = (edamamData?.foods || []).map((f) => ({
      name: f.name,
      brand: f.brand || "",
      category: f.category || "",
      calories: f.calories,
      proteines: f.proteines,
      glucides: f.glucides,
      lipides: f.lipides,
      fibres: f.fibres,
      image: f.image,
      _source: "edamam",
    }));

    // Mapping OpenFoodFacts v2
    const offFoods = ((offData && offData.products) || [])
      .filter((p) => p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"])
      .map((p) => ({
        name: p.product_name,
        brand: p.brands || "",
        calories: Math.round(p.nutriments["energy-kcal_100g"] || 0),
        proteines: parseFloat((p.nutriments["proteins_100g"] || 0).toFixed(1)),
        glucides: parseFloat((p.nutriments["carbohydrates_100g"] || 0).toFixed(1)),
        lipides: parseFloat((p.nutriments["fat_100g"] || 0).toFixed(1)),
        nutriscore: p.nutriscore_grade || null,
        _source: "off",
      }))
      .filter((p) => p.calories > 0 && p.calories < 1000);

    // ========== DEDUPLICATION + MERGE ==========
    // Cle de dedup : nom normalise (insensible casse + accents)
    const normalize = (s) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const seen = new Set();
    const merged = [];

    // Locale en premier (autoritative pour les aliments generiques francais)
    for (const f of localResults) {
      const key = normalize(f.name);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(f);
    }
    // Edamam ensuite (millions d'aliments generiques + marques mondiales)
    for (const f of edamamFoods) {
      const key = normalize(f.name);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(f);
    }
    // OpenFoodFacts en dernier (marques europeennes scannees code-barre)
    for (const f of offFoods) {
      const key = normalize(f.name);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(f);
    }

    // Cap a 40 resultats max pour ne pas surcharger l'UI
    setResults(merged.slice(0, 40));
    setLoading(false);
  }, []);

  const scanBarcode = useCallback(async (barcode) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        return {
          name: p.product_name,
          brand: p.brands || "",
          calories: Math.round(p.nutriments?.["energy-kcal_100g"] || 0),
          proteines: parseFloat((p.nutriments?.["proteins_100g"] || 0).toFixed(1)),
          glucides: parseFloat((p.nutriments?.["carbohydrates_100g"] || 0).toFixed(1)),
          lipides: parseFloat((p.nutriments?.["fat_100g"] || 0).toFixed(1)),
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  return { results, loading, search, scanBarcode };
}
