import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";

/**
 * MenuGenerator — compose une "journée type" : des aliments bruts avec
 * grammages, répartis par repas, calés sur des macros cibles. Format
 * coach classique (cf. plan nutritionnel RB Performance) — PAS des recettes.
 *
 * Chaque repas suit un MODÈLE cohérent (combinaison d'aliments qui vont
 * vraiment ensemble — ex. porridge, ou œufs + pain) ; les grammages sont
 * calculés pour tomber sur les macros du repas.
 */

const ORANGE = "#f97316";

// Répartition des macros par repas selon le nombre de repas / jour.
const MEAL_PLANS = {
  3: [
    { type: "petit-dejeuner", label: "Petit déjeuner", pct: 0.28 },
    { type: "dejeuner", label: "Déjeuner", pct: 0.38 },
    { type: "diner", label: "Dîner", pct: 0.34 },
  ],
  4: [
    { type: "petit-dejeuner", label: "Petit déjeuner", pct: 0.25 },
    { type: "dejeuner", label: "Déjeuner", pct: 0.33 },
    { type: "collation", label: "Collation", pct: 0.12 },
    { type: "diner", label: "Dîner", pct: 0.30 },
  ],
  5: [
    { type: "petit-dejeuner", label: "Petit déjeuner", pct: 0.22 },
    { type: "collation", label: "Collation matin", pct: 0.11 },
    { type: "dejeuner", label: "Déjeuner", pct: 0.30 },
    { type: "collation", label: "Collation après-midi", pct: 0.11 },
    { type: "diner", label: "Dîner", pct: 0.26 },
  ],
};

// Base d'aliments bruts — macros pour 100 g (valeurs standard).
const FOOD_DB = {
  "Blanc de poulet": { kcal: 165, p: 31, g: 0, l: 3.6 },
  "Steak haché 5% MG": { kcal: 137, p: 21, g: 0, l: 5 },
  "Filet de dinde": { kcal: 150, p: 29, g: 0, l: 3 },
  "Cabillaud": { kcal: 82, p: 18, g: 0, l: 0.7 },
  "Saumon": { kcal: 200, p: 22, g: 0, l: 13 },
  "Œufs entiers": { kcal: 143, p: 13, g: 0.7, l: 9.5, unit: "œuf", unitG: 55 },
  "Skyr": { kcal: 63, p: 11, g: 4, l: 0.2 },
  "Fromage blanc 0%": { kcal: 47, p: 8, g: 4, l: 0.2 },
  "Whey protéine": { kcal: 380, p: 80, g: 8, l: 6 },
  "Riz basmati cru": { kcal: 350, p: 7, g: 78, l: 0.6 },
  "Pâtes complètes crues": { kcal: 350, p: 13, g: 65, l: 2.5 },
  "Patate douce": { kcal: 86, p: 1.6, g: 20, l: 0.1 },
  "Pomme de terre": { kcal: 80, p: 2, g: 17, l: 0.1 },
  "Flocons d'avoine": { kcal: 370, p: 13, g: 60, l: 7 },
  "Pain complet": { kcal: 250, p: 9, g: 45, l: 3 },
  "Banane": { kcal: 90, p: 1.1, g: 23, l: 0.3, unit: "banane", unitG: 120 },
  "Huile d'olive": { kcal: 900, p: 0, g: 0, l: 100 },
  "Amandes": { kcal: 600, p: 21, g: 22, l: 50 },
  "Beurre de cacahuète": { kcal: 600, p: 25, g: 20, l: 50 },
  "Légumes verts": { kcal: 30, p: 2, g: 5, l: 0.3 },
};

