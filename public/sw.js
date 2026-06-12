// SW pass-through 12/06 — purge caches au boot, puis bypass total (fetch direct réseau).
// Ne s'auto-unregister PAS (pour éviter l'écran blanc post-navigate).
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Pas de fetch handler = pas d'interception = chaque requête va direct au réseau Vercel.
// Conséquence : zéro cache, plus de bug stale. Tradeoff : pas d'offline (mais on
// préfère ça à un crash).
