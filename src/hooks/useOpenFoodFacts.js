import { useState, useCallback } from "react";

export function useOpenFoodFacts() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&country=france&page_size=8&fields=product_name,nutriments,serving_size,brands`
      );
      const data = await res.json();
      const products = (data.products || [])
        .filter(p => p.product_name && p.nutriments)
        .map(p => ({
          name: p.product_name,
          brand: p.brands || "",
          calories: Math.round(p.nutriments["energy-kcal_100g"] || 0),
          proteines: parseFloat((p.nutriments["proteins_100g"] || 0).toFixed(1)),
          glucides: parseFloat((p.nutriments["carbohydrates_100g"] || 0).toFixed(1)),
          lipides: parseFloat((p.nutriments["fat_100g"] || 0).toFixed(1)),
        }))
        .filter(p => p.calories > 0);
      setResults(products);
    } catch (e) {
      console.error("OpenFoodFacts error:", e);
      setResults([]);
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
