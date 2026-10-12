import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryTerms, searchCatalog } from '../src/catalog.js';

const rows = [
  ['1', 'BONI Kaneelrol 8x90g', '', 5.45, 7.57, 'kg', 1, 0, 0],
  ['2', 'BONI Eclairs 2st', '', 2.75, 1.38, 'pc', 1, 0, 0],
  ['3', 'STIMOROL Kaneel Fire Stick 3x14g', '', 1.99, 47.38, 'kg', 4, 0, 0],
  ['4', 'BONI halfvolle melk 1L', '', 0.99, 0.99, 'l', 2, 0, 0],
  ['5', 'BONI geitenkaas rol 125g', '', 1.89, 15.12, 'kg', 2, 0, 0],
  ['6', 'BONI toiletpapier 3l 180v 16r', '', 6.99, 0.44, 'pc', 8, 0, 0],
];
const ids = (q) => searchCatalog(rows, q).map((r) => r[0]);

test('queryTerms traduit et ignore les petits mots', () => {
  const t = queryTerms('Éclairs au chocolat');
  assert.equal(t.length, 2);
  assert.ok(t[0].includes('eclair'));
  assert.ok(t[1].includes('choco'));
  assert.ok(queryTerms('pommes de terre')[0].includes('aardappel'));
});

test('searchCatalog trouve en français ce qui est écrit en néerlandais', () => {
  assert.equal(ids('cinnamon rolls')[0], '1');
  assert.equal(ids('roulé à la cannelle')[0], '1');
  assert.equal(ids('éclairs au chocolat')[0], '2');
  assert.deepEqual(ids('lait demi-écrémé'), ['4']);
  assert.deepEqual(ids('papier toilette'), ['6']);
  assert.deepEqual(ids('caviar'), []);
});

test('searchCatalog : le produit général avant les produits qui le contiennent', () => {
  const r = [
    ['1', 'BONI mayonaise met eieren 500ml', '', 1.39, 2.78, 'l', 4, 0, 0, 'BONI mayonnaise avec œufs 500ml'],
    ['2', 'BONI Eieren vrij uitloopM 12st', '', 3.99, 0.33, 'pc', 2, 0, 0, 'BONI œufs plein air 12st'],
    ['3', 'MILKA Tablet Melk 90g', '', 1.01, 11.2, 'kg', 4, 0, 0, 'MILKA Tablet lait 90g'],
    ['4', 'BONI halfvolle melk 1L', '', 0.99, 0.99, 'l', 2, 0, 0, 'BONI lait demi-écrémé 1L'],
  ];
  assert.deepEqual(searchCatalog(r, 'œufs').map((x) => x[0]), ['2', '1']);
  assert.deepEqual(searchCatalog(r, 'oeufs').map((x) => x[0]), ['2', '1']);
  assert.equal(searchCatalog(r, 'lait')[0][0], '4');
});
