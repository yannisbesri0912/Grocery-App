import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareLink, readShared } from '../src/share.js';

test('liste partagée : aller-retour par le lien, produits perso inclus, rien d\'autre', () => {
  const list = [{ id: 'lait', qty: 2, checked: true }, { id: 'col-580', qty: 1 }, { id: 'zero', qty: 0 }];
  const custom = [{ id: 'col-580', name: 'EVERYDAY lait demi-écrémé', cat: 2, ref: 0.85, custom: true, colruyt: { id: '580', price: 0.85, date: 'x', walk: 3 } }, { id: 'autre', name: 'Pas dans la liste' }];
  const url = shareLink('https://exemple.github.io/app/#plan', list, custom);
  assert.match(url, /^https:\/\/exemple\.github\.io\/app\/#liste=[A-Za-z0-9_-]+$/);
  const r = readShared(new URL(url).hash);
  assert.deepEqual(r.items, [{ id: 'lait', qty: 2 }, { id: 'col-580', qty: 1 }]);
  assert.equal(r.custom.length, 1);
  assert.equal(r.custom[0].name, 'EVERYDAY lait demi-écrémé');
  assert.deepEqual(r.custom[0].colruyt, { id: '580', price: 0.85 });
  assert.equal(readShared('#liste=pas-du-json'), null);
  assert.equal(readShared('#autre'), null);
});
