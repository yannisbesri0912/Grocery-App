import { test } from 'node:test';
import assert from 'node:assert/strict';
import { halalKind, butcherName, selectButchers } from '../src/halal.js';
import { RECIPES, compatible } from '../src/recipes.js';

test('halalKind : viande fraîche chez le boucher, porc, alcool, article marqué halal accepté', () => {
  assert.equal(halalKind('Filet de poulet (1 kg)', 3), 'butcher');
  assert.equal(halalKind('Haché bœuf-porc (500 g)', 3), 'butcher'); // le boucher fait du haché de bœuf
  assert.equal(halalKind('DELHAIZE Côtes, porc', 3), 'pork');
  assert.equal(halalKind('MARHABA bacon dinde Halal 80g', 3), null);
  assert.equal(halalKind('DELHAIZE Filet de saumon', 3), null);
  assert.equal(halalKind('GARDEN GOURMET Escalope, grecque style, veggie', 3), null);
  assert.equal(halalKind('BONI spaghetti bolognese 450g', 3), 'meat');
  assert.equal(halalKind('DR. OETKER Gelatine', 4), 'pork');
  assert.equal(halalKind("CÔTE D'OR pâte à tartiner choco lait 300g", 4), null);
  assert.equal(halalKind('MAES pils 5,2% casier 24x25cl', 6), 'alcohol');
  assert.equal(halalKind('AFFLIGEM Blond 0,0% 6x30cl', 6), null);
  assert.equal(halalKind('APPELSIENTJE 100% jus 1L', 6), null);
  assert.equal(halalKind('EVERYDAY chat morceaux avec bœuf 415g', 9), null); // animaux
});

test('butcherName : version halal à demander', () => {
  assert.equal(butcherName('BONI lardons fumés 200g'), 'Lardons de dinde (ou bœuf fumé)');
  assert.equal(butcherName('Haché bœuf-porc'), 'Haché de bœuf');
});

test('selectButchers : halal indiqué en premier, puis les plus proches', () => {
  const home = { lat: 50.85, lng: 4.35 };
  const dist = (a, b) => Math.hypot(a.lat - b.lat, a.lng - b.lng) * 100;
  const list = selectButchers([
    { type: 'node', id: 1, lat: 50.851, lon: 4.35, tags: { shop: 'butcher', name: 'Boucherie du coin' } },
    { type: 'node', id: 2, lat: 50.86, lon: 4.35, tags: { shop: 'butcher', name: 'Boucherie Al Baraka', 'diet:halal': 'only' } },
    { type: 'node', id: 3, lat: 50.855, lon: 4.35, tags: { shop: 'butcher', name: 'Halal Market' } },
    { type: 'node', id: 4, lat: 50.852, lon: 4.35, tags: { shop: 'butcher', name: 'Porc & co', 'diet:halal': 'no' } },
  ], home, dist);
  assert.deepEqual(list.map((b) => [b.name, b.halal]), [['Halal Market', true], ['Boucherie Al Baraka', true], ['Boucherie du coin', false]]);
});

test('régime halal : pas d\'alcool, porc remplaçable par le boucher accepté', () => {
  const kitchen = { four: true, plaques: true, micro: true, airfryer: true };
  const byName = (n) => RECIPES.find((r) => r.name === n);
  assert.equal(compatible(byName('Carbonnade flamande'), { kitchen, diet: 'halal' }), false); // bière
  assert.equal(compatible(byName('Pâtes carbonara'), { kitchen, diet: 'halal' }), true); // lardons de dinde
  assert.equal(compatible(byName('Pâtes carbonara'), { kitchen, diet: 'sans-porc' }), false);
});
