// Theme management — dark / light / auto avec persistence localStorage.
//
// Ce module fait deux choses :
//   1. Couche bas-niveau : getStoredTheme/applyTheme/setTheme + watcher
//      systeme. Utilisable sans React (au boot, ou dans index.js).
//   2. Hook React useTheme() qui wrappe le tout : etat reactif +
//      auto-resync sur changement systeme (mode auto) + cross-tab sync.
//
// Boot recommande : import + applyTheme(getStoredTheme()) dans index.js
// avant le React render, pour eviter le flash dark -> light au premier
// paint en mode light.
import { useEffect, useState, useCallback } from "react";

const KEY = "rb_theme";
const MODES = ["dark", "light", "auto"];

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : "dark";
  } catch {
    return "dark";
  }
}

export function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode) {
  return mode === "auto" ? getSystemTheme() : mode;
}

export function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
  }
  return resolved;
}

export function setTheme(mode) {
  try { localStorage.setItem(KEY, mode); } catch {}
  return applyTheme(mode);
}

// Listener pour le changement auto
export function watchSystemTheme(cb) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => cb(mq.matches ? "dark" : "light");
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

// Synchronise aussi meta theme-color (barre statut iOS PWA + tabs Chrome).
// Appele systematiquement par applyTheme — important pour que la couleur
// de la barre statut iPhone matche le theme actif.
function syncMetaThemeColor(resolved) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = resolved === "light" ? "#fafafa" : "#050505";
}
// Hook le syncMetaThemeColor dans applyTheme (idempotent : pas de bug
// si applyTheme est appele plusieurs fois). On ne modifie pas applyTheme
// existant pour ne pas casser ses usages, on enrichit via wrapper.
const _applyTheme = applyTheme;
export function applyThemeWithMeta(mode) {
  const resolved = _applyTheme(mode);
  syncMetaThemeColor(resolved);
  return resolved;
}

/**
 * useTheme — hook React reactif.
 *
 * Expose :
 *   - mode  : "dark" | "light" | "auto" (la pref stockee)
 *   - resolved : "dark" | "light" (le theme effectif applique)
 *   - setMode : (newMode) => void, persiste + applique
 *   - toggle  : cycle dark <-> light (skip auto)
 *
 * Auto-sync :
 *   - Si mode === "auto" et que l'OS change de theme, le resolved suit.
 *   - Si un autre onglet change la pref via localStorage, on suit aussi.
 */
export function useTheme() {
  const [mode, setModeState] = useState(() => getStoredTheme());
  const [resolved, setResolvedState] = useState(() => resolveTheme(getStoredTheme()));

  // Applique au mount (defensive — au cas ou index.js ne l'a pas fait)
  useEffect(() => { applyThemeWithMeta(mode); }, []); // eslint-disable-line

  // Watch system pour le mode auto
  useEffect(() => {
    if (mode !== "auto") return;
    return watchSystemTheme((sys) => {
      setResolvedState(sys);
      applyThemeWithMeta("auto");
    });
  }, [mode]);

  // Watch cross-tab : si l'utilisateur change la pref dans un autre onglet
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY) return;
      const newMode = MODES.includes(e.newValue) ? e.newValue : "dark";
      setModeState(newMode);
      setResolvedState(resolveTheme(newMode));
      applyThemeWithMeta(newMode);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    setResolvedState(applyThemeWithMeta(next));
    try { localStorage.setItem(KEY, next); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "light" ? "dark" : "light");
  }, [resolved, setMode]);

  return { mode, resolved, setMode, toggle, isLight: resolved === "light", isDark: resolved === "dark" };
}
