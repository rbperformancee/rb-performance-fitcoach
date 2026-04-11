// RB Perform — Service Worker
// Strategie : network-first pour HTML/navigation (toujours frais),
// cache-first pour assets statiques hashes (immutables).
// Le CACHE_VERSION change a chaque build via le timestamp injecte par CRA.

const CACHE_VERSION = "rbperf-v" + (self.registration?.scope || "") + "-" + Date.now();
const STATIC_CACHE = "rbperf-static-v3";

self.addEventListener("install", (e) => {
  // Active immediatement le nouveau SW sans attendre la fermeture des onglets
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Purge tous les anciens caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ne jamais toucher aux APIs externes (Supabase, OpenFoodFacts, Anthropic, Stripe)
  if (url.origin !== self.location.origin) return;

  // Ne jamais cacher les fonctions serverless
  if (url.pathname.startsWith("/api/")) return;

  const isHTML =
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html") ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html");

  // HTML : network-first (sinon les utilisateurs PWA reste bloques sur un vieux index.html
  // qui pointe vers un ancien hash de bundle => bug "feature pas visible apres deploy")
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Assets hashes (main.<hash>.js, *.<hash>.css, images, fonts) : cache-first immuable
  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});

// Push notifications
self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || "RB PERFORM", {
      body: d.body || "Message de ton coach",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: d.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || "/"));
});
