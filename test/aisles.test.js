import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aisleKey, aisleOrder } from '../src/aisles.js';

test('aisles : parcours Colruyt (place exacte, sinon médiane du rayon) et ordre habituel', () => {
  assert.equal(aisleOrder('colruyt')[0], 6); // boissons d'abord chez Colruyt
  assert.equal(aisleOrder('delhaize')[0], 0); // fruits et légumes d'abord
  assert.ok(aisleKey('colruyt', 6, 0) < aisleKey('colruyt', 0, 0));
  assert.equal(aisleKey('colruyt', 4, 123), 123);
  assert.ok(aisleKey('delhaize', 0) < aisleKey('delhaize', 5));
});
