import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spendGroup, summarize, receiptMarkdown } from '../src/spend.js';

test('spendGroup : familles de dépense', () => {
  assert.equal(spendGroup('Filet de poulet (1 kg)', 3), 'viande');
  assert.equal(spendGroup('Jambon cuit (200 g)', 3), 'charcuterie');
  assert.equal(spendGroup('BONI filet de saumon 2x125g', 3), 'poisson');
  assert.equal(spendGroup('Œufs (12)', 2), 'oeufs');
  assert.equal(spendGroup('Gouda jeune (300 g)', 2), 'fromage');
  assert.equal(spendGroup('Lait demi-écrémé (1 L)', 2), 'laitiers');
  assert.equal(spendGroup('LU Petit Beurre biscuits 200g', 4), 'sucre');
  assert.equal(spendGroup('Chips paprika 200 g', 4), 'snacks');
  assert.equal(spendGroup('Spaghetti (1 kg)', 4), 'epicerie');
  assert.equal(spendGroup('Bananes (1 kg)', 0), 'fruits');
  assert.equal(spendGroup('Pommes de terre (2,5 kg)', 0), 'legumes');
  assert.equal(spendGroup('Liquide vaisselle', 8), 'menage');
  assert.equal(spendGroup('MAES pils 5,2% casier 24x25cl', 6), 'alcool');
  assert.equal(spendGroup('Eau plate (6 × 1,5 L)', 6), 'boissons');
});

test('summarize et receiptMarkdown', () => {
  const r = { date: '2026-10-20', label: 'Colruyt', total: 12.5, paid: 13, lines: [
    { n: 'Lait (1 L)', a: 'EVERYDAY lait 1L', q: 2, t: 1.7, c: 'colruyt', s: 'Colruyt Etterbeek', cat: 2, g: 'laitiers', ns: 'B', k: 'real' },
    { n: 'Biscuits', a: 'BONI biscuits | test', q: 1, t: 2.3, c: 'colruyt', s: 'Colruyt Etterbeek', cat: 4, g: 'sucre', k: 'estimate' },
  ], butcher: [{ n: 'Haché de bœuf (500 g)', q: 1, t: 6, g: 'viande' }] };
  const s = summarize([r]);
  assert.equal(s.total, 10);
  assert.deepEqual(s.groups.map((x) => x.key), ['viande', 'sucre', 'laitiers']);
  assert.equal(s.nutri.B, 1.7);
  assert.equal(s.nutri['?'], 8.3);
  const md = receiptMarkdown(r);
  assert.match(md, /# Courses du 2026-10-20/);
  assert.match(md, /\| Lait \(1 L\) \| EVERYDAY lait 1L \| 2 \| 1,70 € \| réel/);
  assert.match(md, /BONI biscuits \/ test/); // « | » ne casse pas le tableau
  assert.match(md, /Boucher halal/);
});
