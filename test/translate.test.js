import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toFrench } from '../src/translate.js';

test('toFrench traduit les noms Colruyt et remet les mots dans l\'ordre', () => {
  assert.equal(toFrench('BONI halfvolle melk PET 1L'), 'BONI lait demi-écrémé PET 1L');
  assert.equal(toFrench('BONI Kaneelrol 8x90g'), 'BONI roulé à la cannelle 8x90g');
  assert.equal(toFrench('BONI Eieren vrij uitloopM 12st'), 'BONI œufs plein air 12st');
  assert.equal(toFrench('EVERYDAY bruin brood gesneden 800g'), 'EVERYDAY pain gris coupé 800g');
  assert.equal(toFrench('Kipfilet 1kg'), 'Filet de poulet 1kg');
  assert.equal(toFrench('EVERYDAY Sinaasappelsap brik 1L'), 'EVERYDAY jus d\'orange brique 1L');
  assert.equal(toFrench('GEHAKT VARKEN RUND ±500g'), 'Haché porc bœuf ±500g');
  assert.equal(toFrench('BONI mayonaise met eieren TD 500ml'), 'BONI mayonnaise avec œufs TD 500ml');
  assert.equal(toFrench('COCA-COLA Regular 2L'), 'COCA-COLA Regular 2L'); // rien à traduire
});
