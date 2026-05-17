import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

/**
 * ClientMenuCard — affiche le "menu conseillé" envoyé par le coach
 * (table nutrition_menus, généré côté coach via MenuGenerator).
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
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: "rgba(255,255,255,0.05)",
              backgroundImage: meal.photo_url ? `url(${meal.photo_url})` : "none",
              backgroundSize: "cover", backgroundPosition: "center",
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: ORANGE, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{meal.label}</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {meal.title}{meal.portions && meal.portions !== 1 ? ` · ×${meal.portions}` : ""}
              </div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
              {meal.calories} kcal
            </div>
          </div>
        ))}
      </div>
      {menu.totals && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          Total : {menu.totals.calories} kcal · {menu.totals.proteines}P · {menu.totals.glucides}G · {menu.totals.lipides}L
        </div>
      )}
    </div>
  );
}
