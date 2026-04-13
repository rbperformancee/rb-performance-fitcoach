// Theme management — dark / light / auto avec persistence localStorage.
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
