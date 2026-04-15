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

// ===== PUSH NOTIFICATIONS =====
// Event 'push' : reception d'une push Web (envoyee via VAPID depuis une
// Edge Function cote Supabase). Affiche une notification native systeme.
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch { data = { title: "RB Perform", body: e.data && e.data.text() || "" }; }

  const title = data.title || "RB Perform";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    image: data.image,
    tag: data.tag,                       // remplace une notification existante du meme tag
    renotify: data.renotify === true,
    requireInteraction: data.requireInteraction === true,
    silent: data.silent === true,
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || "/",
      clientId: data.clientId,
      type: data.type,
    },
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification — ouvre ou focus la fenetre a l'URL cible.
// Si une fenetre de l'app est deja ouverte, on la focus plutot que
// d'en ouvrir une nouvelle.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      try {
        if (new URL(w.url).origin === self.location.origin) {
          w.focus();
          w.navigate ? w.navigate(url) : w.postMessage({ type: "navigate", url });
          return;
        }
      } catch (_) {}
    }
    if (clients.openWindow) await clients.openWindow(url);
  })());
});

// Cleanup quand l'utilisateur ferme la notif sans cliquer (analytics futur)
self.addEventListener("notificationclose", (e) => {
  // no-op pour l'instant
});
