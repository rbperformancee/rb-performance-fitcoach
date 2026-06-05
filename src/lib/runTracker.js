// src/lib/runTracker.js
//
// Wrapper unifié du tracker de course : plugin natif iOS (RunTrackerPlugin
// Swift) OU fallback web via navigator.geolocation. Expose une API simple :
//
//   await rt.requestPermission()        → { granted, level }
//   await rt.start({ targetDistance? })  → { startedAt }
//   await rt.pause() / resume() / stop()
//   rt.onLocation(cb)                    → unsubscribe
//   rt.onKm(cb)                          → unsubscribe (split km franchi)
//   rt.onAutoPause(cb)                   → unsubscribe
//   rt.onCadence(cb)                     → unsubscribe (steps/min)
//
// Les calculs distance/pace sont faits côté natif Swift (Haversine sur
// CLLocation.distance pour fiabilité). Le web fallback les recompute en JS.

import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";

let _plugin = null;
function plugin() {
  if (_plugin) return _plugin;
  try { _plugin = registerPlugin("RunTracker"); } catch { _plugin = null; }
  return _plugin;
}

// ─── Native path (iOS) ──────────────────────────────────────────────

async function requestPermissionNative() {
  const p = plugin();
  if (!p) return { granted: false, level: "denied" };
  try {
    return await p.requestPermission();
  } catch (e) {
    return { granted: false, level: "denied", error: e?.message };
  }
}

async function startNative(opts = {}) {
  const p = plugin();
  if (!p) throw new Error("Plugin unavailable");
  return await p.start(opts);
}

async function pauseNative() {
  const p = plugin();
  if (!p) return;
  return await p.pause();
}

async function resumeNative() {
  const p = plugin();
  if (!p) return;
  return await p.resume();
}

async function stopNative() {
  const p = plugin();
  if (!p) return {};
  return await p.stop();
}

async function getStatsNative() {
  const p = plugin();
  if (!p) return null;
  return await p.getStats();
}

function addListenerNative(event, cb) {
  const p = plugin();
  if (!p) return () => {};
  const handlePromise = p.addListener(event, cb);
  return () => {
    handlePromise?.then?.((h) => h?.remove?.());
  };
}

// ─── Web fallback (navigator.geolocation) ──────────────────────────

const webState = {
  watchId: null,
  startedAt: null,
  pausedAt: null,
  totalPausedMs: 0,
  totalDistance: 0,
  lastLocation: null,
  lastKmReached: 0,
  lastKmAt: null,
  isPaused: false,
  listeners: {
    locationUpdate: [],
    kmReached: [],
    autoPaused: [],
    cadenceUpdate: [],
  },
};

// Haversine en mètres
function haversineM(a, b) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δφ = toRad(b.lat - a.lat);
  const Δλ = toRad(b.lng - a.lng);
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function emit(event, data) {
  (webState.listeners[event] || []).forEach((cb) => {
    try { cb(data); } catch (_) {}
  });
}

async function requestPermissionWeb() {
  if (!navigator?.geolocation) return { granted: false, level: "denied" };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ granted: true, level: "when_in_use" }),
      () => resolve({ granted: false, level: "denied" }),
      { timeout: 5000 }
    );
  });
}

