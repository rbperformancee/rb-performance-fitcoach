// src/lib/offline.js
//
// Abstraction "cache offline" — un seul point d'entrée pour stocker /
// récupérer des données utilisables hors-ligne (programme HTML, profile
// snapshot, etc.).
//
// Web    → on délègue au service worker (DATA_CACHE via postMessage), même
//          comportement que le code existant. Le SW intercepte les fetch
//          /programme et sert depuis le cache si offline.
// Native → on stocke via @capacitor/preferences (UserDefaults iOS /
//          SharedPreferences Android), import dynamique et gated.
//
// Contrat : toutes les fonctions sont async, ne throw pas (best-effort
// silencieux), et fonctionnent identiquement web/native pour le consumer.
//
// Roadmap : APP_STORE_ROADMAP.md (Wave 6).

import { isNative } from "./native";

const KEY_PROGRAMME_HTML = "rb.programme.html";

// Cache module-level du module Capacitor pour éviter les ré-imports répétés.
let _prefsModule = null;
async function getPrefs() {
  if (_prefsModule) return _prefsModule.Preferences;
  try {
    _prefsModule = await import("@capacitor/preferences");
    return _prefsModule.Preferences;
  } catch (e) {
    console.warn("[offline] @capacitor/preferences unavailable:", e?.message);
    return null;
  }
}

// ─── Programme HTML ────────────────────────────────────────────────────────
// Le HTML du programme courant. Stocké côté SW (web) ou Preferences (native).
// Utilisé pour le rendu offline quand l'athlète ouvre l'app sans réseau.

/**
 * Stocke le HTML du programme pour usage offline.
 * @param {string} html — contenu HTML complet à cacher
 * @returns {Promise<boolean>} `true` si OK, `false` si dégradé silencieusement.
 */
export async function setProgrammeHtml(html) {
  if (!html || typeof html !== "string") return false;

  if (isNative()) {
    const Prefs = await getPrefs();
    if (!Prefs) return false;
    try {
      await Prefs.set({ key: KEY_PROGRAMME_HTML, value: html });
      return true;
    } catch (e) {
      console.warn("[offline] Prefs.set failed:", e?.message);
      return false;
    }
  }

  // Web : on délègue au service worker existant (CACHE_PROGRAMME).
  // Si le SW n'est pas encore enregistré (1er chargement), on no-op
  // silencieusement — le code appelant retentera au prochain mount.
  try {
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CACHE_PROGRAMME", html });
      return true;
    }
  } catch (e) {
    console.warn("[offline] SW postMessage failed:", e?.message);
  }
  return false;
}

/**
 * Récupère le HTML du programme caché (offline).
 * @returns {Promise<string|null>}
 */
export async function getProgrammeHtml() {
  if (isNative()) {
    const Prefs = await getPrefs();
    if (!Prefs) return null;
    try {
      const { value } = await Prefs.get({ key: KEY_PROGRAMME_HTML });
      return value || null;
    } catch (e) {
      console.warn("[offline] Prefs.get failed:", e?.message);
      return null;
    }
  }

  // Web : la lecture passe normalement par le fetch interceptor du SW
  // côté navigation /programme. Cette fonction est une lecture explicite
  // depuis Cache API, utile pour les composants qui veulent l'HTML brut
  // (ex: ré-hydratation initiale). On retourne null si pas de SW.
  try {
    if (typeof caches === "undefined") return null;
    // DATA_CACHE versionnée — voir sw.js. On essaie les noms connus.
    const candidates = ["rb-data-v1", "rb-data-v2"];
    for (const name of candidates) {
      const c = await caches.open(name).catch(() => null);
      if (!c) continue;
      const r = await c.match("/programme.html").catch(() => null);
      if (r) return await r.text();
    }
  } catch (e) {
    // dégradation silencieuse
  }
  return null;
}

/**
 * Efface le cache offline (logout, suppression compte, debug).
 * @returns {Promise<void>}
 */
export async function clearProgrammeCache() {
  if (isNative()) {
    const Prefs = await getPrefs();
    if (!Prefs) return;
    try { await Prefs.remove({ key: KEY_PROGRAMME_HTML }); } catch {}
    return;
  }

  try {
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_PROGRAMME_CACHE" });
    }
  } catch {}
}
