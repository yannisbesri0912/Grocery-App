import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameProducts } from '../src/same.js';

// [id, nom, contenu, prix, prix unitaire, unité, rayon, promo, au poids, nom fr]
const col = [
  ['c1', 'NUTELLA Chocopasta 750g', '', 4.78, 6.37, 'kg', 4, 0, 0, 'NUTELLA pâte à tartiner choco 750g'],
  ['c2', 'MAGNUM roomijs Classic 440ml', '', 5.39, 12.25, 'l', 5, 0, 0, ''],
  ['c3', 'MAGNUM double gold caramel 4x85ml', '', 5.99, 17.6, 'l', 5, 0, 0, ''],
  ['c4', 'BONI melk halfvol 1L', '', 0.99, 0.99, 'l', 2, 0, 0, 'BONI lait demi-écrémé 1L'],
  ['c5', 'COCA-COLA Zero Sugar 1,5L', '', 2.29, 1.53, 'l', 6, 0, 0, ''],
];
const del = [
  ['d1', 'NUTELLA Pâte à tartiner, choco-noisettes', '750 gr', 5.09, 6.79, 'kg', 4, 0, 0, ''],
  ['d2', 'MAGNUM Classic', '44 cl', 5.39, 12.25, 'l', 5, 0, 0, ''],
  ['d3', 'MAGNUM Mini double, caramel & gold', '6 x 5,5 cl', 8.19, 24.8, 'l', 5, 0, 0, ''],
  ['d4', 'DELHAIZE Lait, demi-écrémé', '1 l', 1.05, 1.05, 'l', 2, 0, 0, ''],
  ['d5', 'COCA-COLA Zero Sugar, PET', '6 x 1,5 l', 14.29, 1.59, 'l', 6, 0, 0, ''],
];

test('sameProducts : même marque, même format, noms proches ; pas les marques de magasin', () => {
  const pairs = sameProducts(col, del).sort();
  assert.deepEqual(pairs, [['c1', 'd1'], ['c2', 'd2']]);
});
