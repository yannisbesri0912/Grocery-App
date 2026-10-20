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

test('optimize : promo « 2e à -50 % » comptée si la quantité et la carte y sont', async () => {
  const { optimize } = await import('../src/optimizer.js');
  const products = [{ id: 'x', name: 'X', ref: 2 }];
  const stores = [
    { id: 'c', chain: 'colruyt', name: 'Colruyt', lat: 50.8, lng: 4.4 },
    { id: 'd', chain: 'delhaize', name: 'Delhaize', lat: 50.8, lng: 4.4 },
  ];
  const chains = { colruyt: { index: 100 }, delhaize: { index: 110 } };
  const real = { x: { colruyt: { price: 1.8 }, delhaize: { price: 2, deal: { k: 'g', q: 2, d: 0.25, m: 1 } } } };
  const home = { lat: 50.8, lng: 4.4 };
  const run = (qty, cards) => optimize({ items: [{ id: 'x', qty }], products, stores, chains, real, home, settings: { maxStores: 2, valueOfTime: 0, cards } })[0];
  assert.equal(run(2, {}).stops[0].store.id, 'c'); // sans carte : 3,60 € chez Colruyt
  const withCard = run(2, { delhaize: true }); // avec carte : 2 × 2 € − 25 % = 3 €
  assert.equal(withCard.stops[0].store.id, 'd');
  assert.equal(withCard.goods, 3);
  assert.equal(withCard.stops[0].lines[0].saving, 1);
  assert.equal(run(1, { delhaize: true }).stops[0].store.id, 'c'); // 1 seul : pas de promo
});

test('lineCost : on paie des paquets entiers', async () => {
  const { lineCost } = await import('../src/optimizer.js');
  assert.deepEqual(lineCost(0.92, 1, 1.38), { total: 1.38, packs: 1 }); // 500 g voulus, paquet de 750 g
  assert.deepEqual(lineCost(0.92, 3, 1.38), { total: 2.76, packs: 2 }); // 1,5 kg = 2 paquets
  assert.deepEqual(lineCost(4.19, 2, 3.49), { total: 10.47, packs: 3 }); // 24 œufs en boîtes de 10
  assert.deepEqual(lineCost(1.29, 2, 1.29), { total: 2.58 }); // même format
  assert.deepEqual(lineCost(1.39, 1, 2.09, { k: 'g', q: 2, d: 0.25 }), { total: 2.09, packs: 1 });
});

test('optimize : le format le moins cher pour la quantité voulue (1 L seul plutôt qu\'un pack de 6)', async () => {
  const { optimize } = await import('../src/optimizer.js');
  const products = [{ id: 'lait', name: 'Lait (1 L)', ref: 1 }];
  const stores = [{ id: 'd', chain: 'delhaize', name: 'Delhaize', lat: 50.8, lng: 4.4 }];
  const real = { lait: { delhaize: { price: 1.05, pack: 6.29, article: 'Lait 6 x 1 l', alts: [{ price: 1.15, pack: 1.15, article: 'Lait 1 l' }] } } };
  const run = (qty) => optimize({ items: [{ id: 'lait', qty }], products, stores, chains: { delhaize: { index: 110 } }, real, home: { lat: 50.8, lng: 4.4 }, settings: { valueOfTime: 0 } })[0].stops[0].lines[0];
  assert.equal(run(1).info.article, 'Lait 1 l');
  assert.equal(run(1).total, 1.15);
  assert.equal(run(6).info.article, 'Lait 6 x 1 l');
  assert.equal(run(6).total, 6.29);
});

