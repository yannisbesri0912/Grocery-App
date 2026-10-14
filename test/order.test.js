import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderLink, searchText } from '../src/order.js';

const lait = { id: 'lait', name: 'Lait demi-écrémé (1 L)' };

test('searchText garde le nom utile de l\'article', () => {
  assert.equal(searchText('EVERYDAY bananen ±1kg'), 'bananen');
  assert.equal(searchText('Delhaize Gekke appelen | Verpakt 1,5 kg'), 'Gekke appelen');
  assert.equal(searchText('BONI halfvolle melk 6x1L'), 'halfvolle melk');
});

test('orderLink ouvre la fiche produit quand le prix vient du site', () => {
  const l = orderLink('delhaize', { product: lait, info: { kind: 'real', article: 'Lait', url: '/nl/shop/x/p/F1' } });
  assert.deepEqual(l, { url: 'https://www.delhaize.be/fr/shop/x/p/F1', kind: 'product', query: 'Lait' });
});

test('orderLink cherche l\'article, sinon la recherche du catalogue', () => {
  const real = orderLink('delhaize', { product: lait, info: { kind: 'real', article: 'Delhaize Lait demi-écrémé | 1 L' } });
  assert.equal(real.kind, 'search');
  assert.equal(real.query, 'Lait demi-écrémé');
  // Collect&Go : noms d'articles en néerlandais → mots français à coller.
  const cg = orderLink('colruyt', { product: lait, info: { kind: 'real', article: 'BONI halfvolle melk 1L' } });
  assert.deepEqual(cg, { url: 'https://www.collectandgo.be/fr/home', kind: 'search', query: 'lait demi-écrémé' });
  const est = orderLink('delhaize', { product: lait, info: { kind: 'estimate', url: '/x' } });
  assert.equal(est.query, 'lait demi-écrémé');
  assert.match(est.url, /^https:\/\/www\.delhaize\.be\/fr\/shop\/search\?text=lait%20demi/);
  const perso = orderLink('delhaize', { product: { id: 'perso-1', name: 'Houmous (200 g)' }, info: { kind: 'user' } });
  assert.equal(perso.query, 'Houmous');
  assert.equal(orderLink('lidl', { product: lait, info: {} }), null);
});

test('lien direct appris : numéro retrouvé dans une adresse collée, puis appliqué aux autres produits', async () => {
  const { learnTemplate, fillTemplate, orderLink } = await import('../src/order.js');
  const t = learnTemplate('https://www.collectandgo.be/cogo/fr/artikel/campina-room-culinair-20-vg-25cl/26280?x=1', { id: '10671', art: '26280', tech: '1397030' }, 'CAMPINA room culinair 20%vg 25cl');
  assert.deepEqual(t, { tpl: 'https://www.collectandgo.be/cogo/fr/artikel/{slug}/{art}?x=1', key: 'art' });
  assert.equal(fillTemplate(t, { art: '123' }, 'BONI Lait demi-écrémé 1L'), 'https://www.collectandgo.be/cogo/fr/artikel/boni-lait-demi-ecreme-1l/123?x=1');
  assert.equal(learnTemplate('https://example.be/x/999', { id: '10671' }, 'X'), null);
  const line = { product: { id: 'lait', name: 'Lait' }, info: { kind: 'real', article: 'BONI lait', ref: { art: '555' } } };
  assert.equal(orderLink('colruyt', line, { colruyt: t }).kind, 'product');
  assert.equal(orderLink('colruyt', line).kind, 'search');
});

test('article Delhaize dans une commande Colruyt : on cherche son équivalent, sans la marque Delhaize', () => {
  const est = orderLink('colruyt', { product: { id: 'delhaize-9', name: 'DELHAIZE Steak, cerf 300 gr' }, info: { kind: 'estimate' } });
  assert.equal(est.query, 'Steak, cerf');
  const eq = orderLink('colruyt', { product: { id: 'delhaize-9', name: 'DELHAIZE Lait, demi-écrémé 1 l' }, info: { kind: 'real', eq: true, article: 'BONI lait demi-écrémé 1L' } });
  assert.equal(eq.query, 'lait demi-écrémé');
});
