import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVoice } from '../src/voice.js';

test('parseVoice : produits, quantités, formats', () => {
  assert.deepEqual(parseVoice('Ajoute 2 litres de lait, des œufs et du pain'), [{ qty: 1, name: 'lait' }, { qty: 1, name: 'œufs' }, { qty: 1, name: 'pain' }]);
  assert.deepEqual(parseVoice('il faut trois yaourts et un poulet'), [{ qty: 3, name: 'yaourts' }, { qty: 1, name: 'poulet' }]);
  assert.deepEqual(parseVoice('rajoute deux paquets de pâtes puis de la farine'), [{ qty: 2, name: 'pâtes' }, { qty: 1, name: 'farine' }]);
  assert.deepEqual(parseVoice("de l'huile et la lessive"), [{ qty: 1, name: 'huile' }, { qty: 1, name: 'lessive' }]);
  assert.deepEqual(parseVoice('une laitue'), [{ qty: 1, name: 'laitue' }]);
});
