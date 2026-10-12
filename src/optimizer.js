// Moteur d'optimisation : pour une liste de courses, trouve la combinaison de
// magasins (et l'ordre de passage) qui minimise prix + coût du déplacement.
// Aucune dépendance au DOM : testé avec `node --test`.

export const MODES = {
  walk: { label: 'À pied', speed: 4.8, perKm: 0, gmaps: 'walking' },
  bike: { label: 'Vélo', speed: 14, perKm: 0, gmaps: 'bicycling' },
  car: { label: 'Voiture', speed: 20, perKm: 0.35, gmaps: 'driving' },
};

export const DEFAULT_SETTINGS = {
  mode: 'walk',
  valueOfTime: 10, // €/heure : combien vaut une heure de ton temps
  maxStores: 2, // nombre max de magasins par tournée
  minutesPerStore: 12, // temps moyen dans un magasin (rayons + caisse)
  openNow: false, // ignorer les magasins fermés à l'heure de départ
  detour: 1.35, // facteur distance réelle / distance à vol d'oiseau
  excluded: [], // ids de magasins/options à ne jamais utiliser
};

const round2 = (x) => Math.round(x * 100) / 100;

export function haversineKm(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Prix d'un produit dans une enseigne, avec sa provenance.
 * Ordre : prix saisi par toi > prix réel (site ou promo) > estimation.
 * L'estimation part du vrai prix Colruyt quand on l'a (sinon du prix de
 * référence) × l'indice de prix de l'enseigne.
 */
export function priceInfo(product, chainId, chains, overrides = {}, real = {}) {
  const own = overrides[product.id]?.[chainId];
  if (typeof own === 'number') return { price: own, kind: 'user' };
  const r = real[product.id]?.[chainId];
  if (r) return { price: r.price, kind: r.promo ? 'promo' : 'real', article: r.article, promo: r.promo, until: r.until };
  if (product.notIn?.includes(chainId)) return null;
  const chain = chains[chainId];
  if (!chain) return null;
  const base = real[product.id]?.colruyt?.regular?.price ?? real[product.id]?.colruyt?.price;
  const colruytIndex = chains.colruyt?.index ?? 100;
  // Le vrai prix Colruyt est celui de sa gamme la moins chère : une estimation
  // tirée de lui ne descend jamais en dessous (sinon une enseigne sans vrai prix
  // gagnerait toujours sur le papier).
  return base != null
    ? { price: round2(base * Math.max(1, chain.index / colruytIndex)), kind: 'estimate' }
    : { price: round2(product.ref * (chain.index / 100)), kind: 'estimate' };
}

export function priceOf(product, chainId, chains, overrides = {}, real = {}) {
  return priceInfo(product, chainId, chains, overrides, real)?.price ?? null;
}

export function isOpen(store, date) {
  if (!store.hours) return true;
  const slot = store.hours[date.getDay()];
  if (!slot) return false;
  const h = date.getHours() + date.getMinutes() / 60;
  return h >= slot[0] && h < slot[1];
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

// Plus court circuit domicile → magasins → domicile (force brute, n ≤ 4).
export function bestRoute(home, stores, detour = DEFAULT_SETTINGS.detour) {
  let best = { order: [], km: 0 };
  let bestKm = Infinity;
  for (const order of permutations(stores)) {
    let km = 0;
    let prev = home;
    for (const s of order) {
      km += haversineKm(prev, s);
      prev = s;
    }
    km += haversineKm(prev, home);
    if (km < bestKm) {
      bestKm = km;
      best = { order, km: round2(km * detour) };
    }
  }
  return best;
}

function combinations(arr, k) {
  const out = [];
  const rec = (start, acc) => {
    if (acc.length === k) return out.push(acc.slice());
    for (let i = start; i < arr.length; i++) {
      acc.push(arr[i]);
      rec(i + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

// Affecte chaque article au magasin le moins cher de l'ensemble.
function assign(lines, sellers, chains, overrides, real) {
  const byStore = Object.fromEntries(sellers.map((s) => [s.id, []]));
  const missing = [];
  let goods = 0;
  for (const { product, qty } of lines) {
    let best = null;
    for (const s of sellers) {
      const info = priceInfo(product, s.chain, chains, overrides, real);
      if (info && (!best || info.price < best.price)) best = { store: s, price: info.price, info };
    }
    if (!best) {
      missing.push(product);
      continue;
    }
    const total = round2(best.price * qty);
    goods += total;
    byStore[best.store.id].push({ product, qty, unit: best.price, total, info: best.info });
  }
  return { byStore, missing, goods: round2(goods) };
}

// Temps sur place : un retrait Collect (store.collect) est plus court qu'un
// passage en rayon. nStops peut être un nombre ou la liste des arrêts.
function travelCost(km, nStops, settings) {
  const mode = MODES[settings.mode] ?? MODES.walk;
  const onSite = Array.isArray(nStops)
    ? nStops.reduce((m, s) => m + (s.collect?.minutes ?? settings.minutesPerStore), 0)
    : nStops * settings.minutesPerStore;
  const minutes = (km / mode.speed) * 60 + onSite;
  const cost = (minutes / 60) * settings.valueOfTime + km * mode.perKm;
  return { km, minutes: Math.round(minutes), cost: round2(cost) };
}

/**
 * @param {object} p
 * @param {{id:string, qty:number}[]} p.items  articles de la liste
 * @param {object[]} p.products  catalogue
 * @returns {object[]} plans triés du moins cher au plus cher (coût total).
 */
export function optimize({
  items,
  products,
  stores,
  delivery = [],
  chains,
  overrides = {},
  real = {},
  home,
  settings: userSettings = {},
  now = new Date(),
}) {
  const settings = { ...DEFAULT_SETTINGS, ...userSettings };
  const catalog = new Map(products.map((p) => [p.id, p]));
  const lines = items
    .filter((it) => catalog.has(it.id) && it.qty > 0)
    .map((it) => ({ product: catalog.get(it.id), qty: it.qty }));
  if (!lines.length) return [];

  const excluded = new Set(settings.excluded);
  const usable = stores.filter(
    (s) => !excluded.has(s.id) && (!settings.openNow || isOpen(s, now)),
  );

  const plans = [];
  const maxK = Math.min(settings.maxStores, usable.length, 4);
  for (let k = 1; k <= maxK; k++) {
    for (const subset of combinations(usable, k)) {
      const a = assign(lines, subset, chains, overrides, real);
      if (a.missing.length) continue;
      // Un magasin sans article n'a rien à faire dans la tournée.
      const visited = subset.filter((s) => a.byStore[s.id].length);
      if (visited.length < subset.length) continue;
      // Retrait Collect : minimum de commande par point de retrait.
      const sub = (st) => a.byStore[st.id].reduce((t, l) => t + l.total, 0);
      if (visited.some((st) => st.collect && sub(st) < (st.collect.minOrder ?? 0))) continue;
      // Pas deux fois la même enseigne au même endroit (rayon + retrait).
      if (new Set(visited.map((st) => st.storeId ?? st.id)).size < visited.length) continue;
      const route = bestRoute(home, visited, settings.detour);
      const travel = travelCost(route.km, visited, settings);
      const fees = round2(visited.reduce((f, st) => f + (st.collect?.fee ?? 0), 0));
      const nCollect = visited.filter((st) => st.collect).length;
      plans.push({
        id: visited.map((s) => s.id).join('+'),
        kind: 'trip',
        mode: nCollect === visited.length ? 'collect' : nCollect ? 'mixed' : 'store',
        label: visited.map((s) => s.name).join(' → '),
        stops: route.order.map((s) => ({ store: s, lines: a.byStore[s.id] })),
        goods: a.goods,
        fees,
        travel,
        total: round2(a.goods + fees + travel.cost),
      });
    }
  }

  for (const d of delivery) {
    if (excluded.has(d.id)) continue;
    const seller = { id: d.id, chain: d.chain };
    const a = assign(lines, [seller], chains, overrides, real);
    if (a.missing.length || a.goods < (d.minOrder ?? 0)) continue;
    let travel = travelCost(0, 0, settings);
    let pickup = null;
    if (d.pickupStore || d.pickupChain) {
      // Retrait : magasin indiqué, ou le plus proche de l'enseigne.
      pickup = d.pickupStore
        ? stores.find((s) => s.id === d.pickupStore)
        : stores.filter((s) => s.chain === d.pickupChain && !excluded.has(s.id))
          .sort((a, b) => haversineKm(home, a) - haversineKm(home, b))[0];
      if (!pickup) continue;
      // Retrait : aller-retour au point de collecte, ~5 min sur place.
      const route = bestRoute(home, [pickup], settings.detour);
      travel = travelCost(route.km, 1, { ...settings, minutesPerStore: 5 });
    }
    plans.push({
      id: d.id,
      kind: 'delivery',
      mode: d.pickupStore || d.pickupChain ? 'collect' : 'delivery',
      label: pickup ? `${d.name.replace(/\s*\(.*\)$/, '')} (retrait ${pickup.name})` : d.name,
      delivery: d,
      stops: [{ store: pickup ?? { ...d, address: 'Livraison à domicile' }, lines: a.byStore[d.id] }],
      goods: a.goods,
      fees: d.fee ?? 0,
      travel,
      total: round2(a.goods + (d.fee ?? 0) + travel.cost),
    });
  }

  return plans.sort((x, y) => x.total - y.total || x.stops.length - y.stops.length);
}

// Lien Google Maps : départ = position actuelle du téléphone (on ne met pas
// d'origine), étapes = magasins par nom + adresse (Google les reconnaît comme de
// vrais lieux, pas des « repères placés »), arrivée = le domicile.
export function placeQuery(store) {
  const name = store.placeName ?? store.name; // nom du magasin, pas du service de retrait
  if (store.address) return `${name}, ${store.address}`;
  if (store.lat != null) return `${store.lat},${store.lng}`;
  return name;
}

export function mapsUrl(home, plan, mode = 'walk') {
  const stops = plan.stops.map((s) => s.store).filter((st) => st.address || st.lat != null).map(placeQuery);
  const params = new URLSearchParams({ api: '1', travelmode: (MODES[mode] ?? MODES.walk).gmaps });
  const back = home?.address || (home?.lat != null ? `${home.lat},${home.lng}` : null);
  if (back) {
    params.set('destination', back);
    if (stops.length) params.set('waypoints', stops.join('|'));
  } else if (stops.length) {
    params.set('destination', stops.at(-1));
    if (stops.length > 1) params.set('waypoints', stops.slice(0, -1).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params}`;
}

// Articles récurrents à racheter : dernier achat + fréquence ≤ aujourd'hui.
export function dueRecurring(recurring, now = new Date()) {
  const day = 86400000;
  return recurring.filter((r) => {
    if (!r.last) return true;
    return new Date(r.last).getTime() + r.every * day <= now.getTime();
  });
}

// Ajuste la fréquence d'un récurrent d'après l'écart réel entre deux achats
// (moyenne mobile, pour coller à ta vraie consommation).
export function learnFrequency(rec, boughtAt) {
  if (!rec.last) return { ...rec, last: boughtAt };
  const gap = (new Date(boughtAt) - new Date(rec.last)) / 86400000;
  if (gap < 1) return { ...rec, last: boughtAt };
  const every = Math.max(1, Math.round(rec.every * 0.7 + gap * 0.3));
  return { ...rec, every, last: boughtAt };
}
