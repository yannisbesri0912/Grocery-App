import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReceipt, detectChain } from '../src/receipt.js';

const TICKET = `COLRUYT LAAGSTE PRIJZEN
Rue Exemple 10 1040 Etterbeek
BONI HALFV MELK 1L        0,99 A
EVERYDAY BANANEN          1,13 A
2 x 0,89
BONI YOGHURT NAT          1,78 A
KIPFILET                  7,75 A
KORTING                  -0,50
SPAGHETTI 500G            0,90 A
TOTAAL                   12,05
BANCONTACT               12,05
BTW A 6%   0,68`;

test('parseReceipt : articles, quantités, réductions et total', () => {
  const r = parseReceipt(TICKET);
  assert.equal(r.total, 12.05);
  assert.deepEqual(r.items.map((i) => [i.name, i.qty, i.total]), [
    ['BONI HALFV MELK 1L', 1, 0.99], ['EVERYDAY BANANEN', 1, 1.13], ['BONI YOGHURT NAT', 2, 1.78], ['KIPFILET', 1, 7.25], ['SPAGHETTI 500G', 1, 0.9],
  ]);
  assert.equal(r.items[2].price, 0.89);
});

test('detectChain', () => {
  assert.equal(detectChain(TICKET), 'colruyt');
  assert.equal(detectChain('AD DELHAIZE ETTERBEEK'), 'delhaize');
  assert.equal(detectChain('ALDI Marché'), 'aldi');
  assert.equal(detectChain('Épicerie du coin'), null);
});
