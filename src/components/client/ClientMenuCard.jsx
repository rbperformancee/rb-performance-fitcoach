import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

/**
 * ClientMenuCard — affiche la "journée type" envoyée par le coach
 * (table nutrition_menus). Repli par défaut : un bandeau "Voir le menu"
 * qui se déroule au clic sur la liste complète des repas.
 * Ne rend rien tant qu'aucun menu n'a été envoyé.
 */

const ORANGE = "#f97316";

export default function ClientMenuCard({ clientId }) {
  const [menu, setMenu] = useState(null);
  const [expanded, setExpanded] = useState(false);

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

  const meals = menu.meals;
  const kcal = menu.totals
    ? Math.round(menu.totals.calories)
    : meals.reduce((s, m) => s + (m.calories || 0), 0);

  return (
    <div style={{ margin: "20px 24px 0", background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 14, overflow: "hidden" }}>
      <style>{`
        @keyframes menuUnroll { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* En-tête cliquable */}
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: 16, background: "none", border: "none", cursor: "pointer",
          textAlign: "left", fontFamily: "inherit",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: ORANGE, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
            Menu conseillé par ton coach
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
            {expanded
              ? "Masquer le menu"
              : `${meals.length} repas · ${kcal} kcal — voir le menu`}
          </div>
        </div>
        <div style={{
          width: 28, height: 28, flexShrink: 0, borderRadius: "50%",
          background: "rgba(249,115,22,0.12)", border: `1px solid ${ORANGE}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Aperçu replié — noms des repas */}
      {!expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {meals.map((meal, i) => (
            <span key={i} style={{
              fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {meal.label}
            </span>
          ))}
        </div>
      )}

      {/* Menu déroulé */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", animation: "menuUnroll .25s ease both" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meals.map((meal, i) => (
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
      )}
    </div>
  );
}
