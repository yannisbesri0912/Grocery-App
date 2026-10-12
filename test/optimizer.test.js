import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineKm, priceOf, isOpen, bestRoute, optimize, dueRecurring, learnFrequency, mapsUrl,
} from '../src/optimizer.js';
import { DELIVERY, CHAINS, PRODUCTS } from '../src/data.js';

const chains = {
  cheap: { name: 'Cheap', index: 80 },
  pricey: { name: 'Pricey', index: 120 },
};
const home = { lat: 50.82, lng: 4.395 };
const near = { id: 'near', chain: 'pricey', name: 'Near', lat: 50.8205, lng: 4.395 };
// Quartier fictif pour le test « données réelles ».
const HOME = { lat: 50.85, lng: 4.35 };
const STORES = [
  { id: 'c1', chain: 'colruyt', name: 'Colruyt A', lat: 50.852, lng: 4.353 },
  { id: 'a1', chain: 'aldi', name: 'Aldi B', lat: 50.847, lng: 4.346 },
  { id: 'l1', chain: 'lidl', name: 'Lidl C', lat: 50.856, lng: 4.36 },
  { id: 'd1', chain: 'delhaize', name: 'Delhaize D', lat: 50.849, lng: 4.352 },
  { id: 'x1', chain: 'carrefourx', name: 'Carrefour Express E', lat: 50.8505, lng: 4.3505 },
];
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

test('une estimation ne passe jamais sous le vrai prix Colruyt', () => {
  const chainsBE = { colruyt: { index: 100 }, lidl: { index: 95 }, delhaize: { index: 113 } };
  const real = { lait: { colruyt: { price: 0.52 } } };
  const p = { id: 'lait', ref: 1.05 };
  assert.equal(priceOf(p, 'lidl', chainsBE, {}, real), 0.52);
  assert.equal(priceOf(p, 'delhaize', chainsBE, {}, real), 0.59);
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

test('mapsUrl : départ = position actuelle, magasins par nom et adresse, retour au domicile', () => {
  const plan = { stops: [
    { store: { name: 'Colruyt Etterbeek', address: 'Rue A 1, 1040 Etterbeek', lat: 1, lng: 2 } },
    { store: { name: 'Aldi', lat: 50.1, lng: 4.2 } },
  ] };
  const u = new URL(mapsUrl({ address: 'Rue B 2, 1040 Etterbeek', lat: 0, lng: 0 }, plan, 'walk'));
  assert.equal(u.searchParams.get('origin'), null);
  assert.equal(u.searchParams.get('destination'), 'Rue B 2, 1040 Etterbeek');
  assert.equal(u.searchParams.get('waypoints'), 'Colruyt Etterbeek, Rue A 1, 1040 Etterbeek|50.1,4.2');
  assert.equal(u.searchParams.get('travelmode'), 'walking');
});

test('retrait Collect : frais, minimum de commande et temps sur place réduit', () => {
  const store = { id: 's', chain: 'cheap', name: 'S', lat: 50.821, lng: 4.395 };
  const collect = { ...store, id: 's#collect', storeId: 's', name: 'Collect S', collect: { fee: 5, minOrder: 0, minutes: 5 } };
  const plans = optimize({
    items: [{ id: 'a', qty: 1 }], products, stores: [store, collect], chains, home,
    settings: { valueOfTime: 60, maxStores: 2 },
  });
  const inStore = plans.find((p) => p.id === 's');
  const pickup = plans.find((p) => p.id === 's#collect');
  assert.equal(pickup.mode, 'collect');
  assert.equal(pickup.fees, 5);
  assert.equal(inStore.travel.minutes - pickup.travel.minutes, 7); // 12 min en rayon contre 5
  assert.ok(!plans.some((p) => p.id.includes('s+s#collect') || p.id.includes('s#collect+s')), 'pas rayon + retrait au même magasin');
  const minPlans = optimize({
    items: [{ id: 'a', qty: 1 }], products, stores: [{ ...collect, collect: { fee: 0, minOrder: 30, minutes: 5 } }], chains, home,
  });
  // 8 € < minimum 30 € : proposé quand même, avec ce qui manque
  assert.equal(minPlans.length, 1);
  assert.equal(minPlans[0].short[0].missing, 22);
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

test('retrait Collect sous le minimum : proposé avec le montant manquant, après les plans faisables', async () => {
  const { optimize } = await import('../src/optimizer.js');
  const home = { lat: 50.84, lng: 4.39 };
  const collect = (id, chain, fee, minOrder) => ({ id, chain, name: id, lat: 50.841, lng: 4.391, storeId: id.replace('#c', ''), collect: { name: id, fee, minOrder, minutes: 5 } });
  const plans = optimize({
    items: [{ id: 'x', qty: 1 }],
    products: [{ id: 'x', name: 'X', ref: 10 }],
    stores: [collect('d#c', 'delhaize', 0, 30), collect('c#c', 'colruyt', 5.95, 0)],
    chains: { delhaize: { index: 90 }, colruyt: { index: 100 } },
    home,
    settings: { maxStores: 1 },
  });
  const d = plans.find((p) => p.id === 'd#c');
  assert.ok(d, 'Delhaize Collect proposé');
  assert.equal(d.short[0].missing, 21);
  assert.equal(plans[0].id, 'c#c'); // le plan faisable passe d'abord
});
