import { useState, useEffect, useCallback } from "react";

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

export function useLogs(programmeName) {
  const [logs, setLogs] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(logs);
  }, [logs]);

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

      setLogs((prev) => {
        const existing = prev[key] || [];
        // Si entrée du jour déjà présente → on la met à jour
        const filtered = existing.filter((e) => e.date !== today);
        const newEntry = { date: today, weight: parseFloat(weight) || 0, reps: reps || "" };
        return { ...prev, [key]: [...filtered, newEntry] };
      });
    },
    [programmeName]
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
