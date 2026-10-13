// Hors-ligne : garde une copie de l'app ; en ligne, sert toujours la dernière version.
const CACHE = 'grocery-opti-v26';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg',
  'src/style.css', 'src/app.js', 'src/data.js', 'src/optimizer.js', 'src/places.js', 'src/order.js', 'src/match-rules.js', 'src/catalog.js', 'src/smart.js', 'src/matcher.js', 'src/recipes.js', 'src/questions.js', 'src/voice.js', 'src/scan.js', 'src/receipt.js', 'src/tuto.js', 'src/same.js', 'src/deals.js', 'src/history.js', 'src/aisles.js', 'src/calib.js', 'src/share.js', 'src/report.js', 'src/cheaper.js'];

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
  // Réseau d'abord (nouvelle version visible tout de suite), cache si hors ligne.
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request)));
});
