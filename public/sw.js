// Self-destruct service worker: unregisters itself and clears all caches.
// The browser will fetch this updated sw.js, install it, and it will
// immediately clean up — breaking the stale cache cycle.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))),
      self.registration.unregister(),
    ]).then(() => self.clients.claim())
      .then(() => {
        // Force all open tabs to reload with fresh content
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.navigate(client.url))
        })
      })
  )
})
