import { useState, useCallback } from "react";
import { searchLocalFoods } from "../lib/foodDatabase";

export function useOpenFoodFacts() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setLoading(true);

    // Strategie : on lance la base LOCALE en synchrone (instantane) et l'appel
    // OpenFoodFacts en parallele. On affiche les resultats locaux immediatement,
    // puis on append les produits de marque OFF quand ils arrivent.
    // Comme ca l'utilisateur voit "poulet", "riz", "pomme" instantanement, sans
    // attendre OFF qui peut etre lent ou indisponible.
    const localResults = searchLocalFoods(query).slice(0, 12).map((f) => ({
      ...f,
      _source: "local",
    }));
    setResults(localResults);

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,serving_size,brands`
      );
      const data = await res.json();
      const offProducts = (data.products || [])
        .filter((p) => p.product_name && p.nutriments)
        .map((p) => ({
          name: p.product_name,
          brand: p.brands || "",
          calories: Math.round(p.nutriments["energy-kcal_100g"] || 0),
          proteines: parseFloat((p.nutriments["proteins_100g"] || 0).toFixed(1)),
          glucides: parseFloat((p.nutriments["carbohydrates_100g"] || 0).toFixed(1)),
          lipides: parseFloat((p.nutriments["fat_100g"] || 0).toFixed(1)),
          _source: "off",
        }))
        .filter((p) => p.calories > 0);

      // Deduplication grossiere : si un produit OFF a un nom qui matche un local
      // (cas "Riz basmati" trouve dans les deux), on garde le local.
      const localNames = new Set(localResults.map((r) => r.name.toLowerCase()));
      const filteredOff = offProducts.filter((p) => !localNames.has(p.name.toLowerCase()));

      // Locale en premier (toujours), puis OFF derriere.
      setResults([...localResults, ...filteredOff]);
    } catch (e) {
      console.error("OpenFoodFacts error:", e);
      // Si OFF echoue, on garde les resultats locaux deja affiches.
    }
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
    } catch { return null; }
  }, []);

  return { results, loading, search, scanBarcode };
}
