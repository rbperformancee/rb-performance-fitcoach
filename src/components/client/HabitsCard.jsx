import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import haptic from "../../lib/haptic";
import { toast } from "../Toast";

const G = "#02d1ba";

/**
 * HabitsCard — checklist quotidienne des habitudes assignées par le coach.
 *
 * Le coach assigne 3-5 habitudes (cf. migration 058). Le client coche chaque
 * jour. Streak counter = nombre de jours consécutifs avec au moins X% des
 * habitudes complétées (à définir UI side).
 *
 * Affiché si le client a au moins 1 habitude active. Sinon retourne null.
 */
export default function HabitsCard({ clientId }) {
  const [habits, setHabits] = useState([]);
  const [todayLogs, setTodayLogs] = useState({}); // { habit_id: log_id }
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const [{ data: hs }, { data: lgs }] = await Promise.all([
        supabase.from("habits")
          .select("id, name, icon, color, ordre")
          .eq("client_id", clientId)
          .eq("active", true)
          .order("ordre", { ascending: true }),
        supabase.from("habit_logs")
          .select("id, habit_id")
          .eq("client_id", clientId)
          .eq("date", today),
      ]);
      if (cancelled) return;
      setHabits(hs || []);
      const map = {};
      (lgs || []).forEach((l) => { map[l.habit_id] = l.id; });
      setTodayLogs(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientId, today]);

  if (loading) return null;
  if (habits.length === 0) return null;

  async function toggle(habit) {
    const existingLogId = todayLogs[habit.id];
    if (existingLogId) {
      // Décocher
      haptic.light();
      const { error } = await supabase.from("habit_logs").delete().eq("id", existingLogId);
      if (error) { toast.error("Erreur"); return; }
      setTodayLogs((m) => { const x = { ...m }; delete x[habit.id]; return x; });
    } else {
      // Cocher
      haptic.medium();
      const { data, error } = await supabase.from("habit_logs").insert({
        habit_id: habit.id,
        client_id: clientId,
        date: today,
      }).select("id").single();
      if (error) { toast.error("Erreur"); return; }
      setTodayLogs((m) => ({ ...m, [habit.id]: data.id }));
    }
  }

  const doneCount = Object.keys(todayLogs).length;
  const allDone = doneCount === habits.length;

  return (
    <div style={{
      margin: "0 24px 20px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 18,
      padding: "16px 18px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: `radial-gradient(circle, ${G}10 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative" }}>
        <div>
          <div style={{ fontSize: 9, color: G, letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>
            Habitudes du jour
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
            {doneCount} / {habits.length} {allDone && "✓"}
          </div>
        </div>
        <div style={{ width: 44, height: 44, position: "relative" }}>
          <svg width={44} height={44} viewBox="0 0 44 44">
            <circle cx={22} cy={22} r={18} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
            <circle cx={22} cy={22} r={18} fill="none"
              stroke={allDone ? "#34d399" : G}
              strokeWidth={3} strokeLinecap="round"
              strokeDasharray={113.1}
              strokeDashoffset={113.1 * (1 - doneCount / habits.length)}
              transform="rotate(-90 22 22)"
              style={{ transition: "stroke-dashoffset .3s" }}
            />
          </svg>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
        {habits.map((h) => {
          const checked = !!todayLogs[h.id];
          const c = h.color || G;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => toggle(h)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px",
                background: checked ? `${c}10` : "rgba(255,255,255,0.02)",
                border: `1px solid ${checked ? c + "40" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 12,
                cursor: "pointer", fontFamily: "inherit",
                textAlign: "left", width: "100%",
                transition: "all .15s",
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: checked ? c : "transparent",
                border: `1.5px solid ${checked ? c : "rgba(255,255,255,0.2)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all .15s",
              }}>
                {checked && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {/* Icon */}
              {h.icon && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${c}15`, border: `1px solid ${c}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, fontWeight: 800, color: c,
                  letterSpacing: "0.5px",
                  flexShrink: 0,
                }}>
                  {h.icon}
                </div>
              )}
              {/* Name */}
              <div style={{
                flex: 1, fontSize: 13, fontWeight: 600,
                color: checked ? "rgba(255,255,255,0.5)" : "#fff",
                textDecoration: checked ? "line-through" : "none",
              }}>
                {h.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
