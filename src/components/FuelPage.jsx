import React, { useState, useCallback, useEffect, useRef } from "react";
import { useFuel } from "../hooks/useFuel";
import { useOpenFoodFacts } from "../hooks/useOpenFoodFacts";
import EmptyState from "./EmptyState";
import Spinner from "./Spinner";
import { toast } from "./Toast";

// ===== Scanner code-barre via BarcodeDetector API native =====
// Marche sur : iOS Safari 17+ (donc iOS 18), Chrome Android 83+, Chrome desktop, Edge.
// Ne marche pas sur : Firefox, vieux Safari < 17 (message clair affiche).
//
// On utilise le pattern <input type="file" capture="environment"> qui declenche
// l'app camera NATIVE de l'OS (iOS Camera, Android Camera). Aucune permission web
// requise, marche en PWA standalone iOS, marche partout. Une seule photo HD est
// passee a BarcodeDetector.detect() qui gere le decodage cote OS, beaucoup plus
// precis et rapide que n'importe quel decodeur JS.
const BARCODE_FORMATS = [
  "ean_13", // standard produit europeen
  "ean_8",  // version courte
  "upc_a",  // standard produit US
  "upc_e",  // version courte US
  "code_128", // logistique
  "code_39",  // logistique ancien
  "qr_code",  // rares produits avec QR
];

const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

const GREEN = "#02d1ba"; // v_fupyhdzh
const ORANGE = "#f97316";
const BLUE = "#60a5fa";
const PURPLE = "#a78bfa";

const REPAS = ["Petit-dejeuner", "Dejeuner", "Collation", "Diner"];

