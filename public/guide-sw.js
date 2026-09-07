const CACHE = 'mw-guide-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (!url.pathname.startsWith('/assets/') && url.pathname !== '/favicon.svg') return;
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then((response) => { if (response.ok) cache.put(event.request, response.clone()); return response; });
    return cached || network;
  }));
});