test('optimize : œufs, la boîte de 12 plutôt que des boîtes de 10 pour 12 ou 24 œufs', async () => {
  const { optimize } = await import('../src/optimizer.js');
  const products = [{ id: 'oeufs', name: 'Œufs (12)', ref: 3 }];
  const stores = [{ id: 'd', chain: 'delhaize', name: 'Delhaize', lat: 50.8, lng: 4.4 }];
  const real = { oeufs: { delhaize: { price: 4.19, pack: 3.49, article: 'œufs 10 pc', alts: [{ price: 4.29, pack: 4.29, article: 'œufs 12 pc' }] } } };
  const run = (qty) => optimize({ items: [{ id: 'oeufs', qty }], products, stores, chains: { delhaize: { index: 110 } }, real, home: { lat: 50.8, lng: 4.4 }, settings: { valueOfTime: 0 } })[0].stops[0].lines[0];
  assert.equal(run(1).info.article, 'œufs 12 pc');
  assert.equal(run(2).total, 8.58);
});

test('optimize : un autre format ne profite jamais de la promo de l\'article retenu', async () => {
  const { optimize } = await import('../src/optimizer.js');
  const products = [{ id: 'eponges', name: 'Éponges (3)', ref: 2 }];
  const stores = [{ id: 'd', chain: 'delhaize', name: 'Delhaize', lat: 50.8, lng: 4.4 }];
  const deal = { k: 'g', q: 2, d: 0.25, m: 0, r: 0, end: null, txt: '2e à -50 %' };
  const real = { eponges: { delhaize: { price: 1.5, pack: 1.5, article: 'Éponges A', deal, alts: [{ price: 1.1, pack: 1.1, article: 'Éponges B' }] } } };
  const line = optimize({ items: [{ id: 'eponges', qty: 2 }], products, stores, chains: { delhaize: { index: 110 } }, real, home: { lat: 50.8, lng: 4.4 }, settings: { valueOfTime: 0 } })[0].stops[0].lines[0];
  // A : 2 × 1,50 − 25 % = 2,25 € ; B sans promo : 2,20 € (et pas 1,10 € avec la promo de A).
  assert.equal(line.info.article, 'Éponges B');
  assert.equal(line.total, 2.2);
  assert.equal(line.info.deal, null);
});

test('priceInfo : une promo terminée revient au prix normal (ou plus de vrai prix)', async () => {
  const { priceInfo } = await import('../src/optimizer.js');
  const p = { id: 'x', name: 'X', ref: 5 };
  const chains = { colruyt: { index: 100 }, lidl: { index: 95 } };
  const real = { x: {
    colruyt: { price: 1, promo: true, until: '2026-10-01', regular: { price: 10, article: 'X normal' } },
    lidl: { price: 1, promo: true, until: '2026-10-01', promoOnly: true },
  } };
  assert.equal(priceInfo(p, 'colruyt', chains, {}, real, '2026-10-20').price, 10);
  assert.equal(priceInfo(p, 'colruyt', chains, {}, real, '2026-09-30').price, 1);
  assert.equal(priceInfo(p, 'lidl', chains, {}, real, '2026-10-20').kind, 'estimate');
});

test('packsFor : jamais plus de 5 % d\'un paquet en moins', async () => {
  const { packsFor } = await import('../src/optimizer.js');
  assert.equal(packsFor(1, 1, 0.96), 1); // 960 g pour « 1 kg » : l'achat normal
  assert.equal(packsFor(1, 2, 0.96), 3); // 2 kg : 3 paquets de 960 g
  assert.equal(packsFor(1.05, 6, 6.29), 1); // 6 L en pack de 6 × 1 L (prix arrondi)
  assert.equal(packsFor(1, 1, 0.8), 2); // 800 g pour 1 kg : 2 paquets
  for (const [price, pack] of [[1, 0.96], [0.92, 1.38], [4.19, 3.49], [1.05, 6.29], [2.3, 1.15]]) {
    for (let qty = 1; qty <= 12; qty++) {
      const n = packsFor(price, qty, pack) ?? qty;
      const per = pack / price; // unités de la liste par paquet
      assert.ok(n * per >= qty - 0.05 * per - 0.01 * qty, `${price}/${pack} × ${qty} → ${n}`);
    }
  }
});
