import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const LEVELS = [
  { level: 1, name: "Rookie",    min: 0,    color: "rgba(255,255,255,0.4)", accent: "rgba(255,255,255,0.3)" },
  { level: 2, name: "Apprenti",  min: 100,  color: "#e2e8f0",               accent: "#cbd5e1" },
  { level: 3, name: "Athlete",   min: 250,  color: "#02d1ba",               accent: "#01b8a3" },
  { level: 4, name: "Warrior",   min: 500,  color: "#a78bfa",               accent: "#8b5cf6" },
  { level: 5, name: "Elite",     min: 900,  color: "#f97316",               accent: "#ea580c" },
  { level: 6, name: "Champion",  min: 1500, color: "#fbbf24",               accent: "#f59e0b" },
  { level: 7, name: "Titan",     min: 2500, color: "#ef4444",               accent: "#dc2626" },
  { level: 8, name: "Maitre",    min: 4000, color: "#e2e8f0",               accent: "#cbd5e1" },
  { level: 9, name: "Legende",   min: 6500, color: "#818cf8",               accent: "#6366f1" },
  { level: 10, name: "RB PERFORM", min: 10000, color: "#02d1ba",           accent: "#02d1ba" },
];

export function getLevelInfo(xp) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  const pct = next
    ? Math.round(((xp - current.min) / (next.min - current.min)) * 100)
    : 100;
  return { current, next, pct, xp };
}

export function useXP(clientId) {
  const [xp, setXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [runCount, setRunCountState] = useState(0);
  const [totalKm, setTotalKmState] = useState(0);

  const fetchXP = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [sessions, weights, streakData, badgesData] = await Promise.all([
      supabase.from("session_logs").select("id, logged_at, note").eq("client_id", clientId).order("logged_at", { ascending: false }).limit(50),
      supabase.from("weight_logs").select("id, date, weight").eq("client_id", clientId).order("date", { ascending: false }).limit(10),
      supabase.from("session_logs").select("logged_at").eq("client_id", clientId).order("logged_at", { ascending: false }).limit(60),
      supabase.from("client_badges").select("badge_id").eq("client_id", clientId),
    ]);

    let totalXP = 0;
    const activity = [];

    // XP seances
    const sessionCount = sessions.data?.length || 0;
    totalXP += sessionCount * 40;
    sessions.data?.slice(0, 4).forEach(s => {
      activity.push({ type: "session", label: "Seance completee", meta: "40 XP", xp: 40, date: s.logged_at, color: "#02d1ba" });
    });

    // XP streak
    const dates = [...new Set((streakData.data || []).map(d => d.logged_at?.split("T")[0]))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dates[0] === today || dates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
        if (diff === 1) streak++;
        else break;
      }
    }
    if (streak >= 7) { totalXP += 50; activity.push({ type: "streak", label: "Streak 7 jours", meta: "+50 XP bonus", xp: 50, color: "#f97316" }); }
    if (streak >= 30) { totalXP += 200; }

    // XP pesees
    const weightCount = weights.data?.length || 0;
    totalXP += weightCount * 5;
    weights.data?.slice(0, 2).forEach(w => {
      activity.push({ type: "weight", label: `Pesee · ${w.weight} kg`, meta: "+5 XP", xp: 5, date: w.date, color: "rgba(2,209,186,0.5)" });
    });

    // XP courses (Move)
    const [runsRes, stepsRes] = await Promise.all([
      supabase.from("run_logs").select("id, date, distance_km").eq("client_id", clientId).order("date", { ascending: false }).limit(20),
      supabase.from("daily_tracking").select("date, pas").eq("client_id", clientId).order("date", { ascending: false }).limit(30),
    ]);
    runCount = runsRes.data?.length || 0;
    totalKm = (runsRes.data || []).reduce((a, r) => a + (r.distance_km || 0), 0);
    totalXP += runCount * 10;
    runsRes.data?.slice(0, 2).forEach(r => {
      activity.push({ type: "run", label: `Course · ${r.distance_km} km`, meta: "+10 XP", xp: 10, date: r.date, color: "#ef4444" });
    });

    // XP nutrition - jours avec au moins un repas logue
    const nutritionRes = await supabase.from("nutrition_logs").select("date").eq("client_id", clientId);
    const nutritionDays = new Set((nutritionRes.data || []).map(n => n.date)).size;
    totalXP += nutritionDays * 5;
    if (nutritionDays > 0) {
      activity.push({ type: "fuel", label: `Nutrition loguee`, meta: `${nutritionDays} jours · +${nutritionDays * 5} XP`, xp: nutritionDays * 5, color: "#f97316" });
    }

    // XP pas (objectif atteint)
    const goalsRes2 = await supabase.from("nutrition_goals").select("pas").eq("client_id", clientId).single();
    const pasGoal = goalsRes2.data?.pas || 8000;
    const stepsGoalDays = (stepsRes.data || []).filter(d => (d.pas || 0) >= pasGoal).length;
    totalXP += stepsGoalDays * 5;

    // XP badges
    const badgeXPMap = {
      first_session: 50, five_sessions: 80, ten_sessions: 120, twenty_sessions: 200,
      fifty_sessions: 400, streak_7: 100, streak_30: 300, weight_logged: 30, goal_set: 50,
      first_run: 40, five_runs: 80, hundred_km: 200, steps_goal_7: 100,
    };
    (badgesData.data || []).forEach(b => { totalXP += badgeXPMap[b.badge_id] || 0; });

    // Stocker pour les badges

    setXP(totalXP);
    setRecentActivity(activity.slice(0, 6));
    setRunCountState(runCount);
    setTotalKmState(totalKm);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchXP(); }, [fetchXP]);

  return { xp, loading, recentActivity, levelInfo: getLevelInfo(xp), runCount, totalKm };
}
