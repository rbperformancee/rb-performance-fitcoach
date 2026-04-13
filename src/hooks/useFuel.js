import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useFuel(clientId) {
  const [goals, setGoals] = useState(null);
  const [logs, setLogs] = useState([]);
  const [dailyTracking, setDailyTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [goalsRes, logsRes, trackingRes] = await Promise.all([
      supabase.from("nutrition_goals").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("nutrition_logs").select("*").eq("client_id", clientId).eq("date", today).order("logged_at", { ascending: true }),
      supabase.from("daily_tracking").select("*").eq("client_id", clientId).eq("date", today).maybeSingle(),
    ]);
    setGoals(goalsRes.data || { calories: 2000, proteines: 150, glucides: 250, lipides: 70, eau_ml: 2500, pas: 8000 });
    setLogs(logsRes.data || []);
    setDailyTracking(trackingRes.data || { eau_ml: 0, sommeil_h: 0, pas: 0 });
    setLoading(false);
  }, [clientId, today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addFood = async (item) => {
    if (!clientId) return;
    const { data } = await supabase.from("nutrition_logs").insert({
      client_id: clientId,
      date: today,
      repas: item.repas,
      aliment: item.aliment,
      calories: item.calories,
      proteines: item.proteines,
      glucides: item.glucides,
      lipides: item.lipides,
      quantite_g: item.quantite_g,
    }).select().single();
    if (data) setLogs(prev => [...prev, data]);
    return data;
  };

  const removeFood = async (id) => {
    await supabase.from("nutrition_logs").delete().eq("id", id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const updateFood = async (id, updates) => {
    const { data } = await supabase
      .from("nutrition_logs")
      .update({
        aliment: updates.aliment,
        calories: updates.calories,
        proteines: updates.proteines,
        glucides: updates.glucides,
        lipides: updates.lipides,
        quantite_g: updates.quantite_g,
      })
      .eq("id", id)
      .select()
      .single();
    if (data) setLogs(prev => prev.map(l => l.id === id ? data : l));
    return data;
  };

  const updateTracking = async (field, value) => {
    if (!clientId) return;
    const updated = { ...dailyTracking, [field]: value };
    setDailyTracking(updated);
    await supabase.from("daily_tracking").upsert({
      client_id: clientId,
      date: today,
      ...updated,
    }, { onConflict: "client_id,date" });
  };

  // Calculs totaux du jour
  const totals = logs.reduce((acc, l) => ({
    calories: acc.calories + (l.calories || 0),
    proteines: acc.proteines + parseFloat(l.proteines || 0),
    glucides: acc.glucides + parseFloat(l.glucides || 0),
    lipides: acc.lipides + parseFloat(l.lipides || 0),
  }), { calories: 0, proteines: 0, glucides: 0, lipides: 0 });

  // Score energie 0-100
  const calcScore = () => {
    if (!goals) return 0;
    let score = 0;
    const calPct = Math.min(totals.calories / goals.calories, 1);
    const protPct = Math.min(totals.proteines / goals.proteines, 1);
    const eauPct = Math.min((dailyTracking?.eau_ml || 0) / goals.eau_ml, 1);
    const sommeilPct = Math.min((dailyTracking?.sommeil_h || 0) / 8, 1);
    const pasPct = Math.min((dailyTracking?.pas || 0) / (goals.pas || 8000), 1);
    score = Math.round((calPct * 25) + (protPct * 30) + (eauPct * 20) + (sommeilPct * 15) + (pasPct * 10));
    return score;
  };

  return { goals, logs, dailyTracking, loading, totals, addFood, removeFood, updateFood, updateTracking, score: calcScore(), fetchAll };
}
