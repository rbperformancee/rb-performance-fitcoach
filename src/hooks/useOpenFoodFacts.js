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
      // OpenFoodFacts v2 API : plus rapide et plus precise que cgi/search.pl,
      // tri par popularite (produits les plus scannes en premier).
      // sort_by=popularity_key garantit qu'on ait les marques connues en premier.
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=20&sort_by=popularity_key&fields=product_name,brands,nutriments,nutriscore_grade`
      );
      const data = await res.json();
      const offProducts = (data.products || [])
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
        .filter((p) => p.calories > 0 && p.calories < 1000); // sanity check

      // Deduplication grossiere : si un produit OFF a un nom qui matche un local
      // (cas "Riz basmati" trouve dans les deux), on garde le local.
      const localNames = new Set(localResults.map((r) => r.name.toLowerCase()));
      const filteredOff = offProducts.filter((p) => !localNames.has(p.name.toLowerCase()));

      // Locale en premier (toujours), puis OFF derriere, capped a 30 total
      // pour eviter de surcharger l'UI.
      setResults([...localResults, ...filteredOff].slice(0, 30));
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
