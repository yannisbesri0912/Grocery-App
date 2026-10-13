import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDay, priceSignal } from '../src/history.js';

test('historique : jours alignés, rattrapage dans le désordre, signal « prix bas »', () => {
  let h = addDay(null, '2026-10-01', { lait: { colruyt: 1.05 } });
  h = addDay(h, '2026-10-05', { lait: { colruyt: 1.09, delhaize: 1.15 } });
  h = addDay(h, '2026-10-03', { lait: { colruyt: 1.07 } });
  assert.deepEqual(h.dates, ['2026-10-01', '2026-10-03', '2026-10-05']);
  assert.deepEqual(h.p.lait.colruyt, [1.05, 1.07, 1.09]);
  assert.deepEqual(h.p.lait.delhaize, [null, null, 1.15]);
  const s = priceSignal(h, 'lait', 'colruyt', 0.95, '2026-10-06');
  assert.equal(s.min, 1.05);
  assert.equal(s.low, true);
  assert.equal(priceSignal(h, 'lait', 'colruyt', 1.08, '2026-10-06').low, false);
  assert.equal(priceSignal(h, 'lait', 'delhaize', 1, '2026-10-06'), null); // pas assez de jours
});
