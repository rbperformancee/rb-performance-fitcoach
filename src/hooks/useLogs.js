import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "fitcoach_logs_v1";

function buildExKey(programmeName, weekIdx, sessionIdx, exIdx) {
  const base = (programmeName || "prog").toLowerCase().replace(/\s+/g, "_");
  return `${base}__w${weekIdx}_s${sessionIdx}_e${exIdx}`;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function useLogs(programmeName, clientId = null) {
  const [logs, setLogs] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(logs);
  }, [logs]);

  // Hydrate localStorage depuis Supabase au mount + apres changement clientId.
  // Permet au coach de voir l'historique depuis n'importe quel device et au
  // client de retrouver ses logs apres reinstall / changement de tel.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("exercise_logs")
        .select("ex_key, date, weight, reps, logged_at")
        .eq("client_id", clientId)
        .order("logged_at", { ascending: true })
        .limit(2000);
      if (cancelled || !Array.isArray(data) || data.length === 0) return;
      // Merge cloud → local (cloud gagne sur les doublons par date)
      setLogs((prev) => {
        const next = { ...prev };
        for (const r of data) {
          const key = r.ex_key;
          if (!key) continue;
          const arr = (next[key] || []).filter((e) => e.date !== r.date);
          arr.push({
            date: r.date || (r.logged_at || "").slice(0, 10),
            weight: parseFloat(r.weight) || 0,
            reps: r.reps || "",
          });
          arr.sort((a, b) => a.date.localeCompare(b.date));
          next[key] = arr;
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  // Retourne l'historique complet d'un exercice : [{date, weight, reps}]
  const getHistory = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const key = buildExKey(programmeName, weekIdx, sessionIdx, exIdx);
      return logs[key] || [];
    },
    [logs, programmeName]
  );

  // Dernière entrée
  const getLatest = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const history = getHistory(weekIdx, sessionIdx, exIdx);
      return history.length > 0 ? history[history.length - 1] : null;
    },
    [getHistory]
  );

  // Ajouter / mettre à jour une entrée pour aujourd'hui
  const saveLog = useCallback(
    (weekIdx, sessionIdx, exIdx, weight, reps) => {
      const key = buildExKey(programmeName, weekIdx, sessionIdx, exIdx);
      const today = new Date().toISOString().slice(0, 10);
      const w = parseFloat(weight) || 0;
      const r = reps || "";

      setLogs((prev) => {
        const existing = prev[key] || [];
        // Si entrée du jour déjà présente → on la met à jour
        const filtered = existing.filter((e) => e.date !== today);
        const newEntry = { date: today, weight: w, reps: r };
        return { ...prev, [key]: [...filtered, newEntry] };
      });

      // Persist en cloud (fire-and-forget). Sans ça le coach ne voit jamais
      // les charges et le client perd tout en changeant de device.
      // Upsert manuel via delete-then-insert sur (client_id, ex_key, date)
      // car la table n'a pas de contrainte unique declaree.
      if (clientId) {
        (async () => {
          try {
            await supabase
              .from("exercise_logs")
              .delete()
              .eq("client_id", clientId)
              .eq("ex_key", key)
              .eq("date", today);
            await supabase.from("exercise_logs").insert({
              client_id: clientId,
              ex_key: key,
              date: today,
              weight: w,
              reps: r,
              logged_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("[useLogs] cloud persist failed (offline?):", e?.message);
          }
        })();
      }
    },
    [programmeName, clientId]
  );

  // Delta entre la dernière et l'avant-dernière entrée
  const getDelta = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const history = getHistory(weekIdx, sessionIdx, exIdx);
      if (history.length < 2) return null;
      const delta = history[history.length - 1].weight - history[history.length - 2].weight;
      return delta;
    },
    [getHistory]
  );

  return { getHistory, getLatest, saveLog, getDelta };
}
