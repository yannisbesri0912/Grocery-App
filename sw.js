// Hors-ligne : garde une copie de l'app ; en ligne, sert la dernière version.
const CACHE = 'grocery-opti-v30';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg',
  'src/style.css', 'src/app.js', 'src/data.js', 'src/optimizer.js', 'src/places.js', 'src/order.js', 'src/match-rules.js', 'src/catalog.js', 'src/smart.js', 'src/matcher.js', 'src/recipes.js', 'src/questions.js', 'src/voice.js', 'src/scan.js', 'src/receipt.js', 'src/tuto.js', 'src/same.js', 'src/deals.js', 'src/history.js', 'src/aisles.js', 'src/calib.js', 'src/share.js', 'src/report.js', 'src/cheaper.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Données lourdes (catalogues, recettes, historique) : gardées d'une version à
// l'autre, servies tout de suite depuis le téléphone et rafraîchies en arrière-plan.
const DATA = 'grocery-opti-data';
const HEAVY = /\/data\/(catalog-[a-z]+|recipes-wikibooks|history|same)\.json$/;

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== DATA).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Réseau d'abord, mais pas plus de 3,5 s si une copie existe (magasin mal capté).
function networkFirst(req, cacheName) {
  const net = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(cacheName).then((c) => c.put(req, copy)); }
    return res;
  });
  return caches.match(req).then((cached) => {
    if (!cached) return net;
    const slow = new Promise((resolve) => setTimeout(() => resolve(cached), 3500));
    return Promise.race([net.catch(() => cached), slow]);
  });
}

// Rafraîchies au plus toutes les 6 h (économise les données mobiles).
const FRESH = 6 * 3600 * 1000;
function staleWhileRevalidate(e, req) {
  const update = () => fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(DATA).then((c) => c.put(req, copy)); }
    return res;
  });
  return caches.open(DATA).then((c) => c.match(req)).then((cached) => {
    if (!cached) return update();
    const age = Date.now() - new Date(cached.headers.get('date') ?? 0).getTime();
    if (!(age < FRESH)) e.waitUntil(update().catch(() => {}));
    return cached;
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (HEAVY.test(url.pathname)) e.respondWith(staleWhileRevalidate(e, e.request));
  else e.respondWith(networkFirst(e.request, CACHE));
});
