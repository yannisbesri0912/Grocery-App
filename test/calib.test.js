import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addRatio, calibFactor } from '../src/calib.js';

test('calibrage : médiane des écarts, après 3 articles, bornée', () => {
  let l = addRatio([], 1.1, '2026-10-13');
  l = addRatio(l, 1.05, '2026-10-13');
  assert.equal(calibFactor(l), 1);
  l = addRatio(l, 1.2, '2026-10-13');
  l = addRatio(l, 9, '2026-10-13'); // aberrant : ignoré
  assert.equal(l.length, 3);
  assert.equal(calibFactor(l), 1.1);
  assert.equal(calibFactor([{ r: 2 }, { r: 2 }, { r: 2 }]), 1.25);
});
