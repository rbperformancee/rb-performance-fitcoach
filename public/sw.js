
const CACHE_NAME = 'rb-perform-v1';
const STATIC_ASSETS = ['/', '/index.html', '/static/js/main.chunk.js', '/static/css/main.chunk.css', '/logo.png', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
const CACHE = "rbperf-v1";
const STATIC = ["/", "/static/js/main.chunk.js", "/static/css/main.chunk.css"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("supabase.co")) return; // Ne pas cacher les requêtes API
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push',function(e){const d=e.data?e.data.json():{};e.waitUntil(self.registration.showNotification(d.title||'RB PERFORM',{body:d.body||'Message de ton coach',icon:'/icon-192.png',badge:'/icon-192.png',vibrate:[100,50,100],data:{url:d.url||'/'}}));});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(clients.openWindow(e.notification.data.url||'/'));});
