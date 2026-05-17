import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

/**
 * ClientMenuCard — affiche la "journée type" envoyée par le coach
 * (table nutrition_menus). Repas → liste d'aliments bruts avec grammages.
 * Ne rend rien tant qu'aucun menu n'a été envoyé.
 */

const ORANGE = "#f97316";

export default function ClientMenuCard({ clientId }) {
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    supabase
      .from("nutrition_menus")
      .select("payload")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setMenu(data?.payload || null); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (!menu || !Array.isArray(menu.meals) || menu.meals.length === 0) return null;

  return (
    <div style={{ margin: "20px 24px 0", background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 10, color: ORANGE, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
        Menu conseillé par ton coach
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {menu.meals.map((meal, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: ORANGE, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{meal.label}</span>
              {typeof meal.calories === "number" && (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{meal.calories} kcal</span>
              )}
            </div>
            {(meal.items || []).map((it, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "rgba(255,255,255,0.85)", padding: "2px 0" }}>
                <span>• {it.food}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.5)" }}>{it.qty}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {menu.totals && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          Total : {Math.round(menu.totals.calories)} kcal · {Math.round(menu.totals.proteines)}P · {Math.round(menu.totals.glucides)}G · {Math.round(menu.totals.lipides)}L
        </div>
      )}
    </div>
  );
}
