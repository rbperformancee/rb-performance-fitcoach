import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useAppData(clientId) {
  const [data, setData] = useState({
    weights: [],
    runs: [],
    nutritionLogs: [],
    dailyTracking: null,
    nutritionGoals: null,
    sessionLogs: [],
    streak: 0,
    bestStreak: 0,
    loading: true,
  });

  const today = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    if (!clientId) return;

    const [
      weightsRes,
      runsRes,
      nutritionLogsRes,
      dailyTrackingRes,
      nutritionGoalsRes,
      sessionLogsRes,
    ] = await Promise.all([
      supabase.from("weight_logs").select("weight,date,note,fat_pct").eq("client_id", clientId).order("date", { ascending: true }).limit(30),
      supabase.from("run_logs").select("*").eq("client_id", clientId).order("date", { ascending: false }).limit(20),
      supabase.from("nutrition_logs").select("*").eq("client_id", clientId).eq("date", today).order("logged_at", { ascending: true }),
      supabase.from("daily_tracking").select("*").eq("client_id", clientId).eq("date", today).maybeSingle(),
      supabase.from("nutrition_goals").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("session_logs").select("logged_at").eq("client_id", clientId).order("logged_at", { ascending: false }).limit(60),
    ]);

    // Calculer streak
    const dates = [...new Set((sessionLogsRes.data || []).map(d => d.logged_at?.split("T")[0]))].sort().reverse();
    let streak = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let bestStreak = 0;
    let temp = 1;
    if (dates[0] === todayStr || dates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
        if (diff === 1) { streak++; temp++; }
        else { bestStreak = Math.max(bestStreak, temp); temp = 1; }
      }
    }
    bestStreak = Math.max(bestStreak, temp, streak);

    setData({
      weights: weightsRes.data || [],
      runs: runsRes.data || [],
      nutritionLogs: nutritionLogsRes.data || [],
      dailyTracking: dailyTrackingRes.data || { eau_ml: 0, sommeil_h: 0, pas: 0 },
      nutritionGoals: nutritionGoalsRes.data || { calories: 2000, proteines: 150, glucides: 250, lipides: 70, eau_ml: 2500, pas: 8000 },
      sessionLogs: sessionLogsRes.data || [],
      streak,
      bestStreak,
      loading: false,
    });
  }, [clientId, today]);

  const refresh = useCallback(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { ...data, refresh };
}
