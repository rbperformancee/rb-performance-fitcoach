import React, { useState } from "react";
import { useWeightTracking } from "../hooks/useWeightTracking";
import EmptyState from "./EmptyState";
import haptic from "../lib/haptic";
import Spinner from "./Spinner";

export default function WeightChart({ clientId, client, programme, appData }) {
  const tracking = useWeightTracking(clientId);
  // Toujours utiliser tracking.weights pour avoir l optimistic update
  const weights = tracking.weights.length > 0 ? tracking.weights : (appData?.weights || []);
  const loading = tracking.loading;
  const { addWeight, deleteWeight, saveGoal } = tracking;
  const latest = weights[weights.length - 1];
  const first = weights[0];
  const diff = latest && first ? (latest.weight - first.weight).toFixed(1) : null;
  const [editGoal, setEditGoal] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [localGoal, setLocalGoal] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const _wg = localGoal != null ? localGoal : (client && client.weight_goal ? parseFloat(client.weight_goal) : null);

  const handleAdd = async () => {
    if (!newWeight || isNaN(parseFloat(newWeight))) return;
    setSaving(true);
    await addWeight(newWeight);
    setNewWeight("");
    setShowInput(false);
    setSaving(false);
    if (navigator.vibrate) navigator.vibrate([20, 10, 40]);
  };

  const vals = weights.map(w => parseFloat(w.weight));
  const latestW = latest ? parseFloat(latest.weight) : null;
  const weekDiff = diff ? parseFloat(diff) : null;
  const minV = vals.length ? Math.min(...vals) : 0;
  const maxV = vals.length ? Math.max(...vals) : 100;
  const range = maxV - minV || 1;
  const GREEN = "#02d1ba";
  const goal = _wg != null ? _wg : null;

  const getPhrase = () => {
    const isPrise = goal && latestW && goal > latestW;
    if (!weekDiff || parseFloat(weekDiff) === 0) return "Commence ton suivi. Chaque gramme compte.";
    if (isPrise) {
      if (parseFloat(weekDiff) > 0.5) return "Tu prends bien. Continue sur cette lancee.";
      if (parseFloat(weekDiff) > 0) return "Legere progression. Tu vas dans le bon sens.";
      return "Petite baisse cette semaine. Mange plus et reste focus.";
    } else {
      if (parseFloat(weekDiff) < -0.5) return "Tu es en mouvement. Continue comme ca.";
      if (parseFloat(weekDiff) < 0) return "Legere baisse. Tu vas dans le bon sens.";
      return "Petite hausse. Ajuste ton alimentation et rebondis.";
    }
  };

  const getProjection = () => {
    if (!latestW || !goal || vals.length < 2) return null;
    const firstDate = new Date(weights[0].date);
    const lastDate = new Date(weights[weights.length - 1].date);
    const daysElapsed = Math.max((lastDate - firstDate) / (24 * 3600 * 1000), 1);
    const totalChange = parseFloat(diff);
    if (Math.abs(totalChange) < 0.1) return null;
    const changePerWeek = totalChange / (daysElapsed / 7);
    const remaining = goal - latestW;
    if ((changePerWeek > 0 && remaining < 0) || (changePerWeek < 0 && remaining > 0)) return null;
    const weeksNeeded = Math.ceil(Math.abs(remaining) / Math.abs(changePerWeek));
    if (weeksNeeded > 200) return null;
    const target = new Date();
    target.setDate(target.getDate() + weeksNeeded * 7);
    return {
      date: target.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      kgLeft: Math.abs(remaining).toFixed(1),
      weeks: weeksNeeded
    };
  };

  const getHeatmap = () => {
    const days = [];
    const weightDates = new Set(weights.map(w => w.date && w.date.slice(0, 10)));
    const today = new Date();
    const todayStr = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
      days.push({ date: key, logged: weightDates.has(key) });
    }
    return days;
  };

  const proj = getProjection();
  const heatmap = getHeatmap();
  const goalPct = (() => {
    if (!latestW || !goal || vals.length === 0) return 0;
    const startW = vals[0] ? parseFloat(vals[0]) : latestW;
    const totalChange = goal - startW;
    if (Math.abs(totalChange) < 0.1) return 100;
    const currentChange = latestW - startW;
    return Math.min(Math.max(Math.round((currentChange / totalChange) * 100), 0), 100);
  })();
  const isDown = weekDiff !== null && weekDiff < 0;

  const W = 420, H = 120, padY = 10;
  const toX = (i) => (i / Math.max(vals.length - 1, 1)) * W;
  const toY = (v) => H - padY - ((v - minV) / range) * (H - padY * 2);
  const pathD = vals.length > 1 ? vals.map((v, i) => (i === 0 ? "M" : "L") + toX(i).toFixed(1) + "," + toY(v).toFixed(1)).join(" ") : "";
  const areaD = vals.length > 1 ? "M" + toX(0).toFixed(1) + "," + H + " " + vals.map((v, i) => "L" + toX(i).toFixed(1) + "," + toY(v).toFixed(1)).join(" ") + " L" + toX(vals.length - 1).toFixed(1) + "," + H + " Z" : "";
  const goalY = goal ? toY(goal) : -9999;

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)", opacity: loading ? 0 : 1, transition: "opacity 0.4s ease" }}>

      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: "radial-gradient(ellipse, rgba(2,209,186,0.08) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ padding: "0px 24px 0", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>Suivi</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>Body<span style={{ color: "#02d1ba" }}>.</span></div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic", marginBottom: 20 }}>
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", lineHeight: 1 }}>
              <span style={{ fontSize: 88, fontWeight: 100, letterSpacing: "-6px", color: "#fff" }}>{latestW ? Math.floor(latestW) : "--"}</span>
              <span style={{ fontSize: 36, fontWeight: 200, color: "rgba(255,255,255,0.35)", letterSpacing: "-2px", paddingBottom: 12 }}>{latestW ? "." + latestW.toFixed(1).split(".")[1] : ""}</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 2 }}>kilogrammes</div>
          </div>

          <svg width={64} height={64} viewBox="0 0 64 64" style={{ flexShrink: 0, marginTop: 8 }}>
            <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
            <circle cx={32} cy={32} r={26} fill="none" stroke={GREEN} strokeWidth={4} strokeLinecap="round"
              strokeDasharray={163.4} strokeDashoffset={163.4 * (1 - goalPct / 100)} transform="rotate(-90 32 32)" />
            <text x={32} y={29} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8} fontFamily="-apple-system,sans-serif">objectif</text>
            <text x={32} y={41} textAnchor="middle" fill="#02d1ba" fontSize={11} fontWeight={600} fontFamily="-apple-system,sans-serif">{goalPct}%</text>
          </svg>
        </div>

        {weekDiff !== null && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isDown ? "rgba(2,209,186,0.08)" : "rgba(239,68,68,0.08)", border: "1px solid " + (isDown ? "rgba(2,209,186,0.2)" : "rgba(239,68,68,0.2)"), borderRadius: 100, padding: "5px 16px", fontSize: 13, color: isDown ? GREEN : "rgba(239,68,68,0.9)", fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isDown ? GREEN : "rgba(239,68,68,0.9)", display: "inline-block" }} />
              {weekDiff > 0 ? "+" : ""}{weekDiff} kg depuis le debut
            </span>
          </div>
        )}

        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic", marginBottom: 28, lineHeight: 1.6 }}>
          " {getPhrase()} "<br />
          <span style={{ fontSize: 10, color: "rgba(2,209,186,0.4)", fontStyle: "normal", letterSpacing: "1px" }}>RB PERFORM</span>
        </div>
      </div>

      <div style={{ margin: "0 0 28px", position: "relative", zIndex: 1 }}>
        {vals.length > 1 ? (
          <svg width="100%" height={120} viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none">
            <defs>
              <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.25} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            {goal && <line x1={0} y1={goalY} x2={W} y2={goalY} stroke="rgba(2,209,186,0.2)" strokeWidth={1} strokeDasharray="8,5" />}
            {goal && <text x={8} y={goalY - 4} fill="rgba(2,209,186,0.4)" fontSize={9} fontFamily="-apple-system,sans-serif">Objectif {goal}kg</text>}
            <path d={areaD} fill="url(#wg2)" />
            <path d={pathD} fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={toX(vals.length - 1)} cy={toY(vals[vals.length - 1])} r={5} fill={GREEN} />
            <circle cx={toX(vals.length - 1)} cy={toY(vals[vals.length - 1])} r={12} fill="rgba(2,209,186,0.12)" />
          </svg>
        ) : (
          <EmptyState
            icon="scale"
            title="Ta premiere pesee."
            subtitle="Pese-toi ce matin pour voir ton evolution ici."
            size="md"
            style={{ padding: "24px 16px 12px" }}
          />
        )}
      </div>

      <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 28, position: "relative", zIndex: 1 }}>
        {[
          { label: "Minimum", value: vals.length ? Math.min(...vals).toFixed(1) : "--", accent: false },
          { label: "Moyenne", value: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "--", accent: true },
          { label: "Maximum", value: vals.length ? Math.max(...vals).toFixed(1) : "--", accent: false },
        ].map((s, i) => (
          <div key={i} style={{ borderTop: "1px solid " + (s.accent ? GREEN : "rgba(255,255,255,0.06)"), borderTopWidth: s.accent ? 2 : 1, paddingTop: 14, paddingRight: i < 2 ? 8 : 0 }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: s.accent ? GREEN : "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 24px", marginBottom: 28, position: "relative", zIndex: 1 }}>
        {goal ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Objectif · {goal} kg</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>{goalPct}% atteint</span>
                <button onClick={() => setEditGoal(true)} style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2px 8px", cursor: "pointer" }}>Modifier</button>
              </div>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", width: goalPct + "%", background: GREEN, borderRadius: 1, boxShadow: "0 0 8px rgba(2,209,186,0.4)" }} />
            </div>
          </>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Definis ton objectif de poids</div>
            {editGoal ? (
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" inputMode="decimal" step="0.1" placeholder="Ex: 75" value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  style={{ flex: 1, background: "transparent", border: "1px solid rgba(2,209,186,0.3)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 15, outline: "none" }} />
                <button
                  onClick={async () => { const g = parseFloat(newGoal); if (isNaN(g) || savingGoal) return; setSavingGoal(true); haptic.success(); try { await saveGoal(g); setLocalGoal(g); setEditGoal(false); setNewGoal(""); } finally { setSavingGoal(false); } }}
                  disabled={savingGoal}
                  style={{ background: GREEN, color: "#000", border: "none", borderRadius: 12, padding: "12px 18px", fontWeight: 700, cursor: savingGoal ? "default" : "pointer", minWidth: 60, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: savingGoal ? 0.7 : 1 }}>{savingGoal ? <Spinner variant="dots" size={14} color="#000" /> : "OK"}</button>
              </div>
            ) : (
              <button onClick={() => setEditGoal(true)}
                style={{ background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 12, padding: "12px 20px", color: GREEN, fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%" }}>
                + Definir mon objectif
              </button>
            )}
          </div>
        )}
        {editGoal && goal && (
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input type="number" inputMode="decimal" step="0.1" placeholder={"Actuel: " + goal + " kg"} value={newGoal}
              onChange={e => setNewGoal(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "1px solid rgba(2,209,186,0.3)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 15, outline: "none" }} />
            <button onClick={async () => { const g = parseFloat(newGoal); if (isNaN(g)) return; haptic.success(); await saveGoal(g); setLocalGoal(g); setEditGoal(false); setNewGoal(""); }}
              style={{ background: GREEN, color: "#000", border: "none", borderRadius: 12, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>OK</button>
            <button onClick={() => setEditGoal(false)}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>✕</button>
          </div>
        )}
      </div>

      <div style={{ margin: "0 24px 28px", height: 1, background: "rgba(255,255,255,0.06)" }} />

      <div style={{ padding: "0 24px", marginBottom: 28, position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>Projection</div>
        {proj ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { dot: GREEN, label: "Aujourd hui", val: latestW ? latestW.toFixed(1) + " kg" : "--" },
              { dot: "rgba(255,255,255,0.2)", label: "Objectif atteint le", val: proj.date },
              { dot: "rgba(129,140,248,0.7)", label: goal > latestW ? "Reste a prendre" : "Reste a perdre", val: proj.kgLeft + " kg" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", flex: 1 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: GREEN, fontWeight: 500 }}>{r.val}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)" }}>Ajoute plusieurs pesees pour voir ta projection</div>
        )}
      </div>

      <div style={{ margin: "0 24px 28px", height: 1, background: "rgba(255,255,255,0.06)" }} />

      <div style={{ padding: "0 24px", marginBottom: 28, position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>Signal · Bruit</div>
        {(() => {
          if (vals.length < 3) return (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)" }}>Ajoute plus de pesees pour analyser tes variations.</div>
          );
          const diffs = vals.slice(1).map((v, i) => Math.abs(v - vals[i]));
          const noise = (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(2);
          const lastDiff = vals.length >= 2 ? Math.abs(vals[vals.length - 1] - vals[vals.length - 2]) : 0;
          const isNoise = lastDiff === 0 || lastDiff <= parseFloat(noise);
          const fakeAlerts = diffs.filter(d => d <= parseFloat(noise)).length;
          const realSignals = diffs.filter(d => d > parseFloat(noise)).length;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(2,209,186,0.05)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Variation naturelle quotidienne</div>
                  <div style={{ fontSize: 24, fontWeight: 200, color: GREEN, letterSpacing: "-1px" }}>± {noise} kg</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 4 }}>Ignorer si</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{"<"} {noise} kg</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "12px 14px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12 }}>
                  <div style={{ fontSize: 9, color: "rgba(239,68,68,0.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Fausses alertes</div>
                  <div style={{ fontSize: 22, fontWeight: 200, color: "rgba(239,68,68,0.8)" }}>{fakeAlerts}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>variations normales</div>
                </div>
                <div style={{ flex: 1, padding: "12px 14px", background: "rgba(2,209,186,0.05)", border: "1px solid rgba(2,209,186,0.12)", borderRadius: 12 }}>
                  <div style={{ fontSize: 9, color: "rgba(2,209,186,0.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Vrais signaux</div>
                  <div style={{ fontSize: 22, fontWeight: 200, color: GREEN }}>{realSignals}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>vraies tendances</div>
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12, fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic", lineHeight: 1.6 }}>
                {(() => {
                  const isPrise = goal && latestW && goal > latestW;
                  const lastVal = vals[vals.length - 1];
                  const prevVal = vals[vals.length - 2];
                  const isProgres = isPrise ? lastVal > prevVal : lastVal < prevVal;
                  if (lastDiff === 0) return `" Aucune variation depuis ta derniere pesee. Pese-toi regulierement pour suivre ta progression. "`;
                  if (isNoise) return `" Ta variation de ${lastDiff.toFixed(2)} kg est du bruit normal. Continue sur ta lancee. "`;
                  if (isProgres) return `" ${lastDiff.toFixed(2)} kg ${isPrise ? "de prise" : "de perte"} — un vrai signal positif. Bien joue. "`;
                  return `" ${lastDiff.toFixed(2)} kg dans le mauvais sens — un vrai signal. Analyse ta semaine. "`;
                })()}
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ margin: "0 24px 28px", height: 1, background: "rgba(255,255,255,0.06)" }} />

      <div style={{ padding: "0 24px", marginBottom: 32, position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>Regularite des pesees</div>
        <div style={{ display: "flex", gap: "4px", marginBottom: 6 }}>
          {["L","M","M","J","V","S","D"].map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.15)" }}>{d}</div>
          ))}
        </div>
        {selectedDay && (
          <div onClick={() => setSelectedDay(null)} style={{ position: "relative", marginBottom: 12, padding: "14px 16px", background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.25)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(2,209,186,0.6)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
                {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div style={{ fontSize: 28, fontWeight: 200, color: "#fff", letterSpacing: "-1px" }}>
                {selectedDay.weight} <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>kg</span>
              </div>
            </div>
            <button onClick={async (e) => {
              e.stopPropagation();
              await deleteWeight(selectedDay.date);
              setSelectedDay(null);
            }} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, color: "#ef4444", flexShrink: 0 }}>✕</button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {(() => {
            const firstDay = heatmap.length > 0 ? new Date(heatmap[0].date).getDay() : 1;
            const offset = firstDay === 0 ? 6 : firstDay - 1;
            const cells = [];
            for (let i = 0; i < offset; i++) cells.push(<div key={"e"+i} style={{ height: 20 }} />);
            heatmap.forEach((day, i) => {
              const weightEntry = weights.find(w => w.date && w.date.slice(0,10) === day.date);
              cells.push(
                <div key={i} onClick={() => day.logged && weightEntry ? setSelectedDay({ date: day.date, weight: weightEntry.weight }) : null}
                  style={{ height: 20, borderRadius: 4, background: day.logged ? GREEN : "rgba(255,255,255,0.05)", opacity: day.logged ? 0.9 : 1, cursor: day.logged ? "pointer" : "default", transition: "all 0.15s", border: selectedDay && selectedDay.date === day.date ? "1.5px solid #fff" : "1.5px solid transparent" }} />
              );
            });
            return cells;
          })()}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,255,255,0.08)", display: "inline-block" }} /> Pas de pesee
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: GREEN, display: "inline-block" }} /> Pesee enregistree
          </span>
        </div>
      </div>

      <div style={{ padding: "0 24px", position: "relative", zIndex: 1 }}>
        {showInput ? (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input type="number" inputMode="decimal" step="0.1" placeholder="Ex: 75.5" value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              style={{ flex: 1, background: "transparent", border: "1px solid rgba(2,209,186,0.3)", borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none" }} />
            <button onClick={handleAdd} disabled={saving}
              style={{ background: GREEN, color: "#000", border: "none", borderRadius: 14, padding: "14px 20px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              {saving ? "..." : "OK"}
            </button>
          </div>
        ) : (
          <button onClick={() => setShowInput(true)}
            style={{ width: "100%", padding: "19px 24px", borderRadius: 18, border: "none", background: GREEN, color: "#000", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 50%)", pointerEvents: "none" }} />
            <span>Ajouter une pesee</span>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
