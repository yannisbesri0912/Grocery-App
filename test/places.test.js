import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainFromTags, parseOpeningHours, selectStores, todayHours } from '../src/places.js';

test('chainFromTags reconnaît les enseignes suivies', () => {
  assert.equal(chainFromTags({ brand: 'Colruyt' }), 'colruyt');
  assert.equal(chainFromTags({ name: 'AD Delhaize Etterbeek' }), 'delhaize');
  assert.equal(chainFromTags({ brand: 'Carrefour Express' }), 'carrefourx');
  assert.equal(chainFromTags({ name: 'Carrefour Market Flagey' }), 'carrefour');
  assert.equal(chainFromTags({ brand: 'ALDI' }), 'aldi');
  assert.equal(chainFromTags({ name: 'Épicerie du coin' }), null);
});

test('parseOpeningHours lit les formats courants', () => {
  const h = parseOpeningHours('Mo-Sa 08:00-20:00; Su off');
  assert.deepEqual(h[1], [8, 20]);
  assert.deepEqual(h[6], [8, 20]);
  assert.equal(h[0], null);
  const g = parseOpeningHours('Mo-Fr 08:30-20:00; Sa 08:30-19:00; Su 09:00-12:30');
  assert.deepEqual(g[6], [8.5, 19]);
  assert.deepEqual(g[0], [9, 12.5]);
  assert.deepEqual(parseOpeningHours('Mo-Sa 08:00-12:00,13:30-18:00')[2], [8, 18]);
  assert.equal(parseOpeningHours('sunrise-sunset'), null);
  assert.equal(todayHours(g, new Date(2026, 9, 11)), '9h–12h30'); // dimanche
});

test('selectStores garde les plus proches, 2 par enseigne', () => {
  const home = { lat: 50.85, lng: 4.35 };
  const el = (id, brand, dLat) => ({ type: 'node', id, lat: 50.85 + dLat, lon: 4.35, tags: { brand, 'addr:street': 'Rue X', 'addr:housenumber': String(id) } });
  const kept = selectStores([el(1, 'Aldi', 0.03), el(2, 'Aldi', 0.01), el(3, 'Aldi', 0.02), el(4, 'Colruyt', 0.05), el(5, 'Boucherie', 0.001)], home);
  assert.deepEqual(kept.map((s) => s.id), ['osm-node-2', 'osm-node-3', 'osm-node-4']);
  assert.equal(kept[0].address, 'Rue X 2');
});
