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
    if (!clientId) return { ok: false, error: "Pas connecté" };
    const payload = {
      client_id: clientId,
      date: today,
      repas: item.repas,
      aliment: item.aliment,
      calories: item.calories,
      proteines: item.proteines,
      glucides: item.glucides,
      lipides: item.lipides,
      quantite_g: item.quantite_g,
    };
    const { data, error } = await supabase.from("nutrition_logs").insert(payload).select().single();
    if (error) {
      console.error("[addFood] insert failed", error, payload);
      return { ok: false, error: error.message || error.code || "Erreur inconnue" };
    }
    if (data) setLogs(prev => [...prev, data]);
    return { ok: true, data };
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
    if (!clientId) return false;
    const previous = dailyTracking;
    const updated = { ...dailyTracking, [field]: value };
    setDailyTracking(updated);
    // Payload propre : on n'envoie QUE les champs metier (pas id/created_at
    // qui pollueraient l'upsert et risqueraient de matcher une mauvaise row).
    const payload = {
      client_id: clientId,
      date: today,
      eau_ml: updated.eau_ml ?? 0,
      sommeil_h: updated.sommeil_h ?? 0,
      pas: updated.pas ?? 0,
    };
    const { data, error } = await supabase
      .from("daily_tracking")
      .upsert(payload, { onConflict: "client_id,date" })
      .select()
      .single();
    if (error) {
      console.error("[updateTracking] save failed", error, payload);
      setDailyTracking(previous); // rollback
      return false;
    }
    if (data) setDailyTracking(data);
    return true;
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

  const updateGoals = async (newGoals) => {
    if (!clientId) return false;
    const previous = goals;
    setGoals(newGoals);
    const { error } = await supabase.from("nutrition_goals").upsert({
      client_id: clientId,
      calories: newGoals.calories,
      proteines: newGoals.proteines,
      glucides: newGoals.glucides,
      lipides: newGoals.lipides,
      eau_ml: newGoals.eau_ml,
      pas: newGoals.pas,
    }, { onConflict: "client_id" });

    if (error) {
      console.error("[updateGoals] save failed", error);
      setGoals(previous); // rollback optimiste
      return false;
    }

    // Alerte coach : log l'event dans coach_activity_log si le client change
    // significativement (pas du bruit a chaque tweak). Best-effort, ignore RLS.
    try {
      const significantChange =
        previous && (
          Math.abs((newGoals.calories || 0) - (previous.calories || 0)) >= 100 ||
          Math.abs((newGoals.proteines || 0) - (previous.proteines || 0)) >= 10 ||
          Math.abs((newGoals.eau_ml || 0) - (previous.eau_ml || 0)) >= 250 ||
          Math.abs((newGoals.pas || 0) - (previous.pas || 0)) >= 1000
        );
      if (significantChange) {
        const { data: client } = await supabase.from("clients")
          .select("id, coach_id, full_name").eq("id", clientId).maybeSingle();
        if (client?.coach_id) {
          const summary = `${client.full_name || "Client"} a modifie ses objectifs : `
            + `kcal ${previous.calories || 0}→${newGoals.calories || 0}, `
            + `prot ${previous.proteines || 0}→${newGoals.proteines || 0}g, `
            + `eau ${previous.eau_ml || 0}→${newGoals.eau_ml || 0}ml, `
            + `pas ${previous.pas || 0}→${newGoals.pas || 0}`;
          supabase.from("coach_activity_log").insert({
            coach_id: client.coach_id,
            client_id: clientId,
            activity_type: "client_goals_changed",
            details: summary,
          }).then(() => {}, () => {});
        }
      }
    } catch (_) {}

    return true;
  };

  return { goals, logs, dailyTracking, loading, totals, addFood, removeFood, updateFood, updateTracking, updateGoals, score: calcScore(), fetchAll };
}