// Modèles de repas COHÉRENTS — combinaisons d'aliments qui vont vraiment
// ensemble (jamais de whey avec du pain, jamais de pain "nature" seul :
// le pain n'apparaît qu'avec des œufs). Chaque rôle propose des variantes
// pour la diversité ; les grammages sont calés sur les macros du repas.
const MEAL_TEMPLATES = {
  "petit-dejeuner": [
    // Porridge : laitage/whey + flocons + fruit + oléagineux
    { protein: ["Whey protéine", "Skyr", "Fromage blanc 0%"], carb: ["Flocons d'avoine"], extra: "Banane", fat: ["Beurre de cacahuète", "Amandes"] },
    // Salé : œufs + pain (le pain a enfin de quoi l'accompagner)
    { protein: ["Œufs entiers"], carb: ["Pain complet"], fat: ["Beurre de cacahuète"] },
  ],
  "collation": [
    { protein: ["Skyr", "Fromage blanc 0%"], extra: "Banane", fat: ["Amandes", "Beurre de cacahuète"] },
    { protein: ["Whey protéine"], carb: ["Flocons d'avoine"], extra: "Banane" },
  ],
  "dejeuner": [
    { protein: ["Blanc de poulet", "Filet de dinde", "Steak haché 5% MG"], carb: ["Riz basmati cru", "Pâtes complètes crues", "Patate douce", "Pomme de terre"], veg: true, fat: ["Huile d'olive"] },
  ],
  "diner": [
    { protein: ["Cabillaud", "Saumon", "Blanc de poulet", "Filet de dinde"], carb: ["Riz basmati cru", "Patate douce", "Pomme de terre"], veg: true, fat: ["Huile d'olive"] },
  ],
};

const r5 = (n) => Math.max(0, Math.round(n / 5) * 5);
const num = (v) => Math.max(0, parseInt(String(v).replace(/[^0-9]/g, "")) || 0);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Construit un repas COHÉRENT calé sur la cible macro `mt` (kcal/p/g/l)
// à partir d'un modèle de repas (combinaison d'aliments réaliste).
//
// IMPORTANT : chaque aliment est calé sur la macro RESTANTE, pas sur la
// cible brute — sinon les protéines du riz/avoine/légumes s'ajoutent par
// dessus la source de protéines et le total explose. Ordre de calage :
// légumes & fruit (fixes) → glucides → protéines → lipides ; la source de
// protéines comble donc le déficit réel, le total respecte la cible.
function buildMeal(slot, mt) {
  const acc = { calories: 0, proteines: 0, glucides: 0, lipides: 0 };
  const slots = {}; // role -> { food, qty }
  const place = (role, name, grams, qty) => {
    const food = FOOD_DB[name];
    const f = grams / 100;
    acc.calories += food.kcal * f;
    acc.proteines += food.p * f;
    acc.glucides += food.g * f;
    acc.lipides += food.l * f;
    slots[role] = { food: name, qty };
  };

  const tpl = pick(MEAL_TEMPLATES[slot.type] || MEAL_TEMPLATES["dejeuner"]);

  // 1. Légumes (repas principaux) — portion fixe
  if (tpl.veg) place("veg", "Légumes verts", 150, "150 g");

  // 2. Fruit — portion fixe en unité
  if (tpl.extra) {
    const ef = FOOD_DB[tpl.extra];
    place("extra", tpl.extra, ef.unitG, `1 ${ef.unit}`);
  }

  // 3. Glucides — comble les glucides restants
  if (tpl.carb) {
    const cName = pick(tpl.carb);
    const cf = FOOD_DB[cName];
    const remG = mt.g - acc.glucides;
    const cGrams = cf.g > 0 ? Math.max(20, r5(remG / (cf.g / 100))) : 40;
    place("carb", cName, cGrams, `${cGrams} g`);
  }

  // 4. Protéines — comble les protéines restantes (après légumes/fruit/glucides)
  {
    const pName = pick(tpl.protein);
    const pf = FOOD_DB[pName];
    const remP = mt.p - acc.proteines;
    const pGrams = pf.p > 0 ? r5(remP / (pf.p / 100)) : 100;
    if (pf.unit) {
      const u = Math.max(1, Math.round(pGrams / pf.unitG));
      place("protein", pName, u * pf.unitG, `${u} ${pf.unit}${u > 1 ? "s" : ""} entier${u > 1 ? "s" : ""}`);
    } else {
      const g = Math.max(20, pGrams);
      place("protein", pName, g, `${g} g`);
    }
  }

  // 5. Lipides — comble les lipides restants
  if (tpl.fat) {
    const remFat = mt.l - acc.lipides;
    if (remFat > 3) {
      const fName = pick(tpl.fat);
      const ff = FOOD_DB[fName];
      let fGrams = ff.l > 0 ? Math.round(remFat / (ff.l / 100)) : 10;
      fGrams = Math.max(5, Math.min(50, fGrams));
      place("fat", fName, fGrams, `${fGrams} g`);
    }
  }

  // Affichage : protéine → glucide → fruit → lipide → légumes
  const items = ["protein", "carb", "extra", "fat", "veg"]
    .filter((r) => slots[r])
    .map((r) => slots[r]);

  return {
    label: slot.label,
    items,
    calories: Math.round(acc.calories),
    proteines: Math.round(acc.proteines),
    glucides: Math.round(acc.glucides),
    lipides: Math.round(acc.lipides),
  };
}

