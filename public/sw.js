// SW pass-through 12/06 : purge tous les caches existants au boot puis
// bypass total (zéro fetch handler = chaque requête va direct au réseau).
// Tradeoff : pas d'offline. Mais on préfère perdre l'offline plutôt que
// servir un ancien bundle bugué aux users (Rayan, 12/06 ramp launch).
//
// Reverter à la stratégie network-first + cache-first des assets quand
// la situation sera stable (après QA propre du bundle).

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Pas de fetch handler intentionnel = bypass total
