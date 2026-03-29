// Service Worker RB PERFORM
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Recevoir message pour programmer une notification timer
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_TIMER') {
    const { delay, title, body } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [200, 100, 200, 100, 400],
        tag: 'rest-timer',
        requireInteraction: false,
      });
    }, delay * 1000);
  }
  if (e.data?.type === 'CANCEL_TIMER') {
    // Annuler la notification programmée - pas possible directement
    // On ferme la notification si elle existe
    self.registration.getNotifications({ tag: 'rest-timer' })
      .then(notifs => notifs.forEach(n => n.close()));
  }
});
