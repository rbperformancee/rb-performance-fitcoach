import { useState, useEffect, useCallback } from "react";

const WEIGHT_KEY = "fitcoach_weight_v1";

function load() {
  try { return JSON.parse(localStorage.getItem(WEIGHT_KEY)) || []; }
  catch { return []; }
}

export function useWeight() {
  const [entries, setEntries] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(WEIGHT_KEY, JSON.stringify(entries)); }
    catch {}
  }, [entries]);

  const addEntry = useCallback((date, weight, fat = null, note = "") => {
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== date);
      return [...filtered, { date, weight: parseFloat(weight), fat: fat ? parseFloat(fat) : null, note }]
        .sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const removeEntry = useCallback((date) => {
    setEntries(prev => prev.filter(e => e.date !== date));
  }, []);

  const getStats = useCallback(() => {
    if (entries.length === 0) return null;
    const weights = entries.map(e => e.weight);
    const last = entries[entries.length - 1];
    const first = entries[0];
    const last7 = entries.filter(e => {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return new Date(e.date) >= d;
    });
    const last30 = entries.filter(e => {
      const d = new Date(); d.setDate(d.getDate() - 30);
      return new Date(e.date) >= d;
    });

    // Trend (linear regression over last 14 days)
    const recent = entries.slice(-14);
    let trend = null;
    if (recent.length >= 3) {
      const n = recent.length;
      const xs = recent.map((_, i) => i);
      const ys = recent.map(e => e.weight);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
      const sumXX = xs.reduce((s, x) => s + x * x, 0);
      trend = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    // Weekly averages (last 8 weeks)
    const weeklyAvgs = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(); start.setDate(start.getDate() - i * 7 - 6);
      const end = new Date(); end.setDate(end.getDate() - i * 7);
      const week = entries.filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });
      if (week.length > 0) {
        const avg = week.reduce((s, e) => s + e.weight, 0) / week.length;
        weeklyAvgs.push({
          label: `S-${i}`,
          avg: Math.round(avg * 10) / 10,
          date: end.toISOString().slice(0, 10)
        });
      }
    }

    return {
      current: last.weight,
      start: first.weight,
      totalDelta: Math.round((last.weight - first.weight) * 10) / 10,
      min: Math.min(...weights),
      max: Math.max(...weights),
      avg7: last7.length > 0 ? Math.round(last7.reduce((s, e) => s + e.weight, 0) / last7.length * 10) / 10 : null,
      avg30: last30.length > 0 ? Math.round(last30.reduce((s, e) => s + e.weight, 0) / last30.length * 10) / 10 : null,
      trend,
      weeklyAvgs,
      count: entries.length,
    };
  }, [entries]);

  return { entries, addEntry, removeEntry, getStats };
}
