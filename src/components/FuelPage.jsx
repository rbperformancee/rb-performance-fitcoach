import React, { useState, useCallback, useEffect, useRef } from "react";
import { useFuel } from "../hooks/useFuel";
import { useOpenFoodFacts } from "../hooks/useOpenFoodFacts";

const GREEN = "#02d1ba";
const ORANGE = "#f97316";
const BLUE = "#60a5fa";
const PURPLE = "#a78bfa";

const REPAS = ["Petit-dejeuner", "Dejeuner", "Collation", "Diner"];

const MacroBar = ({ value, goal, color, label, unit = "g" }) => {
  const pct = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{Math.round(value)}<span style={{ color: "rgba(255,255,255,0.2)" }}>/{goal}{unit}</span></div>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
};

const ScoreRing = ({ score }) => {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? GREEN : score >= 50 ? ORANGE : "#ef4444";
  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: "absolute", inset: 0 }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 200, color, letterSpacing: "-1px" }}>{score}</div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>SCORE</div>
      </div>
    </div>
  );
};

export default function FuelPage({ client }) {
  const { goals, logs, dailyTracking, loading, totals, addFood, removeFood, updateTracking, score } = useFuel(client?.id);
  const { results, loading: searching, search } = useOpenFoodFacts();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRepas, setSelectedRepas] = useState("Dejeuner");
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantite, setQuantite] = useState(100);
  const [showWater, setShowWater] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [tempWater, setTempWater] = useState(0);
  const [tempSleep, setTempSleep] = useState(0);
  const searchTimeout = useRef(null);

  const handleSearch = useCallback((q) => {
    setQuery(q);
    setSelectedFood(null);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => search(q), 400);
  }, [search]);

  const handleAddFood = async () => {
    if (!selectedFood) return;
    const factor = quantite / 100;
    await addFood({
      repas: selectedRepas,
      aliment: selectedFood.name,
      calories: Math.round(selectedFood.calories * factor),
      proteines: parseFloat((selectedFood.proteines * factor).toFixed(1)),
      glucides: parseFloat((selectedFood.glucides * factor).toFixed(1)),
      lipides: parseFloat((selectedFood.lipides * factor).toFixed(1)),
      quantite_g: quantite,
    });
    setShowAdd(false);
    setQuery("");
    setSelectedFood(null);
    setQuantite(100);
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
  };

  const getScorePhrase = () => {
    if (score >= 85) return "Journee parfaite. Tu es en mode champion.";
    if (score >= 65) return "Bonne journee. Encore un effort sur les proteines.";
    if (score >= 40) return "Tu peux mieux faire. Hydrate-toi et mange tes macros.";
    return "Journee difficile. Rattrape-toi sur le reste de la journee.";
  };

  const logsByRepas = REPAS.reduce((acc, r) => {
    acc[r] = logs.filter(l => l.repas === r);
    return acc;
  }, {});

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", padding: "16px 24px" }}>
      {[80, 180, 120, 100].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 16 }} />
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: 100, opacity: loading ? 0 : 1, transition: "opacity 0.4s ease" }}>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 40% 0%, rgba(249,115,22,0.09) 0%, transparent 55%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}
        <div style={{ padding: "8px 24px 0" }}>
          <div style={{ fontSize: 10, color: "rgba(249,115,22,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>Nutrition</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>Fuel<span style={{ color: ORANGE }}>.</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        {/* SCORE ENERGIE */}
        <div style={{ margin: "0 24px 20px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 22, padding: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ScoreRing score={score} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>Score energie</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontStyle: "italic" }}>"{getScorePhrase()}"</div>
            </div>
          </div>
        </div>

        {/* MACROS */}
        <div style={{ margin: "0 24px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>Calories</div>
              <div style={{ fontSize: 38, fontWeight: 100, color: "#fff", letterSpacing: "-2px" }}>
                {totals.calories}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>/{goals?.calories || 2000} kcal</span>
              </div>
            </div>
            <div style={{ background: totals.calories > (goals?.calories || 2000) ? "rgba(239,68,68,0.1)" : "rgba(2,209,186,0.1)", border: `1px solid ${totals.calories > (goals?.calories || 2000) ? "rgba(239,68,68,0.3)" : "rgba(2,209,186,0.2)"}`, borderRadius: 100, padding: "4px 12px", fontSize: 11, color: totals.calories > (goals?.calories || 2000) ? "#ef4444" : GREEN, fontWeight: 600 }}>
              {totals.calories > (goals?.calories || 2000) ? `+${totals.calories - (goals?.calories || 2000)} kcal` : `${(goals?.calories || 2000) - totals.calories} restantes`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <MacroBar value={totals.proteines} goal={goals?.proteines || 150} color={GREEN} label="Proteines" />
            <MacroBar value={totals.glucides} goal={goals?.glucides || 250} color={ORANGE} label="Glucides" />
            <MacroBar value={totals.lipides} goal={goals?.lipides || 70} color={BLUE} label="Lipides" />
          </div>
        </div>

        {/* EAU + SOMMEIL */}
        <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {/* Eau */}
          <div onClick={() => setShowWater(true)} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 18, padding: 16, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" style={{ width: 22, height: 22, marginBottom: 8 }}><path d="M12 2C6.48 2 2 8 2 13a10 10 0 0020 0c0-5-4.48-11-10-11z" /></svg>
            <div style={{ fontSize: 24, fontWeight: 200, color: BLUE, letterSpacing: "-1px" }}>
              {((dailyTracking?.eau_ml || 0) / 1000).toFixed(1)}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>L</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 4 }}>Hydratation</div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, marginTop: 8 }}>
              <div style={{ height: "100%", width: Math.min(Math.round(((dailyTracking?.eau_ml || 0) / (goals?.eau_ml || 2500)) * 100), 100) + "%", background: BLUE, borderRadius: 1 }} />
            </div>
          </div>
          {/* Sommeil */}
          <div onClick={() => setShowSleep(true)} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 18, padding: 16, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" style={{ width: 22, height: 22, marginBottom: 8 }}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            <div style={{ fontSize: 24, fontWeight: 200, color: PURPLE, letterSpacing: "-1px" }}>
              {dailyTracking?.sommeil_h || 0}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>h</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 4 }}>Sommeil</div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, marginTop: 8 }}>
              <div style={{ height: "100%", width: Math.min(Math.round(((dailyTracking?.sommeil_h || 0) / 8) * 100), 100) + "%", background: PURPLE, borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 24px 20px" }} />

        {/* REPAS PAR CATEGORIE */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase" }}>Mes repas</div>
            <button onClick={() => setShowAdd(true)} style={{ background: GREEN, color: "#000", border: "none", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Ajouter</button>
          </div>

          {REPAS.map(repas => (
            <div key={repas} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{repas}</div>
              {logsByRepas[repas].length === 0 ? (
                <div onClick={() => { setSelectedRepas(repas); setShowAdd(true); }} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 12, color: "rgba(255,255,255,0.15)", cursor: "pointer", textAlign: "center" }}>
                  + Ajouter un aliment
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {logsByRepas[repas].map(log => (
                    <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{log.aliment}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{log.quantite_g}g · P:{log.proteines}g · G:{log.glucides}g · L:{log.lipides}g</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ORANGE, flexShrink: 0 }}>{log.calories} kcal</div>
                      <button onClick={() => removeFood(log.id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, width: 28, height: 28, color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                  <div onClick={() => { setSelectedRepas(repas); setShowAdd(true); }} style={{ padding: "10px 14px", background: "transparent", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer", textAlign: "center" }}>
                    + Ajouter
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* MODAL AJOUT ALIMENT */}
      {showAdd && (
        <div onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setQuery(""); setSelectedFood(null); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Ajouter un aliment</div>
              <button onClick={() => { setShowAdd(false); setQuery(""); setSelectedFood(null); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 100, width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer" }}>×</button>
            </div>

            {/* Repas selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
              {REPAS.map(r => (
                <button key={r} onClick={() => setSelectedRepas(r)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 100, border: `1px solid ${selectedRepas === r ? GREEN : "rgba(255,255,255,0.1)"}`, background: selectedRepas === r ? `rgba(2,209,186,0.1)` : "transparent", color: selectedRepas === r ? GREEN : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{r}</button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Rechercher un aliment..."
              autoFocus
              style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 15, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box" }}
            />

            {/* Results */}
            {searching && <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Recherche...</div>}
            {!searching && results.length > 0 && !selectedFood && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map((food, i) => (
                  <div key={i} onClick={() => setSelectedFood(food)} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, cursor: "pointer" }}>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{food.name}</div>
                    {food.brand && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{food.brand}</div>}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                      {food.calories} kcal · P:{food.proteines}g · G:{food.glucides}g · L:{food.lipides}g (pour 100g)
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected food + quantite */}
            {selectedFood && (
              <div style={{ marginTop: 16 }}>
                <div style={{ padding: "14px 16px", background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{selectedFood.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    {Math.round(selectedFood.calories * quantite / 100)} kcal · P:{(selectedFood.proteines * quantite / 100).toFixed(1)}g · G:{(selectedFood.glucides * quantite / 100).toFixed(1)}g · L:{(selectedFood.lipides * quantite / 100).toFixed(1)}g
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Quantite (grammes)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => setQuantite(Math.max(10, quantite - 10))} style={{ width: 40, height: 40, borderRadius: 100, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#fff", fontSize: 20, cursor: "pointer" }}>-</button>
                    <input type="number" value={quantite} onChange={e => setQuantite(parseInt(e.target.value) || 100)} style={{ flex: 1, textAlign: "center", padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif" }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>g</span>
                    <button onClick={() => setQuantite(quantite + 10)} style={{ width: 40, height: 40, borderRadius: 100, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#fff", fontSize: 20, cursor: "pointer" }}>+</button>
                  </div>
                </div>
                <button onClick={handleAddFood} style={{ width: "100%", padding: 16, background: GREEN, color: "#000", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  Ajouter au {selectedRepas}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EAU */}
      {showWater && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowWater(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#111", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Hydratation</div>
            <div style={{ fontSize: 44, fontWeight: 100, color: BLUE, textAlign: "center", marginBottom: 20, letterSpacing: "-2px" }}>
              {((tempWater || dailyTracking?.eau_ml || 0) / 1000).toFixed(1)} L
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[150, 250, 330, 500].map(ml => (
                <button key={ml} onClick={() => { const newVal = (dailyTracking?.eau_ml || 0) + ml; setTempWater(newVal); updateTracking("eau_ml", newVal); }} style={{ flex: 1, padding: "10px 0", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 12, color: BLUE, fontSize: 13, fontWeight: 600, cursor: "pointer", minWidth: 60 }}>
                  +{ml}ml
                </button>
              ))}
            </div>
            <button onClick={() => setShowWater(false)} style={{ width: "100%", padding: 14, background: BLUE, color: "#000", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>OK</button>
          </div>
        </div>
      )}

      {/* MODAL SOMMEIL */}
      {showSleep && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowSleep(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#111", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Sommeil cette nuit</div>
            <div style={{ fontSize: 44, fontWeight: 100, color: PURPLE, textAlign: "center", marginBottom: 20, letterSpacing: "-2px" }}>
              {tempSleep || dailyTracking?.sommeil_h || 0} h
            </div>
            <input type="range" min="0" max="12" step="0.5" value={tempSleep || dailyTracking?.sommeil_h || 0}
              onChange={e => setTempSleep(parseFloat(e.target.value))}
              style={{ width: "100%", marginBottom: 20 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 20 }}>
              <span>0h</span><span>6h</span><span>8h</span><span>12h</span>
            </div>
            <button onClick={() => { updateTracking("sommeil_h", tempSleep || dailyTracking?.sommeil_h || 0); setShowSleep(false); }} style={{ width: "100%", padding: 14, background: PURPLE, color: "#000", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
          </div>
        </div>
      )}

    </div>
  );
}
