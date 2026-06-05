// src/lib/runLiveActivity.js
//
// Wrapper Capacitor → plugin natif Swift `RunActivity`.
// Pilote la Live Activity Dynamic Island + Lock Screen pendant un run.
//
// API :
//   await runActivity.start({ targetDistanceM?, targetPaceSPerKm?, startedAtMs })
//   await runActivity.update({ distanceM, durationS, paceSPerKm, isPaused })
//   await runActivity.end()
//
// Sur web ou iOS < 16.1 → toutes les méthodes sont des no-op.

import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";

let _plugin = null;
function plugin() {
  if (_plugin) return _plugin;
  try {
    _plugin = registerPlugin("RunActivity");
  } catch {
    _plugin = null;
  }
  return _plugin;
}

async function safeCall(method, args) {
  if (!isNative()) return null;
  const p = plugin();
  if (!p) return null;
  try {
    return await p[method](args || {});
  } catch (e) {
    // Best effort — la Live Activity ne doit jamais faire crash le run.
    // eslint-disable-next-line no-console
    console.warn(`[runActivity] ${method} failed:`, e?.message || e);
    return null;
  }
}

export async function start({ targetDistanceM = 0, targetPaceSPerKm = 0, startedAtMs } = {}) {
  return safeCall("start", {
    targetDistanceM: Number(targetDistanceM) || 0,
    targetPaceSPerKm: Number(targetPaceSPerKm) || 0,
    startedAtMs: Number(startedAtMs) || Date.now(),
  });
}

export async function update({ distanceM, durationS, paceSPerKm, isPaused }) {
  return safeCall("update", {
    distanceM: Number(distanceM) || 0,
    durationS: Number(durationS) || 0,
    paceSPerKm: Number(paceSPerKm) || 0,
    isPaused: !!isPaused,
  });
}

export async function end() {
  return safeCall("end");
}

export default { start, update, end };