function generateMenu(target, mealsCount) {
  const plan = MEAL_PLANS[mealsCount] || MEAL_PLANS[3];
  return plan.map((slot) => buildMeal(slot, {
    kcal: target.calories * slot.pct,
    p: target.proteines * slot.pct,
    g: target.glucides * slot.pct,
    l: target.lipides * slot.pct,
  }));
}

export default function MenuGenerator({ clientId }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState({ calories: 2000, proteines: 150, glucides: 250, lipides: 70 });
  const [meals, setMeals] = useState(4);
  const [menu, setMenu] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const loadGoals = useCallback(async () => {
    const { data } = await supabase.from("nutrition_goals")
      .select("calories,proteines,glucides,lipides").eq("client_id", clientId).maybeSingle();
    if (data) {
      setTarget({
        calories: data.calories || 2000, proteines: data.proteines || 150,
        glucides: data.glucides || 250, lipides: data.lipides || 70,
      });
    }
  }, [clientId]);
  useEffect(() => { if (open) loadGoals(); }, [open, loadGoals]);

  function run() {
    setMenu(generateMenu(target, meals));
    setSent(false);
  }

  const totals = (menu || []).reduce((a, m) => ({
    calories: a.calories + m.calories, proteines: a.proteines + m.proteines,
    glucides: a.glucides + m.glucides, lipides: a.lipides + m.lipides,
  }), { calories: 0, proteines: 0, glucides: 0, lipides: 0 });

  async function sendToClient() {
    if (!menu || sending) return;
    setSending(true);
    const payload = { meals: menu, target, totals, meals_count: meals, generated_at: new Date().toISOString() };
    const { error } = await supabase.from("nutrition_menus").upsert(
      { client_id: clientId, payload, updated_at: new Date().toISOString() },
      { onConflict: "client_id" },
    );
    setSending(false);
    if (!error) setSent(true);
  }

  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, marginTop: 16 };
  const numInp = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 9px", color: "#fff", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none" };

  if (!open) {
    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Menu type</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Une journée type d'aliments avec grammages, calée sur les macros.
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
            <input value={target[k]} inputMode="numeric"
              onChange={(e) => setTarget((p) => ({ ...p, [k]: num(e.target.value) }))} style={numInp} />
          </div>
        ))}
      </div>

      {/* Nombre de repas */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Repas / jour :</span>
        {[3, 4, 5].map((n) => (
          <button key={n} onClick={() => setMeals(n)}
            style={{
              width: 34, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: meals === n ? "rgba(249,115,22,0.16)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${meals === n ? ORANGE + "55" : "rgba(255,255,255,0.08)"}`,
              color: meals === n ? ORANGE : "rgba(255,255,255,0.5)", fontFamily: "inherit",
            }}>{n}</button>
        ))}
        <button onClick={run}
          style={{ marginLeft: "auto", background: ORANGE, border: "none", borderRadius: 8, padding: "8px 16px", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
        >{menu ? "Régénérer" : "Générer"}</button>
      </div>

      {/* Menu généré */}
      {menu && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {menu.map((meal, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: ORANGE, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{meal.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{meal.calories} kcal</span>
              </div>
              {meal.items.map((it, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "rgba(255,255,255,0.85)", padding: "2px 0" }}>
                  <span>• {it.food}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.5)" }}>{it.qty}</span>
                </div>
              ))}
            </div>
          ))}

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
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: off <= 0.12 ? "#34d399" : off <= 0.25 ? ORANGE : "#ef4444" }}>{got}</div>
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
