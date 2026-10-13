import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBasket, productOptions, tierOf, candidatesFromRows } from '../src/smart.js';

const opt = (...prices) => prices.map((price, i) => ({ tier: ['eco', 'house', 'brand'][i], price }));

test('tierOf reconnaît les gammes Colruyt', () => {
  assert.equal(tierOf('EVERYDAY halfvolle melk 1L'), 'eco');
  assert.equal(tierOf('BONI halfvolle melk 1L'), 'house');
  assert.equal(tierOf('INZA halfvolle melk 1L'), 'brand');
});

test('productOptions : un choix par gamme, du premier prix à la grande marque', () => {
  const rows = [
    ['1', 'EVERYDAY halfvolle melk 1L', '', 0.85, 0.85, 'l', 2, 0, 0],
    ['2', 'BONI halfvolle melk 1L', '', 0.99, 0.99, 'l', 2, 0, 0],
    ['3', 'INZA halfvolle melk 1L', '', 1.29, 1.29, 'l', 2, 0, 0],
    ['4', 'ALPRO haver drink halfvolle 1L', '', 2.1, 2.1, 'l', 2, 0, 0],
  ];
  const o = productOptions('lait', candidatesFromRows(rows));
  assert.deepEqual(o.map((x) => [x.tier, x.id, x.price]), [['eco', '1', 0.85], ['house', '2', 0.99], ['brand', '3', 1.29]]);
});

test('buildBasket : indispensables, extras qui rentrent, puis montée en gamme', () => {
  const items = [
    { id: 'a', qty: 2, must: true, options: opt(1, 1.5, 3) },
    { id: 'b', qty: 1, must: true, options: opt(4, 5) },
    { id: 'x', qty: 1, must: false, options: opt(2) },
    { id: 'y', qty: 1, must: false, options: opt(50) },
  ];
  const cheap = buildBasket(items, 10, 'cheap');
  assert.equal(cheap.total, 8); // 2 + 4 + 2 ; y ne rentre pas
  assert.deepEqual(cheap.skipped, ['y']);
  const best = buildBasket(items, 10, 'best');
  // 8 € puis b passe en marque Colruyt (+1) et a (+1) : 10 €
  assert.equal(best.total, 10);
  assert.deepEqual(best.lines.map((l) => [l.id, l.option]), [['a', 1], ['b', 1], ['x', 0]]);
  assert.equal(best.left, 0);
});

test('buildBasket : budget trop court et choix imposé', () => {
  const items = [{ id: 'a', qty: 1, must: true, options: opt(1, 2, 3), pin: 2 }, { id: 'b', qty: 1, must: true, options: opt(5) }];
  const r = buildBasket(items, 6);
  assert.equal(r.over, true);
  assert.equal(r.total, 8);
  assert.equal(r.left, -2);
});

test('tierOf : gammes Delhaize', async () => {
  const { tierOf, tierLabel } = await import('../src/smart.js');
  assert.equal(tierOf('DELHAIZE Lait, demi-écrémé', 'delhaize'), 'house');
  assert.equal(tierOf('TASTE OF INSPIRATIONS Pesto', 'delhaize'), 'house');
  assert.equal(tierOf('NUTELLA Pâte à tartiner', 'delhaize'), 'brand');
  assert.equal(tierLabel('house', 'delhaize'), 'Marque Delhaize');
  assert.equal(tierLabel('house'), 'Marque Colruyt');
});
