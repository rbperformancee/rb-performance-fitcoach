import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";

/**
 * MenuGenerator — propose une journée de menus type composée depuis la
 * bibliothèque de recettes du coach (+ recettes globales), répartie sur
 * le nombre de repas choisi, calée sur des macros cibles.
 *
 * Autonome, non destructif : génère une proposition à l'écran (le coach
 * ajuste les macros cibles + le nombre de repas, régénère à volonté).
 * v1 : pas de persistance — c'est un outil d'aide à la composition.
 */

const ORANGE = "#f97316";

// Répartition calorique par repas selon le nombre de repas / jour.
const MEAL_PLANS = {
  3: [
    { type: "petit-dejeuner", label: "Petit-déjeuner", pct: 0.28 },
    { type: "dejeuner", label: "Déjeuner", pct: 0.38 },
    { type: "diner", label: "Dîner", pct: 0.34 },
  ],
  4: [
    { type: "petit-dejeuner", label: "Petit-déjeuner", pct: 0.25 },
    { type: "dejeuner", label: "Déjeuner", pct: 0.33 },
    { type: "collation", label: "Collation", pct: 0.12 },
    { type: "diner", label: "Dîner", pct: 0.30 },
  ],
  5: [
    { type: "petit-dejeuner", label: "Petit-déjeuner", pct: 0.22 },
    { type: "collation", label: "Collation matin", pct: 0.11 },
    { type: "dejeuner", label: "Déjeuner", pct: 0.30 },
    { type: "collation", label: "Collation après-midi", pct: 0.11 },
    { type: "diner", label: "Dîner", pct: 0.26 },
  ],
};

const round = (n, step = 1) => Math.round(n / step) * step;
const m = (r) => r?.macros_per_serving || {};

// Choisit une recette pour un créneau + un nombre de portions calé sur les
// kcal visées. Un peu d'aléatoire pour varier à chaque régénération.
function pickForSlot(slot, targetKcal, recipes) {
  let candidates = recipes.filter((r) => (r.meal_types || []).includes(slot.type));
  // Collation : peu de recettes dédiées → fallback sur les recettes légères.
  if (candidates.length === 0 && slot.type === "collation") {
    candidates = [...recipes].sort((a, b) => (m(a).calories || 0) - (m(b).calories || 0)).slice(0, 6);
  }
  if (candidates.length === 0) candidates = recipes;
  if (candidates.length === 0) return null;

  // Trie par proximité de calories (1 portion) puis pioche dans le top 4.
  const ranked = [...candidates].sort(
    (a, b) => Math.abs((m(a).calories || 0) - targetKcal) - Math.abs((m(b).calories || 0) - targetKcal),
  );
  const pool = ranked.slice(0, Math.min(4, ranked.length));
  const recipe = pool[Math.floor(Math.random() * pool.length)];

  const kcal = m(recipe).calories || 0;
  let portions = kcal > 0 ? targetKcal / kcal : 1;
  portions = Math.min(3, Math.max(0.5, round(portions, 0.25)));
  return { slot, recipe, portions };
}

function generate(target, mealsCount, recipes) {
  const plan = MEAL_PLANS[mealsCount] || MEAL_PLANS[3];
  return plan.map((slot) => pickForSlot(slot, Math.round(target.calories * slot.pct), recipes)).filter(Boolean);
}