async function startWeb() {
  webState.startedAt = Date.now();
  webState.totalDistance = 0;
  webState.lastKmReached = 0;
  webState.lastKmAt = webState.startedAt;
  webState.lastLocation = null;
  webState.totalPausedMs = 0;
  webState.isPaused = false;

  webState.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (webState.isPaused) return;
      const c = pos.coords;
      // filtre précision basse
      if (c.accuracy > 30) return;
      const loc = { lat: c.latitude, lng: c.longitude, speed: c.speed || 0, alt: c.altitude || 0, accuracy: c.accuracy };
      if (webState.lastLocation) {
        const delta = haversineM(webState.lastLocation, loc);
        if (delta < 50) webState.totalDistance += delta;
      }
      webState.lastLocation = loc;
      emit("locationUpdate", { ...loc, t: Date.now() - webState.startedAt, distanceM: webState.totalDistance });
      const km = Math.floor(webState.totalDistance / 1000);
      if (km > webState.lastKmReached) {
        const now = Date.now();
        const splitMs = now - webState.lastKmAt;
        const totalS = (now - webState.startedAt - webState.totalPausedMs) / 1000;
        emit("kmReached", { km, splitDurationS: Math.round(splitMs / 1000), paceSPerKm: km > 0 ? Math.round(totalS / km) : 0 });
        webState.lastKmReached = km;
        webState.lastKmAt = now;
      }
    },
    (err) => { console.warn("[runTracker] geolocation error:", err); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );

  return { startedAt: webState.startedAt };
}

async function pauseWeb() {
  if (webState.isPaused) return;
  webState.isPaused = true;
  webState.pausedAt = Date.now();
}

async function resumeWeb() {
  if (!webState.isPaused) return;
  webState.totalPausedMs += Date.now() - (webState.pausedAt || Date.now());
  webState.pausedAt = null;
  webState.isPaused = false;
  webState.lastLocation = null;
}

async function stopWeb() {
  if (webState.watchId != null) {
    navigator.geolocation.clearWatch(webState.watchId);
    webState.watchId = null;
  }
  const endedAt = Date.now();
  const durationS = Math.round((endedAt - (webState.startedAt || endedAt) - webState.totalPausedMs) / 1000);
  const distanceM = webState.totalDistance;
  const paceSPerKm = distanceM > 0 ? Math.round((durationS / (distanceM / 1000))) : 0;
  return {
    distanceM,
    durationS,
    pausedDurationS: Math.round(webState.totalPausedMs / 1000),
    paceSPerKm,
    startedAt: (webState.startedAt || endedAt) / 1000,
    endedAt: endedAt / 1000,
  };
}

function addListenerWeb(event, cb) {
  if (!webState.listeners[event]) webState.listeners[event] = [];
  webState.listeners[event].push(cb);
  return () => {
    webState.listeners[event] = webState.listeners[event].filter((f) => f !== cb);
  };
}

// ─── Public API (auto-route native vs web) ─────────────────────────

export async function requestPermission() {
  return isNative() ? requestPermissionNative() : requestPermissionWeb();
}

export async function startRun(opts) {
  return isNative() ? startNative(opts) : startWeb(opts);
}

export async function pauseRun() {
  return isNative() ? pauseNative() : pauseWeb();
}

export async function resumeRun() {
  return isNative() ? resumeNative() : resumeWeb();
}

export async function stopRun() {
  return isNative() ? stopNative() : stopWeb();
}

export async function getStats() {
  return isNative() ? getStatsNative() : Promise.resolve({
    distanceM: webState.totalDistance,
    durationS: Math.round((Date.now() - (webState.startedAt || Date.now()) - webState.totalPausedMs) / 1000),
    isRunning: webState.watchId != null,
    isPaused: webState.isPaused,
  });
}

export function onLocation(cb) {
  return isNative() ? addListenerNative("locationUpdate", cb) : addListenerWeb("locationUpdate", cb);
}
export function onKm(cb) {
  return isNative() ? addListenerNative("kmReached", cb) : addListenerWeb("kmReached", cb);
}
export function onAutoPause(cb) {
  return isNative() ? addListenerNative("autoPaused", cb) : addListenerWeb("autoPaused", cb);
}
export function onCadence(cb) {
  return isNative() ? addListenerNative("cadenceUpdate", cb) : addListenerWeb("cadenceUpdate", cb);
}

// Helper formatting
export function formatPace(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm)) return "--:--";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
export function formatDuration(s) {
  if (s == null) return "--:--";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
export function formatDistance(meters) {
  if (meters == null) return "0,00 km";
  return `${(meters / 1000).toFixed(2).replace(".", ",")} km`;
}
