// src/lib/localNotif.js
//
// Wrapper notifications LOCALES unifié web ↔ iOS natif.
//
// Cas d'usage : rest timer (fin du repos) + notifs in-app quand l'app est en
// background ou écran verrouillé. Différent du push APNs (qui passe par le
// serveur) — ici c'est 100% client.
//
// - iOS natif : @capacitor/local-notifications (UNUserNotificationCenter)
// - Web : Notification API + serviceWorker fallback
//
// Permissions :
// - iOS : la permission push (déjà demandée par usePushNotifications) couvre
//   AUSSI les local notifications. Pas de prompt séparé.
// - Web : Notification.requestPermission() à demander au premier usage.
//
// API publique : showNotif({ title, body, when }), cancelAll().

import { isNative } from "./native";

let _LocalNotif = null;
let _importFailed = false;

async function getLocalNotif() {
  if (_LocalNotif) return _LocalNotif;
  if (_importFailed || !isNative()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    _LocalNotif = mod.LocalNotifications;
    return _LocalNotif;
  } catch (e) {
    _importFailed = true;
    // eslint-disable-next-line no-console
    console.error("[localNotif] dynamic import failed:", e);
    return null;
  }
}

/**
 * Affiche une notification locale immédiate ou différée.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {number} [opts.whenSec] — délai en secondes (default: maintenant)
 * @param {string} [opts.tag] — id pour overrider une précédente notif identique
 */
export async function showNotif({ title, body, whenSec = 0, tag } = {}) {
  if (!title) return false;

  // iOS natif → LocalNotifications plugin
  if (isNative()) {
    const LN = await getLocalNotif();
    if (!LN) return false;
    try {
      const id = tag ? Math.abs(hashStr(tag)) % 2147483647 : Date.now() % 2147483647;
      const schedule = whenSec > 0
        ? { at: new Date(Date.now() + whenSec * 1000) }
        : undefined;
      // ATTENTION : Capacitor 8 mappe `sound: "default"` à un fichier
      // bundle nommé littéralement "default" (qui n'existe pas) → AUCUN
      // son. Il faut nommer un vrai fichier embarqué dans le .app.
      // `rb_alarm.caf` est généré depuis Tink.aiff via afconvert et
      // ajouté à l'App target via Resources build phase.
      await LN.schedule({
        notifications: [{
          id,
          title,
          body,
          schedule,
          sound: "rb_alarm.caf",
        }],
      });
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[localNotif] schedule failed:", e);
      return false;
    }
  }

  // Web → Notification API (fallback)
  try {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") return false;
    const fire = () => new Notification(title, { body, tag, icon: "/logo192.png" });
    if (whenSec > 0) setTimeout(fire, whenSec * 1000);
    else fire();
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[localNotif] web Notification failed:", e);
    return false;
  }
}

/**
 * Annule toutes les notifs locales programmées (utile quand l'user reset
 * le timer ou ferme une session avant la fin).
 */
export async function cancelAllNotifs() {
  if (!isNative()) return;
  const LN = await getLocalNotif();
  if (!LN) return;
  try {
    const pending = await LN.getPending();
    if (pending?.notifications?.length) {
      await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
  } catch {}
}

/**
 * Demande la permission notifs sur natif. À appeler une fois après onboarding.
 * Sur iOS, mutualisé avec le prompt push APNs si pas déjà fait.
 */
export async function requestNotifPermission() {
  if (isNative()) {
    const LN = await getLocalNotif();
    if (!LN) return false;
    try {
      const res = await LN.requestPermissions();
      return res?.display === "granted";
    } catch {
      return false;
    }
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "default") {
    const res = await Notification.requestPermission();
    return res === "granted";
  }
  return Notification.permission === "granted";
}

// Simple hash for tag → numeric id
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