export default function MenuGenerator({ clientId }) {
  const [open, setOpen] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [target, setTarget] = useState({ calories: 2000, proteines: 150, glucides: 250, lipides: 70 });
  const [meals, setMeals] = useState(4);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [recRes, goalRes] = await Promise.all([
      supabase.from("recipes").select("id,title,photo_url,meal_types,macros_per_serving,servings")
        .is("deleted_at", null).not("published_at", "is", null),
      supabase.from("nutrition_goals").select("calories,proteines,glucides,lipides").eq("client_id", clientId).maybeSingle(),
    ]);
    setRecipes((recRes.data || []).filter((r) => (m(r).calories || 0) > 0));
    if (goalRes.data) {
      setTarget({
        calories: goalRes.data.calories || 2000,
        proteines: goalRes.data.proteines || 150,
        glucides: goalRes.data.glucides || 250,
        lipides: goalRes.data.lipides || 70,
      });
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { if (open) loadData(); }, [open, loadData]);

  function run() {
    setMenu(generate(target, meals, recipes));
    setSent(false);
  }

  // Enregistre le menu généré → visible par l'athlète dans sa page Fuel.
  async function sendToClient() {
    if (!menu || sending) return;
    setSending(true);
    const payload = {
      meals: menu.map((it) => {
        const mm = m(it.recipe);
        return {
          label: it.slot.label,
          recipe_id: it.recipe.id,
          title: it.recipe.title,
          photo_url: it.recipe.photo_url || null,
          portions: it.portions,
          calories: Math.round((mm.calories || 0) * it.portions),
          proteines: Math.round((mm.proteines || 0) * it.portions),
          glucides: Math.round((mm.glucides || 0) * it.portions),
          lipides: Math.round((mm.lipides || 0) * it.portions),
        };
      }),
      target,
      totals: {
        calories: Math.round(totals.calories), proteines: Math.round(totals.proteines),
        glucides: Math.round(totals.glucides), lipides: Math.round(totals.lipides),
      },
      meals_count: meals,
      generated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("nutrition_menus").upsert(
      { client_id: clientId, payload, updated_at: new Date().toISOString() },
      { onConflict: "client_id" },
    );
    setSending(false);
    if (!error) setSent(true);
  }

  // Totaux du menu généré.
  const totals = (menu || []).reduce((acc, it) => {
    const mm = m(it.recipe);
    return {
      calories: acc.calories + (mm.calories || 0) * it.portions,
      proteines: acc.proteines + (mm.proteines || 0) * it.portions,
      glucides: acc.glucides + (mm.glucides || 0) * it.portions,
      lipides: acc.lipides + (mm.lipides || 0) * it.portions,
    };
  }, { calories: 0, proteines: 0, glucides: 0, lipides: 0 });

  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, marginTop: 16 };

  if (!open) {
    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Menu type</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Compose une journée de repas depuis tes recettes.
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{ flexShrink: 0, background: "rgba(249,115,22,0.12)", border: `1px solid ${ORANGE}40`, borderRadius: 8, padding: "8px 14px", color: ORANGE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >Générer un menu</button>
        </div>
      </div>
    );
  }

  const numInp = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 9px", color: "#fff", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none" };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Menu type</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>×</button>
      </div>

      {/* Macros cibles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        {[
          { k: "calories", l: "kcal" }, { k: "proteines", l: "P" },
          { k: "glucides", l: "G" }, { k: "lipides", l: "L" },
        ].map(({ k, l }) => (
          <div key={k}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 3, textTransform: "uppercase" }}>{l}</div>
            <input
              value={target[k]} inputMode="numeric"
              onChange={(e) => setTarget((p) => ({ ...p, [k]: Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0) }))}
              style={numInp}
            />
          </div>
        ))}
      </div>

      {/* Nombre de repas */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Repas / jour :</span>
        {[3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setMeals(n)}
            style={{
              width: 34, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: meals === n ? "rgba(249,115,22,0.16)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${meals === n ? ORANGE + "55" : "rgba(255,255,255,0.08)"}`,
              color: meals === n ? ORANGE : "rgba(255,255,255,0.5)", fontFamily: "inherit",
            }}
          >{n}</button>
        ))}
        <button
          onClick={run}
          disabled={loading || recipes.length === 0}
          style={{ marginLeft: "auto", background: ORANGE, border: "none", borderRadius: 8, padding: "8px 16px", color: "#000", fontSize: 12, fontWeight: 800, cursor: loading ? "wait" : "pointer" }}
        >{menu ? "Régénérer" : "Générer"}</button>
      </div>

      {loading && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Chargement des recettes…</div>}
      {!loading && recipes.length === 0 && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Aucune recette publiée — ajoute des recettes à ta bibliothèque d'abord.</div>
      )}

      {/* Menu généré */}
      {menu && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {menu.map((it, i) => {
            const mm = m(it.recipe);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 10 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 8, flexShrink: 0, background: "rgba(255,255,255,0.05)",
                  backgroundImage: it.recipe.photo_url ? `url(${it.recipe.photo_url})` : "none",
                  backgroundSize: "cover", backgroundPosition: "center",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: ORANGE, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{it.slot.label}</div>
                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.recipe.title}{it.portions !== 1 ? ` · ×${it.portions}` : ""}
                  </div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.55)", flexShrink: 0, textAlign: "right" }}>
                  {Math.round((mm.calories || 0) * it.portions)} kcal
                </div>
              </div>
            );
          })}

          {/* Totaux vs cible */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 6, padding: "10px 0 2px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { k: "calories", l: "kcal" }, { k: "proteines", l: "P" },
              { k: "glucides", l: "G" }, { k: "lipides", l: "L" },
            ].map(({ k, l }) => {
              const got = Math.round(totals[k]);
              const goal = target[k] || 0;
              const off = goal > 0 ? Math.abs(got - goal) / goal : 0;
              return (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: off <= 0.12 ? "#34d399" : off <= 0.25 ? ORANGE : "#ef4444" }}>{got}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>/ {goal}</div>
                </div>
              );
            })}
          </div>

          <button
            onClick={sendToClient}
            disabled={sending || sent}
            style={{
              width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 9, border: "none",
              background: sent ? "rgba(52,211,153,0.15)" : ORANGE,
              color: sent ? "#34d399" : "#000",
              fontSize: 12, fontWeight: 800, cursor: sending || sent ? "default" : "pointer", fontFamily: "inherit",
            }}
          >
            {sent ? "✓ Envoyé à l'athlète" : sending ? "Envoi…" : "Envoyer à l'athlète"}
          </button>
        </div>
      )}
    </div>
  );
}
