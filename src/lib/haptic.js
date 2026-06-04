/**
 * Haptic feedback utility — utilisable partout sans hook.
 *
 * iOS Safari: navigator.vibrate n'est PAS supporte en natif,
 * mais est respecte dans les PWA iOS via le fallback visuel.
 * Android: supporte nativement.
 * Capacitor (plus tard): on remplacera par @capacitor/haptics.
 */

function vibrate(pattern) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // noop
  }
}

// Long buzz : pour le timer de repos quand le son ne joue pas (silent
// mode iOS) → on chaîne des impacts iOS Haptics natifs pour simuler
// une vibration longue ~2.5s. Web Android fallback via navigator.vibrate.
let longBuzzAbort = false;
async function longBuzz(durationMs = 2500) {
  longBuzzAbort = false;
  const isNative = typeof window !== "undefined"
    && window.Capacitor?.isNativePlatform?.();

  // Web Android : pattern court alterné
  if (!isNative) {
    vibrate([400, 120, 400, 120, 400, 120, 600]);
    return;
  }

  // iOS natif : chaîne Capacitor Haptics impacts (heavy) toutes les 180ms
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const interval = 180;
    const ticks = Math.ceil(durationMs / interval);
    for (let i = 0; i < ticks; i++) {
      if (longBuzzAbort) break;
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
      await new Promise((r) => setTimeout(r, interval));
    }
  } catch {
    // plugin absent : fallback web
    vibrate([400, 120, 400, 120, 400]);
  }
}

function stopLongBuzz() {
  longBuzzAbort = true;
  try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(0); } catch {}
}

export const haptic = {
  // Tap leger — feedback bouton, tab switch, toggle
  light: () => vibrate(10),
  // Tap medium — action confirmee (add, save)
  medium: () => vibrate(25),
  // Tap fort — action destructive confirmee
  heavy: () => vibrate([50, 30, 50]),
  // Succes — pattern a 3 pulses (seance terminee, rattachement coach)
  success: () => vibrate([20, 10, 20, 10, 40]),
  // Erreur — double vibration courte
  error: () => vibrate([60, 40, 60]),
  // Selection — micro tap (radio button, chip select)
  selection: () => vibrate(5),
  // Buzz long ~2.5s — fallback alarme rest timer si silent mode
  longBuzz,
  stopLongBuzz,
};

export default haptic;