// ===== Icones SVG premium pour les repas =====
// Inspirees feather/lucide, monochrome, stroke 1.8 pour la finesse.
const MealIcon = ({ type, size = 18, color = "currentColor" }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "Petit-dejeuner") {
    // Lever de soleil : soleil qui se leve sur l'horizon avec rayons
    return (
      <svg {...props}>
        <path d="M17 18a5 5 0 0 0-10 0" />
        <line x1="12" y1="2" x2="12" y2="9" />
        <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
        <line x1="1" y1="18" x2="3" y2="18" />
        <line x1="21" y1="18" x2="23" y2="18" />
        <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
        <line x1="23" y1="22" x2="1" y2="22" />
        <polyline points="8 6 12 2 16 6" />
      </svg>
    );
  }
  if (type === "Dejeuner") {
    // Soleil plein avec rayons
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
        <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
      </svg>
    );
  }
  if (type === "Collation") {
    // Eclair = energie
    return (
      <svg {...props}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (type === "Diner") {
    // Lune croissant
    return (
      <svg {...props}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return null;
};

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
  const { totals, addFood, removeFood, updateFood, updateTracking, score } = fuelData;
  const { results, loading: searching, search, scanBarcode } = useOpenFoodFacts();
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
  const [scanError, setScanError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState(""); // diagnostic visible
  const [scannedFood, setScannedFood] = useState(null); // produit decode + lookup OpenFoodFacts
  const [scanQuantite, setScanQuantite] = useState(100); // quantite choisie pour le produit scanne
  const fileInputRef = useRef(null); // <input type=file capture=environment> qui ouvre la camera native

  // Edition d'un aliment deja loggue
  const [editingFood, setEditingFood] = useState(null); // log d'origine, immutable, pour calculer les ratios
  const [editAliment, setEditAliment] = useState("");
  const [editQuantite, setEditQuantite] = useState(0);
  const [editKcal, setEditKcal] = useState(0);
  const [editProt, setEditProt] = useState(0);
  const [editGluc, setEditGluc] = useState(0);
  const [editLip, setEditLip] = useState(0);

  const openEditFood = useCallback((log) => {
    setEditingFood(log);
    setEditAliment(log.aliment || "");
    setEditQuantite(log.quantite_g || 100);
    setEditKcal(log.calories || 0);
    setEditProt(parseFloat(log.proteines || 0));
    setEditGluc(parseFloat(log.glucides || 0));
    setEditLip(parseFloat(log.lipides || 0));
  }, []);

  // Quand l'utilisateur change la quantite, on rescale les macros au prorata
  // de la quantite originale (pratique : "j'ai logue 100g mais j'ai mange 150g").
  // L'utilisateur peut toujours modifier chaque macro a la main apres.
  const handleEditQuantiteChange = useCallback((newQ) => {
    const q = Math.max(1, parseInt(newQ) || 0);
    setEditQuantite(q);
    if (editingFood && editingFood.quantite_g && editingFood.quantite_g > 0) {
      const ratio = q / editingFood.quantite_g;
      setEditKcal(Math.round((editingFood.calories || 0) * ratio));
      setEditProt(parseFloat(((editingFood.proteines || 0) * ratio).toFixed(1)));
      setEditGluc(parseFloat(((editingFood.glucides || 0) * ratio).toFixed(1)));
      setEditLip(parseFloat(((editingFood.lipides || 0) * ratio).toFixed(1)));
    }
  }, [editingFood]);

  const saveEditFood = useCallback(async () => {
    if (!editingFood) return;
    await updateFood(editingFood.id, {
      aliment: editAliment.trim() || editingFood.aliment,
      calories: Math.round(editKcal) || 0,
      proteines: parseFloat(editProt) || 0,
      glucides: parseFloat(editGluc) || 0,
      lipides: parseFloat(editLip) || 0,
      quantite_g: parseInt(editQuantite) || editingFood.quantite_g,
    });
    setEditingFood(null);
    if (navigator.vibrate) navigator.vibrate(30);
  }, [editingFood, editAliment, editKcal, editProt, editGluc, editLip, editQuantite, updateFood]);

  const deleteEditFood = useCallback(async () => {
    if (!editingFood) return;
    await removeFood(editingFood.id);
    setEditingFood(null);
  }, [editingFood, removeFood]);

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
    if (!SR) { toast.error("Reconnaissance vocale non supportee sur ce navigateur."); return; }
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
      const res = await fetch("/api/voice-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Proxy error");
      setVoiceResult(data);
    } catch (e) {
      console.error(e);
      toast.error("Analyse IA indisponible. Reessaye dans un instant.");
    }
    setVoiceLoading(false);
  };

  const addVoiceFood = async () => {
    if (!voiceResult) return;

    // Si on a un breakdown ingredients, on les ajoute SEPAREMENT.
    // Comme ca chaque aliment apparait sur sa propre ligne dans le repas
    // et l'utilisateur peut le supprimer/editer independamment des autres.
    if (Array.isArray(voiceResult.ingredients) && voiceResult.ingredients.length > 0) {
      for (const ing of voiceResult.ingredients) {
        await addFood({
          repas: selectedRepas,
          aliment: ing.nom,
          calories: Math.round(ing.calories || 0),
          proteines: parseFloat((ing.proteines || 0).toFixed(1)),
          glucides: parseFloat((ing.glucides || 0).toFixed(1)),
          lipides: parseFloat((ing.lipides || 0).toFixed(1)),
          quantite_g: ing.quantite_g || 0,
        });
      }
    } else {
      // Fallback si pas de breakdown : une seule entree avec le total
      await addFood({
        repas: selectedRepas,
        aliment: voiceResult.aliment,
        calories: voiceResult.calories,
        proteines: voiceResult.proteines,
        glucides: voiceResult.glucides,
        lipides: voiceResult.lipides,
        quantite_g: voiceResult.quantite_g,
      });
    }

    setShowVoice(false); setVoiceText(""); setVoiceResult(null);
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
  };

  // ===== Scanner code-barre via BarcodeDetector + camera native OS =====
  // Pattern : <input type="file" capture="environment"> declenche l'app camera
  // NATIVE de l'OS (iOS Camera, Android Camera, plein ecran, qualite max).
  // Snap -> photo Blob -> BarcodeDetector.detect() native -> EAN-13 decode.
  // Aucune permission web requise, marche en PWA iOS standalone, marche sur Android.

  const triggerPhotoScan = useCallback(() => {
    setScanError("");
    setScanStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // permet de re-selectionner la meme image
      fileInputRef.current.click();
    }
  }, []);

  const handlePhotoSelected = useCallback(async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setScanError("");
    setScanLoading(true);
    setScanStatus("Decodage de la photo...");

    let decodedText = null;

    // Strategie 1 : BarcodeDetector natif si dispo (Android Chrome, Edge, desktop Chrome).
    // ~10x plus rapide que zbar-wasm car execute par l'OS, et zero download.
    if (hasBarcodeDetector) {
      try {
        let formats = BARCODE_FORMATS;
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const filtered = BARCODE_FORMATS.filter((f) => supported.includes(f));
          if (filtered.length > 0) formats = filtered;
        } catch {}

        const detector = new window.BarcodeDetector({ formats });
        let bitmap;
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          bitmap = file;
        }
        const codes = await detector.detect(bitmap);
        if (bitmap && bitmap.close) bitmap.close();
        if (codes && codes.length > 0) {
          decodedText = codes[0].rawValue;
        }
      } catch (err) {
        console.warn("BarcodeDetector failed, fallback to zbar-wasm:", err);
      }
    }

    // Strategie 2 : zbar-wasm en fallback. Marche PARTOUT, y compris iOS Safari
    // (qui n'a pas BarcodeDetector). Lazy import : ~250 KB charges seulement
    // au premier scan, mis en cache ensuite.
    if (!decodedText) {
      try {
        setScanStatus("Decodage avance...");
        const zbar = await import("@undecaf/zbar-wasm");

        // Convert le File en ImageData via canvas
        const url = URL.createObjectURL(file);
        try {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = url;
          });
          const canvas = document.createElement("canvas");
          // Limite la taille pour speed (zbar gere bien meme reduit)
          const MAX = 1600;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > MAX || h > MAX) {
            const ratio = Math.min(MAX / w, MAX / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          const symbols = await zbar.scanImageData(imageData);
          if (symbols && symbols.length > 0) {
            decodedText = symbols[0].decode();
          }
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error("zbar-wasm failed:", err);
        setScanLoading(false);
        setScanError("Erreur de decodage : " + (err?.message || err?.name || "inconnue"));
        setScanStatus("");
        return;
      }
    }

    if (!decodedText) {
      setScanLoading(false);
      setScanError("Aucun code-barre detecte. Cadre bien le code, eclairage suffisant, distance ~15cm.");
      setScanStatus("");
      return;
    }

    if (navigator.vibrate) navigator.vibrate(60);
    setScanStatus("Recherche du produit...");
    const food = await scanBarcode(decodedText);
    setScanLoading(false);
    setScanStatus("");

    if (!food || !food.calories) {
      setScanError("Produit introuvable (" + decodedText + "). Essaie un autre produit ou ajoute-le manuellement.");
      return;
    }

    // Affiche l'etape de selection de quantite (au lieu d'ajouter direct).
    setScannedFood(food);
    setScanQuantite(100); // defaut 100g, donnees OpenFoodFacts pour 100g
  }, [scanBarcode]);

  // Reset des erreurs/status/produit scanne a la fermeture de la modal scan
  useEffect(() => {
    if (!showScan) {
      setScanError("");
      setScanStatus("");
      setScanLoading(false);
      setScannedFood(null);
      setScanQuantite(100);
    }
  }, [showScan]);

  // Confirme l'ajout du produit scanne avec la quantite choisie
  const confirmScannedFood = useCallback(async () => {
    if (!scannedFood) return;
    const factor = scanQuantite / 100; // OpenFoodFacts donne les valeurs pour 100g
    await addFood({
      repas: selectedRepas,
      aliment: scannedFood.name,
      calories: Math.round(scannedFood.calories * factor),
      proteines: parseFloat((scannedFood.proteines * factor).toFixed(1)),
      glucides: parseFloat((scannedFood.glucides * factor).toFixed(1)),
      lipides: parseFloat((scannedFood.lipides * factor).toFixed(1)),
      quantite_g: scanQuantite,
    });
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
    setShowScan(false);
  }, [scannedFood, scanQuantite, selectedRepas, addFood]);

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

          {/* Header + boutons add / vocal / scan */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Journal du jour</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>Mes repas<span style={{ color: ORANGE }}>.</span></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => { setShowVoice(true); }}
                aria-label="Ajouter par commande vocale (IA)"
                style={{ background: "rgba(2,209,186,0.1)", border: "1px solid rgba(2,209,186,0.3)", borderRadius: 14, width: 42, height: 42, color: GREEN, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
              <button
                onClick={() => { setShowScan(true); }}
                aria-label="Scanner un code-barre"
                style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 14, width: 42, height: 42, color: PURPLE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" />
                </svg>
              </button>
              <button onClick={() => { setShowAdd(true); setSelectedRepas("Dejeuner"); }} style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#000", border: "none", borderRadius: 14, padding: "10px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px" }}>+ Ajouter</button>
            </div>
          </div>

          {/* Timeline repas */}
          {REPAS.map((repas, ri) => {
            const repasLogs = logsByRepas[repas];
            const repasKcal = repasLogs.reduce((s, l) => s + (l.calories || 0), 0);
            const colors = { "Petit-dejeuner": "#fbbf24", "Dejeuner": ORANGE, "Collation": GREEN, "Diner": PURPLE };
            const col = colors[repas];
            const filled = repasLogs.length > 0;
            return (
              <div key={repas} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                {/* Timeline indicator */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: filled ? `${col}18` : "rgba(255,255,255,0.03)", border: `1px solid ${filled ? col + "40" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s", color: filled ? col : "rgba(255,255,255,0.25)" }}>
                    <MealIcon type={repas} size={18} />
                  </div>
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
                        <div
                          key={log.id}
                          onClick={() => openEditFood(log)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.025)", border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 14, position: "relative", overflow: "hidden", cursor: "pointer", transition: "background 0.15s" }}
                        >
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
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFood(log.id); }}
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, width: 26, height: 26, color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          >
                            ×
                          </button>
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
                  <div style={{ fontSize: 9, color: "rgba(249,115,22,0.5)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Nutrition</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Logger un aliment</div>
                </div>
                <button onClick={() => { setShowAdd(false); setQuery(""); setSelectedFood(null); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 44, height: 44, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>

              {/* Repas selector — pills premium */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
                {REPAS.map((id) => {
                  const active = selectedRepas === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedRepas(id)}
                      style={{
                        flexShrink: 0,
                        padding: "8px 14px",
                        borderRadius: 100,
                        border: `1px solid ${active ? ORANGE : "rgba(255,255,255,0.08)"}`,
                        background: active ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)",
                        color: active ? ORANGE : "rgba(255,255,255,0.35)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <MealIcon type={id} size={14} />
                      {id}
                    </button>
                  );
                })}
              </div>

              {/* Search bar premium */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                  placeholder="Rechercher : poulet, riz, pomme, yaourt..."
                  autoFocus
                  enterKeyHint="search"
                  style={{ width: "100%", padding: "15px 16px 15px 44px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, color: "#fff", fontSize: 16, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box", transition: "border 0.2s", WebkitAppearance: "none", WebkitTapHighlightColor: "transparent" }}
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
                    <Spinner variant="dots" size={28} color="#f97316" label="Recherche en cours" />
                  </div>
                )}

                {/* Results */}
                {results.length > 0 && !selectedFood && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {results.map((food, i) => {
                      const sourceConfig = {
                        local:  { label: "CIQUAL", color: GREEN },
                        edamam: { label: "EDAMAM", color: BLUE },
                        off:    { label: null,     color: null },
                      };
                      const cfg = sourceConfig[food._source] || sourceConfig.off;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedFood(food)}
                          style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, cursor: "pointer", transition: "all 0.15s", WebkitTapHighlightColor: "transparent" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{food.name}</div>
                                {cfg.label && (
                                  <span style={{ fontSize: 8, color: cfg.color, background: cfg.color + "15", border: `1px solid ${cfg.color}30`, borderRadius: 4, padding: "1px 5px", letterSpacing: "0.5px", fontWeight: 700, flexShrink: 0 }}>{cfg.label}</span>
                                )}
                              </div>
                              {food.brand && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{food.brand}</div>}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: ORANGE, flexShrink: 0 }}>{food.calories}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}> kcal</span></div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, color: GREEN + "aa", background: GREEN + "12", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>P {food.proteines}g</span>
                            <span style={{ fontSize: 10, color: ORANGE + "aa", background: ORANGE + "12", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>G {food.glucides}g</span>
                            <span style={{ fontSize: 10, color: BLUE + "aa", background: BLUE + "12", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>L {food.lipides}g</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>pour 100g</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {!searching && query.length > 2 && results.length === 0 && (
                  <EmptyState
                    icon="search"
                    title="Rien trouve"
                    subtitle={`Aucun aliment pour "${query}". Essaie un nom plus general ou en francais (ex: poulet, pates, yaourt).`}
                    size="md"
                    style={{ padding: "24px 0" }}
                  />
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
                          <input type="number" inputMode="numeric" value={quantite} onChange={e => setQuantite(parseInt(e.target.value) || 100)} style={{ flex: 1, textAlign: "center", padding: "12px", background: "transparent", border: "none", color: "#fff", fontSize: 20, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif" }} />
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
            <div style={{fontSize:9,color:"rgba(2,209,186,0.5)",letterSpacing:"4px",textTransform:"uppercase",marginBottom:8}}>IA Vocal</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:16,letterSpacing:"-0.5px"}}>Décris ton repas</div>

            {/* Selecteur de repas (theme vert IA Vocal) */}
            <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
              {REPAS.map((id) => {
                const active = selectedRepas === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedRepas(id)}
                    style={{
                      flexShrink: 0,
                      padding: "8px 14px",
                      borderRadius: 100,
                      border: `1px solid ${active ? GREEN : "rgba(255,255,255,0.08)"}`,
                      background: active ? "rgba(2,209,186,0.12)" : "rgba(255,255,255,0.03)",
                      color: active ? GREEN : "rgba(255,255,255,0.35)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MealIcon type={id} size={14} />
                    {id}
                  </button>
                );
              })}
            </div>

            <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}>
              <button onClick={recording ? ()=>recognitionRef.current?.stop() : startVoice} style={{width:88,height:88,borderRadius:"50%",border:`2px solid ${recording?"#02d1ba":"rgba(2,209,186,0.3)"}`,background:recording?"rgba(2,209,186,0.15)":"rgba(255,255,255,0.04)",color:"#02d1ba",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s",boxShadow:recording?"0 0 40px rgba(2,209,186,0.3)":"none"}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{width:36,height:36}}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <div style={{marginTop:12,fontSize:12,color:recording?"#02d1ba":"rgba(255,255,255,0.3)",transition:"all 0.3s"}}>{recording?"Écoute en cours...":"Tap pour parler"}</div>
            </div>
            {voiceText && <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:14,color:"rgba(255,255,255,0.7)",fontStyle:"italic"}}>"{voiceText}"</div>}
            {voiceLoading && <div style={{textAlign:"center",padding:"16px 0"}}><Spinner variant="dots" size={26} label="Analyse IA" /></div>}
            {voiceResult && !voiceLoading && (
              <div>
                <div style={{background:"rgba(2,209,186,0.06)",border:"1px solid rgba(2,209,186,0.2)",borderRadius:16,padding:16,marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12,gap:8}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#fff",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{voiceResult.aliment}</div>
                    {typeof voiceResult.quantite_g === "number" && (
                      <div style={{fontSize:11,color:"rgba(2,209,186,0.7)",fontWeight:600,flexShrink:0}}>{voiceResult.quantite_g}g</div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {[{v:voiceResult.calories,l:"kcal",c:"#f97316"},{v:voiceResult.proteines,l:"prot",c:"#02d1ba"},{v:voiceResult.glucides,l:"gluc",c:"#f97316"},{v:voiceResult.lipides,l:"lip",c:"#60a5fa"}].map((m,i)=>(
                      <div key={i} style={{flex:1,textAlign:"center",padding:"8px 4px",background:`${m.c}12`,borderRadius:10}}>
                        <div style={{fontSize:18,fontWeight:200,color:m.c}}>{m.v}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"1px"}}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Breakdown des ingredients (transparence : on montre comment on a calcule) */}
                {Array.isArray(voiceResult.ingredients) && voiceResult.ingredients.length > 0 && (
                  <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:14,padding:"10px 14px",marginBottom:16}}>
                    <div style={{fontSize:9,color:"rgba(2,209,186,0.5)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>Detail du calcul</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {voiceResult.ingredients.map((ing, i) => (
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:11,gap:8}}>
                          <div style={{flex:1,color:"rgba(255,255,255,0.7)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {ing.nom}
                            <span style={{color:"rgba(255,255,255,0.3)",marginLeft:6}}>{ing.quantite_g}g</span>
                          </div>
                          <div style={{color:"rgba(2,209,186,0.7)",fontWeight:600,flexShrink:0}}>
                            {ing.calories} kcal
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={addVoiceFood} style={{width:"100%",padding:16,background:"linear-gradient(135deg,#02d1ba,#0891b2)",color:"#000",border:"none",borderRadius:16,fontSize:14,fontWeight:800,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px"}}>Ajouter au {selectedRepas}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SCAN code-barre */}
      {showScan && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowScan(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(12px)" }}>
          <div style={{ background: "#0a0a0a", borderRadius: 24, padding: 24, width: "100%", maxWidth: 420, border: "1px solid rgba(167,139,250,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: "rgba(167,139,250,0.6)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Scanner</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Scanner un code-barre</div>
              </div>
              <button onClick={() => setShowScan(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 44, height: 44, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>

            {/* Selecteur de repas (theme violet Scan) */}
            <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
              {REPAS.map((id) => {
                const active = selectedRepas === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedRepas(id)}
                    style={{
                      flexShrink: 0,
                      padding: "8px 14px",
                      borderRadius: 100,
                      border: `1px solid ${active ? PURPLE : "rgba(255,255,255,0.08)"}`,
                      background: active ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                      color: active ? PURPLE : "rgba(255,255,255,0.35)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MealIcon type={id} size={14} />
                    {id}
                  </button>
                );
              })}
            </div>

            {/* Etape 1 : invite photo (tant qu'aucun produit scanne) */}
            {!scannedFood && (
              <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#0a0a0a", width: "100%", height: 280, marginBottom: 14 }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
                  <div style={{ color: PURPLE, marginBottom: 14, opacity: 0.85 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 52, height: 52 }}>
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>

                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 18, lineHeight: 1.5, maxWidth: 290 }}>
                    {scanLoading
                      ? (scanStatus || "Decodage en cours...")
                      : "Touche le bouton, prends une photo du code-barre. On decode automatiquement avec l'appareil photo natif."}
                  </div>

                  <button
                    onClick={triggerPhotoScan}
                    disabled={scanLoading}
                    style={{
                      background: scanLoading ? "rgba(167,139,250,0.3)" : "linear-gradient(135deg, #a78bfa, #8b5cf6)",
                      color: scanLoading ? "rgba(255,255,255,0.5)" : "#0a0a0a",
                      border: "none",
                      borderRadius: 14,
                      padding: "14px 32px",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: scanLoading ? "default" : "pointer",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      boxShadow: scanLoading ? "none" : "0 6px 24px rgba(167,139,250,0.4)",
                    }}
                  >
                    {scanLoading ? "Decodage..." : "Prendre la photo"}
                  </button>
                </div>

                {/* Input file invisible : declenche l'app camera native */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelected}
                  style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                />
              </div>
            )}

            {/* Etape 2 : produit scanne -> selection quantite */}
            {scannedFood && (
              <div style={{ marginBottom: 14 }}>
                {/* Carte produit + macros live */}
                <div style={{ padding: 16, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 18, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: "#fff", fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{scannedFood.name}</div>
                      {scannedFood.brand && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{scannedFood.brand}</div>}
                    </div>
                    <button
                      onClick={() => { setScannedFood(null); setScanQuantite(100); setScanError(""); }}
                      style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "4px 10px", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", flexShrink: 0, marginLeft: 8 }}
                    >
                      Re-scanner
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(167,139,250,0.1)", borderRadius: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 200, color: PURPLE, letterSpacing: "-1px" }}>{Math.round(scannedFood.calories * scanQuantite / 100)}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>kcal</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(2,209,186,0.08)", borderRadius: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 200, color: GREEN, letterSpacing: "-1px" }}>{(scannedFood.proteines * scanQuantite / 100).toFixed(1)}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>prot g</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(249,115,22,0.06)", borderRadius: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 200, color: ORANGE, letterSpacing: "-1px" }}>{(scannedFood.glucides * scanQuantite / 100).toFixed(1)}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>gluc g</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "10px 8px", background: "rgba(96,165,250,0.08)", borderRadius: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 200, color: BLUE, letterSpacing: "-1px" }}>{(scannedFood.lipides * scanQuantite / 100).toFixed(1)}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "1px" }}>lip g</div>
                    </div>
                  </div>
                </div>

                {/* Selecteur de quantite */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>Quantite</div>
                  {/* Quick amounts */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    {[50, 100, 150, 200, 250, 300].map(q => (
                      <button
                        key={q}
                        onClick={() => setScanQuantite(q)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 100,
                          border: `1px solid ${scanQuantite === q ? PURPLE : "rgba(255,255,255,0.08)"}`,
                          background: scanQuantite === q ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                          color: scanQuantite === q ? PURPLE : "rgba(255,255,255,0.35)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {q}g
                      </button>
                    ))}
                  </div>
                  {/* Input manuel - + */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={() => setScanQuantite(Math.max(10, scanQuantite - 10))}
                      style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >−</button>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                      <input
                        type="number"
                        value={scanQuantite}
                        onChange={e => setScanQuantite(Math.max(1, parseInt(e.target.value) || 100))}
                        style={{ flex: 1, textAlign: "center", padding: "12px", background: "transparent", border: "none", color: "#fff", fontSize: 20, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif" }}
                      />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", paddingRight: 14 }}>g</span>
                    </div>
                    <button
                      onClick={() => setScanQuantite(scanQuantite + 10)}
                      style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >+</button>
                  </div>
                </div>

                {/* CTA confirme */}
                <button
                  onClick={confirmScannedFood}
                  style={{ width: "100%", padding: 17, background: "linear-gradient(135deg, #a78bfa, #8b5cf6)", color: "#0a0a0a", border: "none", borderRadius: 18, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase" }}
                >
                  Ajouter au {selectedRepas}
                </button>
              </div>
            )}

            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 10 }}>
              Repas : <span style={{ color: PURPLE, fontWeight: 700 }}>{selectedRepas}</span>
            </div>
            {scanError && (
              <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                {scanError}
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

      {/* MODAL EDITION ALIMENT */}
      {editingFood && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setEditingFood(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end", backdropFilter: "blur(8px)" }}
        >
          <div style={{ background: "linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)", borderRadius: "28px 28px 0 0", padding: "6px 24px calc(env(safe-area-inset-bottom,0px) + 24px)", maxHeight: "92vh", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none", overflowY: "auto" }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, margin: "0 auto 18px" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 9, color: "rgba(249,115,22,0.5)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Edition</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Modifier l'aliment</div>
              </div>
              <button
                onClick={() => setEditingFood(null)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 44, height: 44, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>

            {/* Nom de l'aliment */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Nom</div>
              <input
                type="text"
                value={editAliment}
                onChange={e => setEditAliment(e.target.value)}
                placeholder="Nom de l'aliment"
                style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "#fff", fontSize: 14, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box" }}
              />
            </div>

            {/* Quantite — auto-rescale les macros au prorata */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Quantite</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>les macros se recalculent au prorata</div>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {[50, 100, 150, 200, 250, 300].map(q => (
                  <button
                    key={q}
                    onClick={() => handleEditQuantiteChange(q)}
                    style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 100, border: `1px solid ${editQuantite === q ? ORANGE : "rgba(255,255,255,0.08)"}`, background: editQuantite === q ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)", color: editQuantite === q ? ORANGE : "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    {q}g
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => handleEditQuantiteChange(Math.max(1, editQuantite - 10))}
                  style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >−</button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <input
                    type="number"
                    value={editQuantite}
                    onChange={e => handleEditQuantiteChange(e.target.value)}
                    style={{ flex: 1, textAlign: "center", padding: "10px", background: "transparent", border: "none", color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", minWidth: 0 }}
                  />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", paddingRight: 12 }}>g</span>
                </div>
                <button
                  onClick={() => handleEditQuantiteChange(editQuantite + 10)}
                  style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >+</button>
              </div>
            </div>

            {/* Macros editables manuellement */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Macros (modifiables)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Calories", value: editKcal, setter: setEditKcal, color: ORANGE, unit: "kcal", step: 1 },
                  { label: "Proteines", value: editProt, setter: setEditProt, color: GREEN, unit: "g", step: 0.1 },
                  { label: "Glucides", value: editGluc, setter: setEditGluc, color: ORANGE, unit: "g", step: 0.1 },
                  { label: "Lipides", value: editLip, setter: setEditLip, color: BLUE, unit: "g", step: 0.1 },
                ].map((m, i) => (
                  <div key={i} style={{ background: `${m.color}10`, border: `1px solid ${m.color}25`, borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <input
                        type="number"
                        step={m.step}
                        value={m.value}
                        onChange={e => m.setter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: m.color, fontSize: 18, fontWeight: 300, outline: "none", padding: 0, fontFamily: "-apple-system,Inter,sans-serif" }}
                      />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs : enregistrer + supprimer */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={deleteEditFood}
                style={{ flexShrink: 0, padding: "14px 18px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.3px" }}
              >
                Supprimer
              </button>
              <button
                onClick={saveEditFood}
                style={{ flex: 1, padding: 14, background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#000", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase" }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
