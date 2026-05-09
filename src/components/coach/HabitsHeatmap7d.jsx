import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const G = "#02d1ba";

/**
 * HabitsHeatmap7d — vue coach 7 jours × N habitudes du client.
 *
 * Charge les habits actives + tous les habit_logs des 7 derniers jours.
 * Render : 1 row par habit, 7 cellules (Lun→Dim).
 *   - Cellule verte = coché ce jour-là
 *   - Cellule grise = pas coché
 *   - Today highlighté
 *
 * Hidden si 0 habit active (cohérent avec HabitsCard côté client).
 */
export default function HabitsHeatmap7d({ clientId }) {
  const [habits, setHabits] = useState([]);
  const [logsByHabit, setLogsByHabit] = useState({}); // habit_id → Set<date>
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceStr = since.toISOString().slice(0, 10);

      const [{ data: hs }, { data: lgs }] = await Promise.all([
        supabase.from("habits")
          .select("id, name, icon, color, ordre")
          .eq("client_id", clientId)
          .eq("active", true)
          .order("ordre", { ascending: true }),
        supabase.from("habit_logs")
          .select("habit_id, date")
          .eq("client_id", clientId)
          .gte("date", sinceStr),
      ]);
      if (cancelled) return;
      setHabits(hs || []);
      const map = {};
      (lgs || []).forEach((l) => {
        if (!map[l.habit_id]) map[l.habit_id] = new Set();
        map[l.habit_id].add(l.date);
      });
      setLogsByHabit(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading || habits.length === 0) return null;

  // Streak par habit (jours consécutifs jusqu'à aujourd'hui ou hier)
  function computeStreak(datesSet) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    let streak = 0;
    let cur = new Date(today);
    if (!datesSet.has(todayStr)) {
      if (!datesSet.has(yesterdayStr)) return 0;
      cur = yesterday;
    }
    while (true) {
      const s = cur.toISOString().slice(0, 10);
      if (datesSet.has(s)) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else break;
    }
    return streak;
  }

  // 7 derniers jours du plus ancien (gauche) au plus récent (droite, today)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("fr-FR", { weekday: "narrow" }),
      isToday: i === 0,
    });
  }

  // Compute global compliance % (last 7 days)
  let totalCells = habits.length * 7;
  let donCells = 0;
  habits.forEach((h) => {
    const set = logsByHabit[h.id];
    if (set) days.forEach((d) => { if (set.has(d.date)) donCells++; });
  });
  const compliancePct = totalCells > 0 ? Math.round((donCells / totalCells) * 100) : 0;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
          7 derniers jours
        </div>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: ".05em",
          color: compliancePct >= 75 ? "#34d399" : compliancePct >= 50 ? G : "#fbbf24",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {compliancePct}%
        </div>
      </div>
      <div style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 10,
      }}>
        {/* Header jours */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) repeat(7, 22px)", gap: 4, marginBottom: 6, alignItems: "center" }}>
          <div />
          {days.map((d, i) => (
            <div key={i} style={{
              fontSize: 8, fontWeight: 700,
              color: d.isToday ? G : "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              textAlign: "center",
            }}>
              {d.label}
            </div>
          ))}
        </div>
        {/* Rows habit */}
        {habits.map((h) => {
          const set = logsByHabit[h.id] || new Set();
          const c = h.color || G;
          const streak = computeStreak(set);
          return (
            <div key={h.id} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) repeat(7, 22px)", gap: 4, marginBottom: 4, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {h.icon && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: c,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "1px 4px",
                    background: `${c}15`, borderRadius: 3,
                    flexShrink: 0,
                  }}>{h.icon}</span>
                )}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{h.name}</span>
                {streak >= 2 && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: "0.3px",
                    color: streak >= 7 ? "#fbbf24" : c,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}>
                    {streak}j
                  </span>
                )}
              </div>
              {days.map((d) => {
                const checked = set.has(d.date);
                return (
                  <div key={d.date} style={{
                    width: 22, height: 22,
                    background: checked ? c : "rgba(255,255,255,0.04)",
                    border: d.isToday ? `1px solid ${checked ? c : "rgba(255,255,255,0.18)"}` : `1px solid ${checked ? c : "transparent"}`,
                    borderRadius: 4,
                    boxShadow: checked ? `0 0 6px ${c}30` : "none",
                  }} />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
