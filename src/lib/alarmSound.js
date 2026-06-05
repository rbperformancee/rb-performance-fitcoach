// src/lib/alarmSound.js
//
// Wrapper du plugin natif AlarmSound (iOS) — joue rb_alarm.caf via
// AVAudioPlayer sous AVAudioSession .playback. Ça BYPASS le silent switch
// physique de l'iPhone, contrairement à Web Audio (qui est en .playAndRecord
// donc respecte le silent switch).
//
// Utilisé par RestTimer (fin de repos). Sur web, retourne false silencieusement
// → le fallback Web Audio (playBeep oscillator) prendra le relais.

import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";

let _plugin = null;
function getPlugin() {
  if (_plugin) return _plugin;
  try {
    _plugin = registerPlugin("AlarmSound");
  } catch {
    _plugin = null;
  }
  return _plugin;
}

/**
 * Joue le son d'alarme rb_alarm.caf — 3 cycles ≈ 1.7s.
 * Bascule temporaire en AVAudioSession .playback (ignore silent switch),
 * puis restauration auto vers .playAndRecord après ~2.5s.
 * @returns {Promise<boolean>} true si lecture déclenchée, false sinon.
 */
export async function playRestEndAlarm() {
  if (!isNative()) return false;
  const p = getPlugin();
  if (!p) return false;
  try {
    await p.playRestEnd();
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[alarmSound] playRestEnd failed:", e?.message || e);
    return false;
  }
}

/**
 * Stoppe la lecture en cours + restaure la session .playAndRecord.
 * Appelé quand l'user dismiss le timer pendant la sonnerie.
 */
export async function stopRestEndAlarm() {
  if (!isNative()) return false;
  const p = getPlugin();
  if (!p) return false;
  try {
    await p.stop();
    return true;
  } catch {
    return false;
  }
}
