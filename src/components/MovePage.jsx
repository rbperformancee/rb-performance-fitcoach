import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const GREEN = "#34d399";
const RED = "#ef4444";

export default function MovePage({ client }) {
  const [runs, setRuns] = useState([]);
  const [dailySteps, setDailySteps] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(8000);
  const [weekRuns, setWeekRuns] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ distance: "", heures: "0", minutes: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [tempSteps, setTempSteps] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    const [runsRes, trackingRes, goalsRes] = await Promise.all([
      supabase.from("run_logs").select("*").eq("client_id", client.id).order("date", { ascending: false }).limit(10),
      supabase.from("daily_tracking").select("*").eq("client_id", client.id).eq("date", today).single(),
      supabase.from("nutrition_goals").select("pas").eq("client_id", client.id).single(),
    ]);
    setRuns(runsRes.data || []);
    setDailySteps(trackingRes.data?.pas || 0);
    setTempSteps(trackingRes.data?.pas || 0);
    setStepsGoal(goalsRes.data?.pas || 8000);

    // Calcul km cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekData = (runsRes.data || []).filter(r => new Date(r.date) >= weekAgo);
    setWeekRuns(weekData);
    setLoading(false);
  }, [client?.id, today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveSteps = async (steps) => {
    setDailySteps(steps);
    await supabase.from("daily_tracking").upsert({
      client_id: client.id, date: today, pas: steps
    }, { onConflict: "client_id,date" });
  };

  const addRun = async () => {
    if (!form.distance || !form.minutes) return;
    setSaving(true);
    const dist = parseFloat(form.distance);
    const totalMin = (parseInt(form.heures || 0) * 60) + (parseInt(form.minutes || 0));
    const allureTotalSec = Math.round((totalMin / dist) * 60);
    const allureMin = Math.floor(allureTotalSec / 60);
    const allureSec = allureTotalSec % 60;
    const allure = `${allureMin}:${String(allureSec).padStart(2, "0")}`;

    const { data } = await supabase.from("run_logs").insert({
      client_id: client.id,
      date: today,
      distance_km: dist,
      duree_min: totalMin,
      allure_min_km: allure,
      note: form.note || "",
    }).select().single();

    if (data) setRuns(prev => [data, ...prev]);
    setForm({ distance: "", heures: "0", minutes: "", note: "" });
    setShowAdd(false);
    setSaving(false);
    if (navigator.vibrate) navigator.vibrate([30, 10, 60]);
    // Log XP dans session_logs pour que useXP le compte
    await supabase.from("session_logs").insert({
      client_id: client.id,
      session_name: "Course · " + form.distance + " km",
      programme_name: "Move",
      logged_at: new Date().toISOString(),
    }).then(() => {});
  };

  const stepsPct = Math.min(Math.round((dailySteps / stepsGoal) * 100), 100);
  const weekKm = weekRuns.reduce((a, r) => a + (r.distance_km || 0), 0);
  const avgAllure = runs.length > 0 ? runs[0].allure_min_km : "--";

  const getWeekBars = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = ["D","L","M","M","J","V","S"][d.getDay()];
      const run = runs.find(r => r.date === key);
      days.push({ label, km: run?.distance_km || 0, isToday: key === today });
    }
    return days;
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", padding: "0px 24px" }}>
      {[80, 60, 140, 100].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 16 }} />
      ))}
    </div>
  );

  const bars = getWeekBars();
  const maxKm = Math.max(...bars.map(b => b.km), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: 100, opacity: loading ? 0 : 1, transition: "opacity 0.4s ease" }}>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.09) 0%, transparent 55%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}
        <div style={{ padding: "8px 24px 0" }}>
          <div style={{ fontSize: 10, color: "rgba(239,68,68,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>Activite</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>Run<span style={{ color: RED }}>.</span></div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        {/* PAS HERO */}
        <div style={{ padding: "0 24px", marginBottom: 20 }} onClick={() => setShowSteps(true)}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>Pas aujourd hui</div>
          <div style={{ fontSize: 72, fontWeight: 100, color: "#fff", letterSpacing: "-4px", lineHeight: 1, marginBottom: 6, cursor: "pointer" }}>
            {dailySteps.toLocaleString()}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Objectif {stepsGoal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>{stepsPct}%</div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: stepsPct + "%", background: `linear-gradient(90deg, ${GREEN}, #02d1ba)`, borderRadius: 2, transition: "width 0.8s ease" }} />
          </div>
        </div>

        {/* STATS TESLA */}
        <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 4 }}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, paddingRight: 8 }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: RED, letterSpacing: "-1.5px", lineHeight: 1 }}>{weekKm.toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>km</span></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>Cette semaine</div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, paddingRight: 8 }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: "rgba(239,68,68,0.6)", letterSpacing: "-1.5px", lineHeight: 1 }}>{avgAllure}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>/km</span></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>Allure moy.</div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 200, color: "rgba(239,68,68,0.4)", letterSpacing: "-1.5px", lineHeight: 1 }}>{weekRuns.length}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}> sorties</span></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>Ce mois</div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(239,68,68,0.3) 0%, rgba(255,255,255,0.04) 100%)", margin: "20px 24px" }} />

        {/* RECORD PERSONNEL */}
        {(() => {
          if (runs.length === 0) return null;
          const allures = runs.filter(r => r.allure_min_km && r.allure_min_km !== "--").map(r => {
            const [m, s] = r.allure_min_km.split(":").map(Number);
            return { sec: m * 60 + s, run: r };
          });
          if (allures.length === 0) return null;
          const best = allures.reduce((a, b) => a.sec < b.sec ? a : b);
          const last = allures[0];
          const lastSec = last.sec;
          const bestSec = best.sec;
          const pct = Math.min(Math.round((bestSec / lastSec) * 100), 100);
          const isRecord = last.run.id === best.run.id;
          const bestMin = Math.floor(bestSec / 60);
          const bestS = String(bestSec % 60).padStart(2, "0");
          return (
            <div style={{ padding: "0 24px", marginBottom: 20 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isRecord ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, padding: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>Record personnel</div>
                    <div style={{ fontSize: 44, fontWeight: 100, color: RED, letterSpacing: "-2px", lineHeight: 1 }}>{bestMin}:{bestS}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}> min/km</span></div>
                  </div>
                  {isRecord && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 100, padding: "6px 14px", fontSize: 11, color: RED, fontWeight: 700, flexShrink: 0 }}>Nouveau !</div>
                  )}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Derniere sortie vs record</div>
                    <div style={{ fontSize: 11, color: pct >= 95 ? RED : "rgba(255,255,255,0.3)", fontWeight: 600 }}>{pct}%</div>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: pct + "%", background: pct >= 95 ? RED : "rgba(239,68,68,0.4)", borderRadius: 2, transition: "width 0.8s ease" }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
                  {isRecord ? `" Nouveau record ! Tu repousses tes limites. "` : pct >= 95 ? `" Tout pres de ton record. Encore un effort. "` : `" Continue — chaque sortie te rapproche de ton record. "`}
                </div>
              </div>
            </div>
          );
        })()}

        {/* GRAPHIQUE SEMAINE */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>Cette semaine</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: Math.max((b.km / maxKm) * 48, b.km > 0 ? 4 : 2) + "px", background: b.km > 0 ? (b.isToday ? RED : `rgba(239,68,68,${b.km / maxKm * 0.6 + 0.15})`) : "rgba(255,255,255,0.04)", borderRadius: "3px 3px 0 0", transition: "height 0.5s ease" }} />
                {b.km > 0 && <div style={{ fontSize: 8, color: "rgba(239,68,68,0.6)" }}>{b.km.toFixed(1)}</div>}
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 24px 20px" }} />

        {/* HISTORIQUE COURSES */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase" }}>Historique</div>
            <button onClick={() => setShowAdd(true)} style={{ background: RED, color: "#fff", border: "none", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Sortie</button>
          </div>

          {runs.length === 0 ? (
            <div onClick={() => setShowAdd(true)} style={{ padding: "24px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 16, textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 6 }}>Aucune sortie enregistree</div>
              <div style={{ fontSize: 11, color: "rgba(239,68,68,0.5)" }}>+ Ajouter ta premiere course</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {runs.map((run, i) => {
                const opacity = Math.max(1 - i * 0.15, 0.3);
                const color = `rgba(239,68,68,${opacity})`;
                return (
                  <div key={run.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14 }}>
                    <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                        {run.note || "Sortie course"}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                        {new Date(run.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })} · {run.distance_km} km · {run.duree_min} min
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, color, fontWeight: 600 }}>{run.allure_min_km}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>min/km</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL AJOUTER SORTIE */}
      {showAdd && (
        <div onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Nouvelle sortie</div>
              <button onClick={() => setShowAdd(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 100, width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer" }}>x</button>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Distance (km)</div>
                <input type="number" step="0.1" value={form.distance} onChange={e => setForm(p => ({ ...p, distance: e.target.value }))} placeholder="6.2" style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1, display: "flex", gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Heures</div>
                  <input type="number" min="0" max="10" value={form.heures} onChange={e => setForm(p => ({ ...p, heures: e.target.value }))} placeholder="0" style={{ width: "100%", padding: "14px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box", textAlign: "center" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Minutes</div>
                  <input type="number" min="0" max="59" value={form.minutes} onChange={e => setForm(p => ({ ...p, minutes: e.target.value }))} placeholder="35" style={{ width: "100%", padding: "14px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 18, fontWeight: 300, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box", textAlign: "center" }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Note (optionnel)</div>
              <input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Footing matin, trail..." style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#fff", fontSize: 15, outline: "none", fontFamily: "-apple-system,Inter,sans-serif", boxSizing: "border-box" }} />
            </div>

            {form.distance && form.duree && (() => {
              const dist = parseFloat(form.distance);
              const totalMin = (parseInt(form.heures || 0) * 60) + (parseInt(form.minutes || 0));
              if (dist > 0 && totalMin > 0) {
                const allureSec = Math.round((totalMin / dist) * 60);
                const aMin = Math.floor(allureSec / 60);
                const aSec = allureSec % 60;
                return (
                  <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Allure calculee</div>
                    <div style={{ fontSize: 20, color: RED, fontWeight: 600 }}>{aMin}:{String(aSec).padStart(2, "0")} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>min/km</span></div>
                  </div>
                );
              }
              return null;
            })()}

            <button onClick={addRun} disabled={saving || !form.distance || !form.minutes} style={{ width: "100%", padding: 16, background: form.distance && form.minutes ? RED : "rgba(255,255,255,0.06)", color: form.distance && form.duree ? "#fff" : "rgba(255,255,255,0.2)", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: form.distance && form.minutes ? "pointer" : "not-allowed" }}>
              {saving ? "Enregistrement..." : "Enregistrer la sortie"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL PAS */}
      {showSteps && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowSteps(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#111", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Nombre de pas</div>
            <div style={{ fontSize: 52, fontWeight: 100, color: GREEN, textAlign: "center", marginBottom: 20, letterSpacing: "-2px" }}>
              {tempSteps.toLocaleString()}
            </div>
            <input type="range" min="0" max="20000" step="100" value={tempSteps}
              onChange={e => setTempSteps(parseInt(e.target.value))}
              style={{ width: "100%", marginBottom: 16, accentColor: GREEN }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 20 }}>
              <span>0</span><span>10 000</span><span>20 000</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[1000, 2000, 5000, 10000].map(v => (
                <button key={v} onClick={() => setTempSteps(Math.min(tempSteps + v, 20000))} style={{ flex: 1, padding: "10px 0", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, color: GREEN, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+{v >= 1000 ? v/1000 + "k" : v}</button>
              ))}
            </div>
            <button onClick={() => { saveSteps(tempSteps); setShowSteps(false); }} style={{ width: "100%", padding: 14, background: GREEN, color: "#000", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
          </div>
        </div>
      )}

    </div>
  );
}
