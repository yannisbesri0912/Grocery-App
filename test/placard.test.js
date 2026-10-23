import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlacard, matchPlacard } from '../src/placard.js';
import { ING, PANTRY_LABELS } from '../src/recipes.js';
import { PRODUCTS } from '../src/data.js';

const label = (k) => ING[k].name ?? PRODUCTS.find((p) => p.id === ING[k].p)?.name.replace(/\s*\(.*\)$/, '') ?? k;
const labels = { ING: Object.fromEntries(Object.keys(ING).filter((k) => !ING[k].pantry).map((k) => [k, label(k)])), PANTRY: { ...PANTRY_LABELS, epices: 'épices' } };
const key = (n) => { const m = matchPlacard(n, labels); return m ? `${m.key}${m.pantry ? '*' : ''}` : null; };

test('parsePlacard : JSON (nom, quantite, unite), forme courte et une ligne par produit', () => {
  assert.deepEqual(parsePlacard('[{"nom":"Spaghettis","quantite":3,"unite":"paquets","stock":true},{"nom":"Sel","stock":false}]'), [{ name: 'Spaghettis', qty: '3 paquets' }]);
  assert.deepEqual(parsePlacard('[["Riz basmati","1 paquet"]]'), [{ name: 'Riz basmati', qty: '1 paquet' }]);
  assert.deepEqual(parsePlacard('3 paquets de spaghettis\n- Thon en conserve'), [{ name: 'spaghettis', qty: '3 paquets' }, { name: 'Thon en conserve', qty: '' }]);
});

test('matchPlacard : ingrédients des recettes, épices, et le reste à part', () => {
  assert.equal(key('Riz basmati'), 'riz');
  assert.equal(key('Tagliatelles aux œufs'), 'pates');
  assert.equal(key('Pommes de terre'), 'pdt');
  assert.equal(key('Purée de pommes de terre en poudre'), null);
  assert.equal(key('Thon (grande boîte)'), 'thon');
  assert.equal(key('Tomates en conserve'), 'tomates-conc');
  assert.equal(key('Sauce pesto'), 'pesto');
  assert.equal(key('Sauce au basilic'), null); // une sauce, pas l'herbe
  assert.equal(key('Petits pois et carottes'), null); // mélange : pas des carottes
  assert.equal(key('Sucre de canne'), 'sucre');
  assert.equal(key('Gingembre moulu'), 'gingembre*');
  assert.equal(key('Herbes de Provence'), 'herbes*');
  assert.equal(key('Épices pour poulet'), 'epices*');
});
