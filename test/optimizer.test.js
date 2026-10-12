import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineKm, priceOf, isOpen, bestRoute, optimize, dueRecurring, learnFrequency, mapsUrl,
} from '../src/optimizer.js';
import { HOME, STORES, DELIVERY, CHAINS, PRODUCTS } from '../src/data.js';

const chains = {
  cheap: { name: 'Cheap', index: 80 },
  pricey: { name: 'Pricey', index: 120 },
};
const home = { lat: 50.82, lng: 4.395 };
const near = { id: 'near', chain: 'pricey', name: 'Near', lat: 50.8205, lng: 4.395 };
const far = { id: 'far', chain: 'cheap', name: 'Far', lat: 50.84, lng: 4.37 };
const products = [
  { id: 'a', name: 'A', ref: 10 },
  { id: 'b', name: 'B', ref: 2, notIn: ['cheap'] },
];

test('haversine : ~1,1 km par 0,01° de latitude', () => {
  const d = haversineKm({ lat: 50.82, lng: 4.39 }, { lat: 50.83, lng: 4.39 });
  assert.ok(d > 1.0 && d < 1.2, `got ${d}`);
});

test('priceOf applique indice, override et indisponibilité', () => {
  assert.equal(priceOf(products[0], 'cheap', chains), 8);
  assert.equal(priceOf(products[0], 'cheap', chains, { a: { cheap: 7.5 } }), 7.5);
  assert.equal(priceOf(products[1], 'cheap', chains), null);
});

test('isOpen respecte les horaires et le dimanche fermé', () => {
  const s = { hours: [null, [8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20]] };
  assert.equal(isOpen(s, new Date(2026, 9, 12, 10)), true); // lundi 10h
  assert.equal(isOpen(s, new Date(2026, 9, 12, 21)), false);
  assert.equal(isOpen(s, new Date(2026, 9, 11, 10)), false); // dimanche
});

test('bestRoute choisit le plus court circuit', () => {
  const north = { lat: 50.83, lng: 4.395 };
  const east = { lat: 50.82, lng: 4.41 };
  const corner = { lat: 50.83, lng: 4.41 };
  const r = bestRoute(home, [corner, north, east], 1);
  assert.equal(r.order[1], corner); // jamais en diagonale : le coin est au milieu
});

test('temps gratuit → va au magasin le moins cher même loin', () => {
  const plans = optimize({
    items: [{ id: 'a', qty: 10 }],
    products, stores: [near, far], chains, home,
    settings: { valueOfTime: 0, maxStores: 1 },
  });
  assert.equal(plans[0].id, 'far');
});

test('temps cher → reste au magasin proche', () => {
  const plans = optimize({
    items: [{ id: 'a', qty: 1 }],
    products, stores: [near, far], chains, home,
    settings: { valueOfTime: 60, maxStores: 1 },
  });
  assert.equal(plans[0].id, 'near');
});

test('article indisponible au discount → plan à 2 magasins ou magasin cher', () => {
  const plans = optimize({
    items: [{ id: 'a', qty: 10 }, { id: 'b', qty: 1 }],
    products, stores: [near, far], chains, home,
    settings: { valueOfTime: 0, maxStores: 2 },
  });
  assert.ok(plans.every((p) => !p.label.match(/^Far$/)), 'Far seul ne peut pas tout fournir');
  const best = plans[0];
  assert.equal(best.stops.length, 2);
  const byStore = Object.fromEntries(best.stops.map((s) => [s.store.id, s.lines.map((l) => l.product.id)]));
  assert.deepEqual(byStore, { far: ['a'], near: ['b'] });
});

test('livraison soumise au minimum de commande', () => {
  const delivery = [{ id: 'd', chain: 'cheap', name: 'D', fee: 5, minOrder: 50 }];
  const small = optimize({ items: [{ id: 'a', qty: 1 }], products, stores: [], delivery, chains, home });
  assert.equal(small.length, 0);
  const big = optimize({ items: [{ id: 'a', qty: 10 }], products, stores: [], delivery, chains, home });
  assert.equal(big[0].total, 85);
});

test('openNow exclut les magasins fermés', () => {
  const closedSunday = { ...near, hours: [null, [8, 20], [8, 20], [8, 20], [8, 20], [8, 20], [8, 20]] };
  const plans = optimize({
    items: [{ id: 'a', qty: 1 }], products, stores: [closedSunday], chains, home,
    settings: { openNow: true }, now: new Date(2026, 9, 11, 10),
  });
  assert.equal(plans.length, 0);
});

test('récurrents : échéance et apprentissage de la fréquence', () => {
  const now = new Date('2026-10-12T10:00:00');
  const rec = [
    { id: 'lait', every: 5, last: '2026-10-05' },
    { id: 'pq', every: 21, last: '2026-10-01' },
    { id: 'neuf', every: 7 },
  ];
  assert.deepEqual(dueRecurring(rec, now).map((r) => r.id), ['lait', 'neuf']);
  const learned = learnFrequency({ id: 'lait', every: 5, last: '2026-10-01' }, '2026-10-11');
  assert.equal(learned.every, 7); // 5*0.7 + 10*0.3 = 6.5 → 7
});

test('données réelles : un plan complet est trouvé depuis le domicile', () => {
  const items = PRODUCTS.slice(0, 25).map((p) => ({ id: p.id, qty: 1 }));
  items.push({ id: 'nutella', qty: 1 }, { id: 'biere', qty: 1 });
  const plans = optimize({
    items, products: PRODUCTS, stores: STORES, delivery: DELIVERY, chains: CHAINS, home: HOME,
  });
  assert.ok(plans.length > 3);
  const best = plans[0];
  assert.ok(best.total >= best.goods);
  const count = best.stops.reduce((n, s) => n + s.lines.length, 0);
  assert.equal(count, items.length);
  assert.match(mapsUrl(HOME, best), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1/);
});
