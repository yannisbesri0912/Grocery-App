import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSize, parseSizes, nameMatches, pickBest, rankMatches } from '../src/matcher.js';
import { RULES, PET_BABY } from '../src/match-rules.js';
import { PRODUCTS } from '../src/data.js';
import { productsFromJson } from '../prices/browser.mjs';
import { toCandidate } from '../prices/colruyt.mjs';

test('parseSize lit les formats courants (FR et NL)', () => {
  assert.deepEqual(parseSize('BONI halfvolle melk PET 1L'), { amount: 1, unit: 'l' });
  assert.deepEqual(parseSize('Eau plate 6 x 1,5 L'), { amount: 9, unit: 'l' });
  assert.deepEqual(parseSize('JUPILER Pils 24x25cl'), { amount: 6, unit: 'l' });
  assert.deepEqual(parseSize('Yaourt nature 8x125g'), { amount: 1, unit: 'kg' });
  assert.deepEqual(parseSize('Œufs plein air 12 pièces'), { amount: 12, unit: 'pc' });
  assert.deepEqual(parseSize('EVERYDAY bananen ±1kg'), { amount: 1, unit: 'kg' });
  assert.equal(parseSize('Pils 5,2% blik'), null);
});

test('parseSizes garde une contenance par unité (papier toilette)', () => {
  const s = parseSizes('EVERYDAY toiletpapier sterk 3l 180v 12r');
  assert.deepEqual(s.find((x) => x.unit === 'pc'), { amount: 12, unit: 'pc' });
});

test('nameMatches : groupes obligatoires, exclusions, préfixes, animaux', () => {
  assert.ok(nameMatches(RULES.lait, 'BONI halfvolle melk PET 1L'));
  assert.ok(nameMatches(RULES.lait, 'Lait demi-écrémé UHT 1L'));
  assert.ok(!nameMatches(RULES.lait, 'Lait demi-écrémé chocolat 1L'));
  assert.ok(!nameMatches(RULES.thon, 'WHISKAS tonijn in saus 85g', PET_BABY));
  assert.ok(nameMatches(RULES.croquettes, 'WHISKAS Dry tonijn +1jaar 1,9kg', PET_BABY));
});

test('pickBest compare au prix unitaire dans la tolérance de format', () => {
  const cands = [
    { name: 'Lait demi-écrémé 1L', price: 1.05 },
    { name: 'Lait demi-écrémé 6x1L', price: 5.4 }, // 0,90 €/L → meilleur
    { name: 'Lait demi-écrémé 20cl', price: 0.3 }, // hors tolérance (trop petit)
  ];
  const best = pickBest(RULES.lait, cands);
  assert.equal(best.name, 'Lait demi-écrémé 6x1L');
  assert.equal(best.priceForSpec, 0.9);
});

test('pickBest utilise le prix unitaire fourni quand le format est illisible', () => {
  const best = pickBest(RULES.lessive, [{ name: 'EVERYDAY wasmiddel white 2,475L', price: 3.59, perUnit: { unit: 'pc', price: 0.08, perDose: true } }]);
  assert.equal(best.priceForSpec, 3.2);
});

test('un prix « par pièce » ordinaire ne passe pas pour un prix par lavage', () => {
  assert.equal(pickBest(RULES.lessive, [{ name: 'FORMIL Vloeibaar wasmiddel 2 stuks', price: 7.99, perUnit: { unit: 'pc', price: 4 } }]), null);
});

test('surgelés : séparés des produits frais', () => {
  const frozen = { name: 'BONI broccoli in roosjes 1kg', price: 1.79, frozen: true };
  const fresh = { name: 'broccoli 1st 500g', price: 1 };
  assert.equal(pickBest(RULES.brocoli, [frozen, fresh]).name, fresh.name);
  assert.equal(pickBest(RULES['legumes-surg'], [frozen, fresh]).name, frozen.name);
});

test('Colruyt : articles au poids = prix au kilo', () => {
  const c = toCandidate({ productId: '1', LongName: 'BONI Zalmfilet ±200g', content: '±200g', IsWeightArticle: true, price: { basicPrice: 26.75, measurementUnit: 'K', measurementUnitPrice: 26.75 } });
  assert.deepEqual(c.size, { amount: 1, unit: 'kg' });
  assert.equal(c.price, 26.75);
});

test('productsFromJson lit des structures variées (API, JSON-LD)', () => {
  const api = { data: { products: [
    { name: 'Lait demi-écrémé', brand: 'Delhaize', contentSize: '1 L', price: { value: 1.09, unitPrice: '1,09 €/l' } },
    { productName: 'Bananes', price: '1,99 €', quantity: '1 kg' },
  ] } };
  const ld = { '@type': 'ItemList', itemListElement: [{ '@type': 'Product', name: 'Spaghetti 1kg', offers: { price: '1.49', priceCurrency: 'EUR' } }] };
  const found = [...productsFromJson(api), ...productsFromJson(ld)];
  assert.deepEqual(found.map((p) => [p.name, p.price]), [
    ['Delhaize Lait demi-écrémé 1 L', 1.09],
    ['Bananes 1 kg', 1.99],
    ['Spaghetti 1kg', 1.49],
  ]);
});

test('productsFromJson va chercher le format dans un autre champ', () => {
  const [p] = productsFromJson({ hits: [{ name: 'Echte Ardense halfvolle melk', price: 1.05, unit: { label: '1 l' } }] });
  assert.equal(p.name, 'Echte Ardense halfvolle melk 1 l');
  assert.equal(pickBest(RULES.lait, [p]).priceForSpec, 1.05);
});

test('chaque règle vise un produit du catalogue', () => {
  const ids = new Set(PRODUCTS.map((p) => p.id));
  for (const id of Object.keys(RULES)) assert.ok(ids.has(id), id);
});

test('rankMatches : pas de conserve ni de mélange pour un légume frais', async () => {
  const { RULES } = await import('../src/match-rules.js');
  const rule = { ...RULES.carottes, cat: 0 };
  const cands = [
    { name: 'ALL SEASONS Petis pois et carottes 530 g', price: 0.99, cat: 4 },
    { name: 'Mélange carottes & panais 1 kg', price: 0.8 },
    { name: 'Carottes 1 kg', price: 1.25, cat: 0 },
  ];
  assert.deepEqual(rankMatches(rule, cands).map((c) => c.name), ['Carottes 1 kg']);
  const court = rankMatches({ ...RULES.courgettes, cat: 0 }, [{ name: 'Delhaize courgette fourré +/- 400 gr', price: 6.8 }, { name: 'Courgettes 1 kg', price: 1.39 }]);
  assert.deepEqual(court.map((c) => c.name), ['Courgettes 1 kg']);
});
