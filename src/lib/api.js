// src/lib/api.js
//
// Helper pour les fetch vers nos endpoints Vercel /api/*.
//
// Pourquoi : sur l'app native (Capacitor iOS), le bundle JS est servi depuis
// `capacitor://localhost`. Un fetch relatif `/api/x` tape donc
// `capacitor://localhost/api/x` → 404 (ce scheme ne sert que le bundle local).
//
// Sur web (PWA, navigateur, prod rbperform.app), les paths relatifs marchent
// directement parce que l'origin === https://rbperform.app.
//
// → On préfixe par l'URL absolue uniquement sur native. apiUrl("/api/x")
//   renvoie soit "/api/x" (web), soit "https://rbperform.app/api/x" (native).

import { isNative } from "./native";

const PROD_BASE = "https://rbperform.app";

/**
 * Préfixe un path par l'URL prod absolue uniquement sur native.
 * @param {string} path - ex: "/api/voice-transcribe"
 * @returns {string}
 */
export function apiUrl(path) {
  if (!isNative()) return path;
  // Sanity : si on nous donne déjà une URL absolue, on la renvoie telle quelle
  if (/^https?:\/\//i.test(path)) return path;
  // Sanity : path doit commencer par "/"
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${PROD_BASE}${p}`;
}

export default apiUrl;
