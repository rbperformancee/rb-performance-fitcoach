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
};

export default haptic;
