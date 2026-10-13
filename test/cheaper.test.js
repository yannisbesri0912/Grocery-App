import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cheaperOptions } from '../src/cheaper.js';

const rows = [
  ['1', 'DANONE Fromage frais, maigre', '500 gr', 2.15, 4.3, 'kg', 2, 0, 0, ''],
  ['2', 'DELHAIZE Fromage frais, maigre', '500 gr', 1.02, 2.04, 'kg', 2, 0, 0, ''],
  ['3', 'DELHAIZE Fromage frais, entier', '500 gr', 0.95, 1.9, 'kg', 2, 0, 0, ''],
  ['4', 'DANONE Fromage frais, maigre', '1 kg', 3.5, 3.5, 'kg', 2, 0, 0, ''],
];
test('cheaperOptions : marque du magasin à quantité égale, mêmes mots distinctifs ; grand format', () => {
  const o = cheaperOptions(rows[0], rows, 'delhaize');
  assert.equal(o.swap.r[0], '2'); // pas le « entier », pourtant moins cher
  assert.equal(o.swap.saving, 1.13);
  assert.equal(o.bigger.r[0], '4');
  assert.equal(cheaperOptions(rows[1], rows, 'delhaize').swap, undefined);
});
