// src/lib/health.js
//
// Apple Health / Health Connect (Android) wrapper pour RB Perform.
//
// Cas d'usage actuel : auto-fill du compteur de pas du jour dans WeightChart.
// L'utilisateur n'a plus à taper son nombre de pas manuellement — on lit
// HealthKit (iPhone + Apple Watch) au mount.
//
// Comportement par plateforme :
// - iOS natif : utilise HealthKit via capacitor-health plugin
//   (NSHealthShareUsageDescription requis dans Info.plist + HealthKit
//    entitlement dans App.entitlements)
// - Android natif : utilise Google Health Connect (requiert l'app HC installée)
// - Web (Safari/Chrome PWA) : retourne null partout — pas d'équivalent web
//   universel (Web Bluetooth pour fitness trackers est trop fragmenté)
//
// Tout est défensif : import dynamique, try/catch, retour `null` plutôt que
// throw — l'app continue à fonctionner avec saisie manuelle si HealthKit
// indisponible ou refusé.

import { isNative } from "./native";

let _Health = null;
let _importFailed = false;

async function getHealth() {
  if (_Health) return _Health;
  if (_importFailed || !isNative()) return null;
  try {
    const mod = await import("capacitor-health");
    _Health = mod.Health;
    return _Health;
  } catch (e) {
    _importFailed = true;
    // eslint-disable-next-line no-console
    console.error("[health] dynamic import failed:", e);
    return null;
  }
}

/**
 * `true` si HealthKit/Health Connect est disponible sur ce device.
 * iOS : toujours true depuis iOS 8 (donc effectivement vrai sur tout iPhone moderne).
 * Android : false si l'app Health Connect n'est pas installée.
 * Web : false.
 */
export async function isHealthAvailable() {
  if (!isNative()) return false;
  const Health = await getHealth();
  if (!Health) return false;
  try {
    const res = await Health.isHealthAvailable();
    return !!res?.available;
  } catch {
    return false;
  }
}

/**
 * Demande la permission de lire les pas.
 *
 * iOS spécifique : Apple n'expose PAS si l'user a accepté ou refusé (privacy by
 * design). On request blindement — la prochaine requête `queryAggregated`
 * retournera 0 si refusé ou si pas de données.
 *
 * À appeler une seule fois après que l'user soit logged-in et ait fait son
 * onboarding (pas au boot global, sinon le system prompt s'affiche avant que
 * l'user comprenne pourquoi).
 */
export async function requestStepsPermission() {
  const Health = await getHealth();
  if (!Health) return false;
  try {
    await Health.requestHealthPermissions({ permissions: ["READ_STEPS"] });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[health] permission request failed:", e);
    return false;
  }
}

/**
 * Retourne le nombre total de pas effectués aujourd'hui (00:00 jusqu'à maintenant).
 * Source : HealthKit iOS (iPhone + Apple Watch fusionnés) ou Health Connect Android.
 *
 * Retourne `null` si :
 * - pas sur natif (web)
 * - permission refusée
 * - aucune donnée (user n'a pas marché ou device tout neuf)
 * - erreur API
 *
 * L'appelant doit gérer `null` en gardant la valeur saisie manuellement.
 */
export async function getTodaySteps() {
  const Health = await getHealth();
  if (!Health) return null;
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const res = await Health.queryAggregated({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      dataType: "steps",
      bucket: "day",
    });
    const samples = res?.aggregatedData || [];
    if (samples.length === 0) return 0;
    const total = samples.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
    return Math.round(total);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[health] queryAggregated steps failed:", e);
    return null;
  }
}
