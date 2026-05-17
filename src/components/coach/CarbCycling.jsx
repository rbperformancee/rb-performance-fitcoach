import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";

/**
 * CarbCycling — éditeur coach des "types de jour" nutrition d'un client
 * et du planning hebdomadaire (carb cycling).
 *
 * Autonome : charge / sauve directement via Supabase (RLS migration 084).
 * Tant que le carb cycling est désactivé, l'objectif unique nutrition_goals
 * reste utilisé — ce composant n'y touche pas.
 */

const ORANGE = "#f97316";
const DAYS = [
  { wd: 1, label: "Lun" }, { wd: 2, label: "Mar" }, { wd: 3, label: "Mer" },
  { wd: 4, label: "Jeu" }, { wd: 5, label: "Ven" }, { wd: 6, label: "Sam" },
  { wd: 0, label: "Dim" },
];
const MACROS = [
  { key: "calories", label: "kcal" },
  { key: "proteines", label: "P" },
  { key: "glucides", label: "G" },
  { key: "lipides", label: "L" },
];
const num = (v) => Math.max(0, parseInt(String(v).replace(/[^0-9]/g, "")) || 0);

export default function CarbCycling({ clientId }) {
  const [dayTypes, setDayTypes] = useState([]);
  const [schedule, setSchedule] = useState({}); // { "<weekday>": dayTypeId }
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [dt, ng] = await Promise.all([
      supabase.from("nutrition_day_types").select("*").eq("client_id", clientId).order("position"),
      supabase.from("nutrition_goals").select("carb_cycle_schedule").eq("client_id", clientId).maybeSingle(),
    ]);
    const types = dt.data || [];
    const sched = ng.data?.carb_cycle_schedule || {};
    setDayTypes(types);
    setSchedule(sched || {});
    setEnabled(Object.keys(sched || {}).length > 0 && types.length > 0);
    setLoading(false);
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  async function saveSchedule(ns) {
    await supabase.from("nutrition_goals").upsert(
      { client_id: clientId, carb_cycle_schedule: Object.keys(ns).length ? ns : null },
      { onConflict: "client_id" },
    );
  }

  async function addDayType() {
    const { data } = await supabase.from("nutrition_day_types").insert({
      client_id: clientId,
      label: dayTypes.length === 0 ? "Jour high-carb" : "Nouveau jour",
      position: dayTypes.length,
      calories: 2000, proteines: 150, glucides: 250, lipides: 70,
    }).select().single();
    if (data) setDayTypes((p) => [...p, data]);
  }

  function patchLocal(id, field, value) {
    setDayTypes((p) => p.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }
  async function saveDayType(d) {
    await supabase.from("nutrition_day_types").update({
      label: (d.label || "").trim() || "Jour",
      calories: num(d.calories), proteines: num(d.proteines),
      glucides: num(d.glucides), lipides: num(d.lipides),
    }).eq("id", d.id);
  }
  async function deleteDayType(id) {
    await supabase.from("nutrition_day_types").delete().eq("id", id);
    setDayTypes((p) => p.filter((d) => d.id !== id));
    const ns = { ...schedule };
    Object.keys(ns).forEach((k) => { if (ns[k] === id) delete ns[k]; });
    setSchedule(ns);
    await saveSchedule(ns);
  }
  async function setDay(wd, dayTypeId) {
    const ns = { ...schedule };
    if (dayTypeId) ns[String(wd)] = dayTypeId; else delete ns[String(wd)];
    setSchedule(ns);
    await saveSchedule(ns);
  }
  async function toggle() {
    if (enabled) {
      setEnabled(false);
      setSchedule({});
      await saveSchedule({});
    } else {
      setEnabled(true);
      if (dayTypes.length === 0) await addDayType();
    }
  }

  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, marginTop: 16 };
  const inp = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 9px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" };

  if (loading) return <div style={{ ...card, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Chargement…</div>;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Carb cycling</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            Macros différentes selon le jour de la semaine.
          </div>
        </div>
        <button
          onClick={toggle}
          style={{
            width: 44, height: 26, borderRadius: 100, border: "none", flexShrink: 0, position: "relative",
            background: enabled ? ORANGE : "rgba(255,255,255,0.14)", cursor: "pointer", transition: "background .2s",
          }}
          aria-label="Activer le carb cycling"
        >
          <span style={{ position: "absolute", top: 3, left: enabled ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Types de jour */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {dayTypes.map((d) => (
              <div key={d.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <input
                    value={d.label}
                    onChange={(e) => patchLocal(d.id, "label", e.target.value)}
                    onBlur={() => saveDayType(d)}
                    placeholder="Nom du jour"
                    style={{ ...inp, fontWeight: 700 }}
                  />
                  <button
                    onClick={() => deleteDayType(d.id)}
                    style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: 14 }}
                    aria-label="Supprimer"
                  >×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {MACROS.map((m) => (
                    <div key={m.key}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
                      <input
                        value={d[m.key]}
                        inputMode="numeric"
                        onChange={(e) => patchLocal(d.id, m.key, e.target.value)}
                        onBlur={() => saveDayType(d)}
                        style={{ ...inp, fontFamily: "'JetBrains Mono', monospace" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={addDayType}
              style={{ alignSelf: "flex-start", background: "rgba(249,115,22,0.1)", border: `1px solid ${ORANGE}40`, borderRadius: 8, padding: "7px 12px", color: ORANGE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >+ Ajouter un type de jour</button>
          </div>

          {/* Planning hebdo */}
          {dayTypes.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Planning de la semaine</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DAYS.map((day) => (
                  <div key={day.wd} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 36, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{day.label}</span>
                    <select
                      value={schedule[String(day.wd)] || ""}
                      onChange={(e) => setDay(day.wd, e.target.value)}
                      style={{ ...inp, cursor: "pointer", flex: 1 }}
                    >
                      <option value="">— (objectif par défaut)</option>
                      {dayTypes.map((d) => (
                        <option key={d.id} value={d.id}>{d.label} · {num(d.calories)} kcal</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
