// src/lib/restTimerLiveActivity.js
//
// Bridge JS → plugin Capacitor natif RestTimerActivity (iOS Live Activity).
//
// Affiche le décompte du timer de repos en LIVE dans la Dynamic Island et le
// Lock Screen iPhone. iOS 16.1+ uniquement, no-op sur web/Android.
//
// API :
//   await startRestActivity({ durationSec, nextExerciseName, setLabel })
//   await stopRestActivity()

import { isNative } from "./native";
import { registerPlugin } from "@capacitor/core";

// Lazy-resolved plugin. registerPlugin() retourne un proxy même si le plugin
// natif n'est pas dispo — les appels failent gracieusement.
let _plugin = null;
function getPlugin() {
  if (_plugin) return _plugin;
  try {
    _plugin = registerPlugin("RestTimerActivity");
  } catch (_) {
    _plugin = null;
  }
  return _plugin;
}

/**
 * Démarre le Live Activity pour le timer de repos.
 * @param {Object} opts
 * @param {number} opts.durationSec - durée du repos en secondes
 * @param {string} [opts.nextExerciseName] - nom de l'exercice suivant
 * @param {string} [opts.setLabel] - label série ("Série 3 / 4")
 * @returns {Promise<boolean>} true si le LA a démarré
 */
export async function startRestActivity({ durationSec, nextExerciseName = "", setLabel = "" } = {}) {
  if (!isNative()) return false;
  const p = getPlugin();
  if (!p) return false;
  try {
    await p.start({
      durationSec: Number(durationSec) || 90,
      nextExerciseName: String(nextExerciseName || ""),
      setLabel: String(setLabel || ""),
    });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[restTimerLiveActivity] start failed:", e?.message || e);
    return false;
  }
}

/**
 * Arrête le Live Activity en cours (si user reset le timer ou termine la séance).
 */
export async function stopRestActivity() {
  if (!isNative()) return;
  const p = getPlugin();
  if (!p) return;
  try {
    await p.stop();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[restTimerLiveActivity] stop failed:", e?.message || e);
  }
}
