// RB Perform — Service Worker
// Strategie : network-first pour HTML/navigation (toujours frais),
// cache-first pour assets statiques hashes (immutables),
// programme cache proactivement pour acces offline.

const CACHE_VERSION = "rbperf-v" + (self.registration?.scope || "") + "-" + Date.now();
const STATIC_CACHE = "rbperf-static-v7";
const DATA_CACHE = "rbperf-data-v1";

// App shell : fichiers critiques pre-caches a l'installation
const APP_SHELL = [
  "/",
  "/index.html",
  "/icon-192.png",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  // Best-effort: si l'un des fichiers APP_SHELL manque, on continue quand meme
  // sinon l'install echoue et l'ancien SW reste actif (= ancien bundle casse).
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => console.warn("SW cache skip:", url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== CACHE_VERSION && k !== DATA_CACHE)
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

  // Ne jamais toucher aux APIs externes (Supabase, OpenFoodFacts, Anthropic)
  if (url.origin !== self.location.origin) return;

  // Ne jamais cacher les fonctions serverless
  if (url.pathname.startsWith("/api/")) return;

  const isHTML =
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html") ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html");

  // HTML : network-first (toujours frais), fallback cache pour offline
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

// ===== MESSAGE API : cache programme depuis l'app =====
// L'app envoie { type: "CACHE_PROGRAMME", html: "..." } quand un programme est charge
self.addEventListener("message", (e) => {
  if (e.data?.type === "CACHE_PROGRAMME" && e.data.html) {
    caches.open(DATA_CACHE).then((cache) => {
      const blob = new Blob([e.data.html], { type: "text/html" });
      const response = new Response(blob, {
        headers: { "Content-Type": "text/html", "X-Cached-At": new Date().toISOString() },
      });
      cache.put("/offline-programme", response);
    });
  }

  if (e.data?.type === "GET_CACHED_PROGRAMME") {
    caches.open(DATA_CACHE).then((cache) => {
      cache.match("/offline-programme").then((res) => {
        if (res) {
          res.text().then((html) => {
            e.source.postMessage({ type: "CACHED_PROGRAMME", html });
          });
        } else {
          e.source.postMessage({ type: "CACHED_PROGRAMME", html: null });
        }
      });
    });
  }
});

// Push notifications
self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || "Notification", {
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
