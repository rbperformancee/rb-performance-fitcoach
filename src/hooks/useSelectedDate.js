import { useState, useEffect } from "react";

const STORAGE_KEY = "rb_selected_date";

const todayISO = () => new Date().toISOString().split("T")[0];
const yesterdayISO = () => new Date(Date.now() - 86400000).toISOString().split("T")[0];

/**
 * useSelectedDate — date courante consultee/editee par le client (eau,
 * sommeil, nutrition...). Defaut = aujourd'hui. Refresh automatique a
 * minuit (le client revient sur "aujourd'hui" avec un compteur a zero).
 *
 * Le client peut basculer manuellement sur la veille pour rentrer ou
 * modifier des donnees apres minuit. La selection est persistee en
 * sessionStorage pour ne pas reperdre le contexte sur un refresh.
 */
export function useSelectedDate() {
  const [date, setDateState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    } catch (_) {}
    return todayISO();
  });

  // Refresh auto a minuit : si le user reste sur l'app la nuit, on bascule
  // sur le nouveau jour. Aucun effet s'il a explicitement choisi la veille
  // (parce qu'il logue retroactivement).
  useEffect(() => {
    const now = Date.now();
    const next = new Date();
    next.setHours(24, 0, 5, 0); // 00:00:05 le lendemain
    const msUntil = next.getTime() - now;
    const timer = setTimeout(() => {
      const newToday = todayISO();
      setDateState(newToday);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }, Math.max(1000, msUntil));
    return () => clearTimeout(timer);
  }, [date]);

  const setDate = (d) => {
    setDateState(d);
    try {
      if (d === todayISO()) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, d);
    } catch (_) {}
  };

  const today = todayISO();
  const yesterday = yesterdayISO();

  return {
    date,
    setDate,
    today,
    yesterday,
    isToday: date === today,
    isYesterday: date === yesterday,
    goToToday: () => setDate(today),
    goToYesterday: () => setDate(yesterday),
  };
}
