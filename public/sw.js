// SW minimal 12/06 : purge caches au boot + handlers push uniquement.
// Pas de fetch handler = pas de cache (tradeoff offline pour stabilité bundle).

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// ===== PUSH NOTIFICATIONS =====
// Reçoit le payload Apple Web Push / VAPID et affiche la notif système.
// Sans ce handler, Apple delivre le push mais aucune notif n'apparaît.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    try { data = { title: "RB Perform", body: event.data?.text() || "" }; }
    catch (_) { data = { title: "RB Perform" }; }
  }
  const title = data.title || "RB Perform";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "rb-perform-default",
    renotify: true,
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap sur la notif → ouvre l'app sur l'URL ciblée (ou la home si pas d'URL).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) {
      if (c.url.includes(url) || url === "/") {
        if ("focus" in c) return c.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
