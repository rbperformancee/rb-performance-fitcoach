// src/lib/native.js
//
// Helper unique de détection runtime "Capacitor natif vs Web".
//
// Garantie : si pour une raison X Capacitor n'est pas dispo (cas web prod,
// SSR hypothétique, bug d'import, etc.), TOUTES ces fonctions retournent
// `false` ou `"web"`. C'est le contrat qui garantit zéro régression côté
// athlètes PWA actuels : tout ce qui est gated derrière `isNative()` ne
// s'active jamais sur le bundle web.
//
// Roadmap : voir APP_STORE_ROADMAP.md (Wave 1).

let _cap = null;

// Import paresseux + défensif. Capacitor n'expose pas de side-effects au
// require, mais on isole quand même : un throw ici dégrade vers "web".
try {
  // eslint-disable-next-line global-require
  _cap = require("@capacitor/core").Capacitor;
} catch (_) {
  _cap = null;
}

/**
 * `true` si l'app tourne dans une WebView Capacitor (iOS ou Android natif).
 * `false` si on est dans un navigateur (Safari/Chrome/etc.), y compris en PWA.
 */
export function isNative() {
  try {
    return !!(_cap && typeof _cap.isNativePlatform === "function" && _cap.isNativePlatform());
  } catch (_) {
    return false;
  }
}

/**
 * Plateforme détectée : "ios" | "android" | "web".
 * Source de vérité unique — n'utiliser ni navigator.userAgent ni autre
 * heuristique pour décider du chemin natif.
 */
export function getPlatform() {
  try {
    if (_cap && typeof _cap.getPlatform === "function") {
      const p = _cap.getPlatform();
      if (p === "ios" || p === "android" || p === "web") return p;
    }
  } catch (_) {}
  return "web";
}

/** `true` uniquement si on est dans le wrapper iOS Capacitor (pas Safari iOS). */
export function isIOSNative() {
  return isNative() && getPlatform() === "ios";
}

/** `true` uniquement si on est dans le wrapper Android Capacitor (pas Chrome). */
export function isAndroidNative() {
  return isNative() && getPlatform() === "android";
}

/**
 * `true` si on est en web (Safari, Chrome, PWA installée, etc.).
 * Inverse strict de `isNative()` — pratique pour rendre l'intention explicite.
 */
export function isWeb() {
  return !isNative();
}

/**
 * Petit objet introspectable pour debug — à logger uniquement en dev.
 * Ne JAMAIS appeler côté athlète prod, ça pollue les outils.
 */
export function debugPlatform() {
  return {
    isNative: isNative(),
    platform: getPlatform(),
    capacitorLoaded: !!_cap,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "(no nav)",
  };
}
