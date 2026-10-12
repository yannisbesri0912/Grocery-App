// Hors-ligne : sert le cache immédiatement puis le met à jour en arrière-plan.
const CACHE = 'grocery-opti-v6';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg',
  'src/style.css', 'src/app.js', 'src/data.js', 'src/optimizer.js', 'src/places.js', 'src/order.js', 'src/match-rules.js', 'src/catalog.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Les prix et le catalogue changent chaque nuit : réseau d'abord, cache si hors ligne.
  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request);
    const fresh = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached ?? fresh;
  }));
});
