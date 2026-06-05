// src/lib/nativeBarcodeScanner.js
//
// Wrapper JS du plugin natif BarcodeScanner (iOS Vision framework).
//
// Décode un code-barre à partir d'une image base64. Plus rapide et fiable
// que zbar-wasm pour iOS natif (Apple Vision est extrêmement précis sur
// EAN-13 / UPC qui sont la norme produits alimentaires).
//
// Fallback : si le plugin natif n'est pas dispo (web, plugin pas chargé),
// retourne null → l'appelant fera son fallback zbar-wasm.

import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";

let _plugin = null;
function getPlugin() {
  if (_plugin) return _plugin;
  try {
    // Renommé en BarcodeScannerLive pour éviter collision avec
    // @capacitor-mlkit/barcode-scanning qui s'enregistre aussi en "BarcodeScanner".
    _plugin = registerPlugin("BarcodeScannerLive");
  } catch {
    _plugin = null;
  }
  return _plugin;
}

/**
 * Décode un code-barre depuis une image base64 via iOS Vision (natif).
 * @param {string} base64 - Image PNG/JPEG en base64 (avec ou sans data:image prefix)
 * @returns {Promise<string|null>} Le code-barre décodé ou null si rien trouvé
 */
export async function decodeBarcodeNative(base64) {
  // Note : scanFromImage retiré du plugin natif (remplacé par scanLive ci-dessous).
  // Cette fonction est conservée pour compat — retourne null pour fallback web.
  return null;
}

/**
 * Ouvre la caméra natif en mode scan LIVE (style Yuka/MyFitnessPal).
 * Détecte automatiquement les codes EAN-13/UPC dans le viewfinder.
 * @returns {Promise<{rawValue: string, cancelled?: boolean}|null>}
 */
export async function scanBarcodeLive() {
  if (!isNative()) return null;
  const p = getPlugin();
  if (!p) return null;
  try {
    const res = await p.scanLive();
    if (res?.cancelled) return { rawValue: "", cancelled: true };
    return { rawValue: res?.rawValue || "" };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[nativeBarcodeScanner] scanLive failed:", e?.message || e);
    return null;
  }
}
