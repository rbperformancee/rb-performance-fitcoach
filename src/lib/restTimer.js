import React, { createContext, useContext, useState, useCallback, useEffect, Suspense } from "react";

/**
 * restTimer — chrono de repos global, monté au niveau de l'app.
 *
 * Avant, le RestTimer vivait dans la carte d'exercice : changer d'onglet le
 * détruisait. Désormais son état est remonté ici via un contexte → le client
 * peut naviguer dans l'app pendant que le chrono tourne, et le réduire en
 * pastille flottante.
 *
 * Survie au reload / kill PWA : le descriptif (durée, exo suivant, état
 * réduit) est persisté en localStorage et restauré au mount.
 */

const DESC_KEY = "rb_rest_desc";
const CLOCK_KEY = "rb_rest_timer_active"; // horloge interne du RestTimer

// RestTimer lazy : hors du bundle principal tant qu'aucun repos n'est lancé.
const RestTimer = React.lazy(() =>
  import("../components/RestTimer").then((m) => ({ default: m.RestTimer }))
);

const Ctx = createContext(null);

// Fallback no-op si un composant appelle le hook hors du provider.
export function useRestTimer() {
  return useContext(Ctx) || { start: () => {}, dismiss: () => {}, active: false };
}

export function RestTimerProvider({ children }) {
  const [timer, setTimer] = useState(null); // { id, restSeconds, exName, betweenSets, startedAt }
  const [minimized, setMinimized] = useState(false);

  // Restaure un repos en cours après un reload / kill PWA.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DESC_KEY) || "null");
      if (d && d.startedAt && Date.now() - d.startedAt < (d.restSeconds + 180) * 1000) {
        setTimer(d);
        setMinimized(!!d.minimized);
      } else if (d) {
        localStorage.removeItem(DESC_KEY);
      }
    } catch {}
  }, []);

  // Persiste le descriptif à chaque changement.
  useEffect(() => {
    try {
      if (timer) localStorage.setItem(DESC_KEY, JSON.stringify({ ...timer, minimized }));
      else localStorage.removeItem(DESC_KEY);
    } catch {}
  }, [timer, minimized]);

  const start = useCallback((opts) => {
    // Nouveau repos → on efface l'horloge interne pour repartir de zéro.
    try { localStorage.removeItem(CLOCK_KEY); } catch {}
    setTimer({
      id: Date.now(),
      restSeconds: opts.restSeconds,
      exName: opts.exName || null,
      betweenSets: opts.betweenSets || null,
      startedAt: Date.now(),
    });
    setMinimized(false);
  }, []);

  const dismiss = useCallback(() => {
    try { localStorage.removeItem(CLOCK_KEY); } catch {}
    setTimer(null);
    setMinimized(false);
  }, []);

  const minimize = useCallback(() => setMinimized(true), []);
  const expand = useCallback(() => setMinimized(false), []);

  return (
    <Ctx.Provider value={{ start, dismiss, active: !!timer }}>
      {children}
      {timer && (
        <Suspense fallback={null}>
          <RestTimer
            key={timer.id}
            restSeconds={timer.restSeconds}
            exName={timer.exName}
            betweenSets={timer.betweenSets}
            minimized={minimized}
            onMinimize={minimize}
            onExpand={expand}
            onDismiss={dismiss}
          />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}
