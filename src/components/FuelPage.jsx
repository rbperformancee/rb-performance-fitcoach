import React, { useState, useCallback, useEffect, useRef } from "react";
import { useFuel } from "../hooks/useFuel";
import { useOpenFoodFacts } from "../hooks/useOpenFoodFacts";

const GREEN = "#02d1ba"; // v2
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

export default function FuelPage({ client, appData }) {
  const fuelData = useFuel(client?.id);
  const goals = appData?.nutritionGoals || fuelData.goals;
  const logs = fuelData.logs;
  const dailyTracking = fuelData.dailyTracking || appData?.dailyTracking;
  const loading = appData ? appData.loading : fuelData.loading;
  const { totals, addFood, removeFood, updateTracking, score } = fuelData;
  const { results, loading: searching, search } = useOpenFoodFacts();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRepas, setSelectedRepas] = useState("Dejeuner");
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantite, setQuantite] = useState(100);
  const [showWater, setShowWater] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);
  const recognitionRef = useRef(null);
  const [showSleep, setShowSleep] = useState(false);
  const [tempWater, setTempWater] = useState(null);
  const [tempSleep, setTempSleep] = useState(null);

  // Sync avec dailyTracking quand il se charge
  useEffect(() => {
    if (dailyTracking) {
      setTempWater(dailyTracking.eau_ml || 0);
      setTempSleep(dailyTracking.sommeil_h || 0);
    }
  }, [dailyTracking?.eau_ml, dailyTracking?.sommeil_h]);
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

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Reconnaissance vocale non supportée sur ce navigateur."); return; }
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setRecording(true);
    rec.onend = () => setRecording(false);
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setVoiceText(t); analyzeWithAI(t); };
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const analyzeWithAI = async (text) => {
    setVoiceLoading(true);
    setVoiceResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 500,
          messages: [{ role: "user", content: "Analyse ce repas et retourne UNIQUEMENT un JSON: { aliment, calories, proteines, glucides, lipides, quantite_g }. Repas: " + text }]
        })
      });
      const data = await res.json();
      const raw = (data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
      setVoiceResult(JSON.parse(raw));
    } catch(e) { console.error(e); }
    setVoiceLoading(false);
  };

  const addVoiceFood = async () => {
    if (!voiceResult) return;
    await addFood({ repas: selectedRepas, ...voiceResult });
    setShowVoice(false); setVoiceText(""); setVoiceResult(null);
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", padding: "0px 24px" }}>
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
          <div onClick={() => { setTempWater(dailyTracking?.eau_ml || 0); setShowWater(true); }} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 18, padding: 16, cursor: "pointer" }}>
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
          <div onClick={() => { setTempSleep(dailyTracking?.sommeil_h || 0); setShowSleep(true); }} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 18, padding: 16, cursor: "pointer" }}>
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

        {/* REPAS ULTRA PREMIUM */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>

          {/* Header + bouton add */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Journal du jour</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>Mes repas<span style={{ color: ORANGE }}>.</span></div>
            </div>
            <button onClick={() => { setShowAdd(true); setSelectedRepas("Dejeuner"); }} style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#000", border: "none", borderRadius: 14, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px" }}>+ Ajouter</button>
          </div>

          {/* Timeline repas */}
          {REPAS.map((repas, ri) => {
            const repasLogs = logsByRepas[repas];
            const repasKcal = repasLogs.reduce((s, l) => s + (l.calories || 0), 0);
            const emojis = { "Petit-dejeuner": "🌅", "Dejeuner": "☀️", "Collation": "⚡", "Diner": "🌙" };
            const colors = { "Petit-dejeuner": "#fbbf24", "Dejeuner": ORANGE, "Collation": GREEN, "Diner": PURPLE };
            const col = colors[repas];
            return (
              <div key={repas} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                {/* Timeline indicator */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: repasLogs.length > 0 ? `${col}18` : "rgba(255,255,255,0.03)", border: `1px solid ${repasLogs.length > 0 ? col + "40" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transition: "all 0.3s" }}>{emojis[repas]}</div>
                  {ri < REPAS.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 20, background: "linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)", marginTop: 6 }} />}
                </div>

                {/* Contenu repas */}
                <div style={{ flex: 1, paddingTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: repasLogs.length > 0 ? "#fff" : "rgba(255,255,255,0.3)", letterSpacing: "0.3px" }}>{repas}</div>
                    {repasKcal > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: col, background: `${col}12`, border: `1px solid ${col}25`, borderRadius: 100, padding: "3px 10px" }}>{repasKcal} kcal</div>}
                  </div>

                  {repasLogs.length === 0 ? (
                    <div onClick={() => { setSelectedRepas(repas); setShowAdd(true); }} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 14, fontSize: 12, color: "rgba(255,255,255,0.2)", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                      Tap pour logger ce repas
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {repasLogs.map(log => (
                        <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.025)", border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 14, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: col, borderRadius: "0 2px 2px 0" }} />
                          <div style={{ flex: 1, paddingLeft: 4 }}>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500, marginBottom: 3 }}>{log.aliment}</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{log.quantite_g}g</span>
                              <span style={{ fontSize: 10, color: GREEN + "99" }}>P {log.proteines}g</span>
                              <span style={{ fontSize: 10, color: ORANGE + "99" }}>G {log.glucides}g</span>
                              <span style={{ fontSize: 10, color: BLUE + "99" }}>L {log.lipides}g</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: col, flexShrink: 0, marginRight: 4 }}>{log.calories}<span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.2)" }}> kcal</span></div>
                          <button onClick={() => removeFood(log.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, width: 26, height: 26, color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                        </div>
                      ))}
                      <div onClick={() => { setSelectedRepas(repas); setShowAdd(true); }} style={{ padding: "10px 14px", background: "transparent", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer", textAlign: "center" }}>+ Ajouter</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* MODAL AJOUT ALIMENT ULTRA PREMIUM */}
      {showAdd && (
        <div onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setQuery(""); setSelectedFood(null); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end", backdropFilter: "blur(8px)" }}>
          <div style={{ background: "linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)", borderRadius: "28px 28px 0 0", padding: "6px 0 0", maxHeight: "92vh", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, margin: "0 auto 20px" }} />

            <div style={{ padding: "0 24px", overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 9, color: "rgba(249,115,22,0.5)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>RB Perform · Fuel</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Logger un aliment</div>
                </div>
                <button onClick={() => { setShowAdd(false); setQuery(""); setSelectedFood(null); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 34, height: 34, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>

              {/* Repas selector — pills premium */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
                {[{ id: "Petit-dejeuner", emoji: "🌅" }, { id: "Dejeuner", emoji: "☀️" }, { id: "Collation", emoji: "⚡" }, { id: "Diner", emoji: "🌙" }].map(r => (
                  <button key={r.id} onClick={() => setSelectedRepas(r.id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 100, border: `1px solid ${selectedRepas === r.id ? ORANGE : "rgba(255,255,255,0.08)"}`, background: selectedRepas === r.id ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)", color: selectedRepas === r.id ? ORANGE : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>{r.emoji} {r.id}</button>
                ))}
              </div>

              {/* Search bar premium */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "rgba(255,255,255,0.2)", pointerEvents: "none" }}>🔍</div>
                <input
                  type="text"
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Rechercher un aliment..."
                  autoFocus
                  style={{ width: "100%", padding: "15px 16px 15px 44px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, color: "#fff", fontSize: 15, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box", transition: "border 0.2s" }}
                />
                {query.length > 0 && (
                  <button onClick={() => { setQuery(""); setSelectedFood(null); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 100, width: 24, height: 24, color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>×</button>
                )}
              </div>

              {/* Scroll area */}
              <div style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", scrollbarWidth: "none" }}>

                {/* Searching */}
                {searching && (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div style={{ width: 32, height: 32, border: "2px solid rgba(249,115,22,0.2)", borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Recherche en cours...</div>
                  </div>
                )}

                {/* Results */}
                {!searching && results.length > 0 && !selectedFood && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {results.map((food, i) => (
                      <div key={i} onClick={() => setSelectedFood(food)} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, cursor: "pointer", transition: "all 0.15s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 2 }}>{food.name}</div>
                            {food.brand && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.5px" }}>{food.brand}</div>}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: ORANGE, flexShrink: 0, marginLeft: 12 }}>{food.calories}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}> kcal</span></div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ fontSize: 10, color: GREEN + "aa", background: GREEN + "12", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>P {food.proteines}g</span>
                          <span style={{ fontSize: 10, color: ORANGE + "aa", background: ORANGE + "12", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>G {food.glucides}g</span>
                          <span style={{ fontSize: 10, color: BLUE + "aa", background: BLUE + "12", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>L {food.lipides}g</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>pour 100g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {!searching && query.length > 2 && results.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Aucun résultat</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>Essaie un nom plus général</div>
                  </div>
                )}

                {/* Selected food + quantite */}
                {selectedFood && (
                  <div>
                    {/* Food card sélectionné */}
                    <div style={{ padding: "16px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 18, marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, color: "#fff", fontWeight: 700, marginBottom: 2 }}>{selectedFood.name}</div>
                          {selectedFood.brand && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{selectedFood.brand}</div>}
                        </div>
                        <button onClick={() => setSelectedFood(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "4px 10px", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>Changer</button>
                      </div>
                      {/* Macros live */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(249,115,22,0.1)", borderRadius: 12 }}>
                          <div style={{ fontSize: 20, fontWeight: 200, color: ORANGE, letterSpacing: "-1px" }}>{Math.round(selectedFood.calories * quantite / 100)}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>kcal</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(2,209,186,0.08)", borderRadius: 12 }}>
                          <div style={{ fontSize: 20, fontWeight: 200, color: GREEN, letterSpacing: "-1px" }}>{(selectedFood.proteines * quantite / 100).toFixed(1)}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>prot g</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(249,115,22,0.06)", borderRadius: 12 }}>
                          <div style={{ fontSize: 20, fontWeight: 200, color: ORANGE + "cc", letterSpacing: "-1px" }}>{(selectedFood.glucides * quantite / 100).toFixed(1)}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>gluc g</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(96,165,250,0.08)", borderRadius: 12 }}>
                          <div style={{ fontSize: 20, fontWeight: 200, color: BLUE, letterSpacing: "-1px" }}>{(selectedFood.lipides * quantite / 100).toFixed(1)}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>lip g</div>
                        </div>
                      </div>
                    </div>

                    {/* Quantite selector */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>Quantité</div>
                      {/* Quick amounts */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        {[50, 100, 150, 200, 250, 300].map(q => (
                          <button key={q} onClick={() => setQuantite(q)} style={{ padding: "8px 14px", borderRadius: 100, border: `1px solid ${quantite === q ? ORANGE : "rgba(255,255,255,0.08)"}`, background: quantite === q ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)", color: quantite === q ? ORANGE : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{q}g</button>
                        ))}
                      </div>
                      {/* Input manuel */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => setQuantite(Math.max(10, quantite - 10))} style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                          <input type="number" value={quantite} onChange={e => setQuantite(parseInt(e.target.value) || 100)} style={{ flex: 1, textAlign: "center", padding: "12px", background: "transparent", border: "none", color: "#fff", fontSize: 20, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif" }} />
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", paddingRight: 14 }}>g</span>
                        </div>
                        <button onClick={() => setQuantite(quantite + 10)} style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                    </div>

                    {/* CTA */}
                    <button onClick={handleAddFood} style={{ width: "100%", padding: 17, background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#000", border: "none", borderRadius: 18, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Ajouter au {selectedRepas}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VOCAL IA */}
      {showVoice && (
        <div onClick={e => { if(e.target===e.currentTarget){setShowVoice(false);setVoiceText("");setVoiceResult(null);}}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(12px)"}}>
          <div style={{background:"#0a0a0a",borderRadius:"28px 28px 0 0",padding:"20px 24px calc(env(safe-area-inset-bottom,0px) + 32px)",width:"100%",maxWidth:480,border:"1px solid rgba(2,209,186,0.15)",borderBottom:"none"}}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.1)",borderRadius:2,margin:"0 auto 24px"}}/>
            <div style={{fontSize:9,color:"rgba(2,209,186,0.5)",letterSpacing:"4px",textTransform:"uppercase",marginBottom:8}}>RB Perform · IA Vocal</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:24,letterSpacing:"-0.5px"}}>Décris ton repas</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}>
              <button onClick={recording ? ()=>recognitionRef.current?.stop() : startVoice} style={{width:88,height:88,borderRadius:"50%",border:`2px solid ${recording?"#02d1ba":"rgba(2,209,186,0.3)"}`,background:recording?"rgba(2,209,186,0.15)":"rgba(255,255,255,0.04)",color:"#02d1ba",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s",boxShadow:recording?"0 0 40px rgba(2,209,186,0.3)":"none"}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{width:36,height:36}}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <div style={{marginTop:12,fontSize:12,color:recording?"#02d1ba":"rgba(255,255,255,0.3)",transition:"all 0.3s"}}>{recording?"Écoute en cours...":"Tap pour parler"}</div>
            </div>
            {voiceText && <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:14,color:"rgba(255,255,255,0.7)",fontStyle:"italic"}}>"{voiceText}"</div>}
            {voiceLoading && <div style={{textAlign:"center",padding:"16px 0",color:"rgba(2,209,186,0.6)",fontSize:12}}><div style={{width:28,height:28,border:"2px solid rgba(2,209,186,0.2)",borderTopColor:"#02d1ba",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 8px"}}/>Analyse IA...</div>}
            {voiceResult && !voiceLoading && (
              <div>
                <div style={{background:"rgba(2,209,186,0.06)",border:"1px solid rgba(2,209,186,0.2)",borderRadius:16,padding:16,marginBottom:16}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:12}}>{voiceResult.aliment}</div>
                  <div style={{display:"flex",gap:8}}>
                    {[{v:voiceResult.calories,l:"kcal",c:"#f97316"},{v:voiceResult.proteines,l:"prot",c:"#02d1ba"},{v:voiceResult.glucides,l:"gluc",c:"#f97316"},{v:voiceResult.lipides,l:"lip",c:"#60a5fa"}].map((m,i)=>(
                      <div key={i} style={{flex:1,textAlign:"center",padding:"8px 4px",background:`${m.c}12`,borderRadius:10}}>
                        <div style={{fontSize:18,fontWeight:200,color:m.c}}>{m.v}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"1px"}}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addVoiceFood} style={{width:"100%",padding:16,background:"linear-gradient(135deg,#02d1ba,#0891b2)",color:"#000",border:"none",borderRadius:16,fontSize:14,fontWeight:800,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px"}}>Ajouter au {selectedRepas}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SCAN */}
      {showScan && (
        <div onClick={()=>setShowScan(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(12px)"}}>
          <div style={{background:"#0a0a0a",borderRadius:24,padding:32,width:"100%",maxWidth:340,border:"1px solid rgba(167,139,250,0.15)",textAlign:"center"}}>
            <div style={{color:"#a78bfa",marginBottom:16,display:"flex",justifyContent:"center"}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{width:48,height:48}}><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M7 2v4M17 2v4M7 18v4M17 18v4M2 7h4M2 17h4M18 7h4M18 17h4"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:8}}>Scan code-barre</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.3)",lineHeight:1.7}}>Bientôt disponible — scanner un produit pour charger ses macros instantanément.</div>
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
                <button key={ml} onClick={() => { const base = tempWater !== null ? tempWater : (dailyTracking?.eau_ml || 0); const newVal = base + ml; setTempWater(newVal); updateTracking("eau_ml", newVal); }} style={{ flex: 1, padding: "10px 0", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 12, color: BLUE, fontSize: 13, fontWeight: 600, cursor: "pointer", minWidth: 60 }}>
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
              {tempSleep !== null ? tempSleep : (dailyTracking?.sommeil_h || 0)} h
            </div>
            <input type="range" min="0" max="12" step="0.5" value={tempSleep !== null ? tempSleep : (dailyTracking?.sommeil_h || 0)}
              onChange={e => setTempSleep(parseFloat(e.target.value))}
              style={{ width: "100%", marginBottom: 20 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 20 }}>
              <span>0h</span><span>6h</span><span>8h</span><span>12h</span>
            </div>
            <button onClick={() => { updateTracking("sommeil_h", tempSleep !== null ? tempSleep : (dailyTracking?.sommeil_h || 0)); setShowSleep(false); }} style={{ width: "100%", padding: 14, background: PURPLE, color: "#000", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
          </div>
        </div>
      )}

    </div>
  );
}
/* cache bust ven. 10 avr. 2026 21:11:01 CEST */
