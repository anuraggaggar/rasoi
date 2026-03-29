const CACHE = 'rasoi-v2'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase.co')) return
  if (e.request.url.includes('googleapis.com') || e.request.url.includes('gstatic.com')) return

  // Network-first: always try fresh content, fall back to cache if offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const cloned = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, cloned)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
