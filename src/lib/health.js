// src/lib/health.js
//
// Wrapper Apple Health (HealthKit) — utilise notre plugin custom Swift
// `HealthSteps` (cf MyBridgeViewController.swift + HealthStepsPlugin.swift)
// au lieu de capacitor-health 8.1.2 qui retourne parfois 0 ou null.
//
// API utilisée par WeightChart pour auto-fill le compteur de pas du jour.

import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";

let _plugin = null;
function getPlugin() {
  if (_plugin) return _plugin;
  try {
    _plugin = registerPlugin("HealthSteps");
  } catch {
    _plugin = null;
  }
  return _plugin;
}

/**
 * `true` si HealthKit est disponible (toujours vrai sur iPhone moderne).
 */
export async function isHealthAvailable() {
  return isNative();
}

/**
 * Demande la permission de lire les pas. Apple ne révèle pas la réponse,
 * donc on retourne juste true si l'API a pu être appelée.
 */
export async function requestStepsPermission() {
  if (!isNative()) return false;
  const p = getPlugin();
  if (!p) return false;
  try {
    await p.requestPermission();
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[health] requestPermission failed:", e);
    return false;
  }
}

/**
 * Retourne le total de pas effectués aujourd'hui (00:00 → maintenant).
 * Returns null si erreur, 0 si pas de données ou refus.
 */
export async function getTodaySteps() {
  if (!isNative()) return null;
  const p = getPlugin();
  if (!p) return null;
  try {
    const res = await p.getTodaySteps();
    const steps = Number(res?.steps);
    return Number.isFinite(steps) ? steps : 0;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[health] getTodaySteps failed:", e);
    return null;
  }
}

/**
 * Demande la permission d'écrire un workout running + sa route GPS.
 * Apple ne révèle pas la réponse réelle.
 */
export async function requestWorkoutPermission() {
  if (!isNative()) return false;
  const p = getPlugin();
  if (!p) return false;
  try {
    await p.requestWorkoutPermission();
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[health] requestWorkoutPermission failed:", e);
    return false;
  }
}

/**
 * Sauvegarde un workout running dans Apple Health avec sa route GPS.
 *
 * @param {object} args
 * @param {number} args.distanceM       Distance totale en mètres
 * @param {number} args.durationS       Durée active (hors pauses) en secondes
 * @param {number} args.startedAt       Timestamp UNIX en secondes (start)
 * @param {number} args.endedAt         Timestamp UNIX en secondes (end)
 * @param {Array<{lat,lng,alt?,t?}>} args.routeCoords  Points GPS optionnels
 * @returns {Promise<{saved:boolean, withRoute:boolean, kcal:number} | null>}
 */
export async function saveRunWorkout({ distanceM, durationS, startedAt, endedAt, routeCoords }) {
  if (!isNative()) return null;
  if (!(distanceM > 50) || !(durationS > 5)) return null;
  const p = getPlugin();
  if (!p) return null;
  try {
    const res = await p.saveRunWorkout({
      distanceM,
      durationS,
      startedAt,
      endedAt,
      routeCoords: Array.isArray(routeCoords) ? routeCoords : [],
    });
    return res;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[health] saveRunWorkout failed:", e);
    return null;
  }
}
