import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dealTotal, dealAdvice, dealFromDelhaize, dealFromColruyt } from '../src/deals.js';

const promo = (over) => ({ price: { value: 2.09 }, potentialPromotions: [{ promotionTypeCode: 'BuyXGetPercentageOffAllProductsPromotion', redemptionLevel: 'MEMBER', range: true, toDisplay: true, endDate: '14/10/2026 21:59:00', ...over }] });

test('dealFromDelhaize : les formes de promo du site', () => {
  assert.deepEqual(dealFromDelhaize(promo({ title: '2ème à -50%', qualifyingCount: 2 })), { k: 'g', q: 2, d: 0.25, m: 1, r: 1, end: '2026-10-14', txt: '2ème à -50%' });
  assert.equal(dealFromDelhaize(promo({ title: '1+1_gratis', qualifyingCount: 2 })).d, 0.5);
  assert.equal(dealFromDelhaize(promo({ title: '2+1 Gratis', qualifyingCount: 3, percentageDiscount: 33.33 })).d, 0.3333);
  assert.equal(dealFromDelhaize(promo({ title: '-20%_pour 3', qualifyingCount: 3 })).d, 0.2);
  assert.equal(dealFromDelhaize(promo({ title: '-30%', qualifyingCount: 1 })).d, 0.3);
  assert.equal(dealFromDelhaize(promo({ title: '2ème à -70%', qualifyingCount: 2, percentageDiscount: 35 })).d, 0.35);
  const multi = dealFromDelhaize({ price: { value: 2.19 }, potentialPromotions: [{ promotionTypeCode: 'GroceryProductMultiBuyPromotion', title: '3 pour €5', qualifyingCount: 3, redemptionLevel: 'MEMBER' }] });
  assert.equal(multi.q, 3);
  assert.equal(dealTotal(2.19, 3, multi), 5);
  assert.equal(multi.txt, '3 pour 5 €');
  const eur = dealFromDelhaize({ price: { value: 36.35 }, potentialPromotions: [{ promotionTypeCode: 'DiscountXEurosForYArticlesPromotion', title: '- €5', qualifyingCount: 1, redemptionLevel: 'MEMBER' }] });
  assert.equal(dealTotal(36.35, 1, eur), 31.35);
  // Livraison gratuite : pas une réduction de prix.
  assert.equal(dealFromDelhaize(promo({ promotionTypeCode: 'BuyXChangeDeliveryModePromotion', title: '2=livraison_gratuite', qualifyingCount: 2 })), null);
  // Prix réduit sans action : prix carte Plus.
  assert.deepEqual(dealFromDelhaize({ price: { value: 0.69, discountedPriceFormatted: '€0,62' }, potentialPromotions: [] }), { k: 'g', q: 1, d: 0.1014, m: 1, r: 0, end: null, txt: '10 % carte Plus' });
});

test('dealTotal / dealAdvice : par lot et dès une quantité', () => {
  const half = { k: 'g', q: 2, d: 0.25 };
  assert.equal(dealTotal(2, 1, half), 2);
  assert.equal(dealTotal(2, 2, half), 3);
  assert.equal(dealTotal(2, 3, half), 5);
  assert.deepEqual(dealAdvice(2, 1, half), { target: 2, add: 1, each: 1.5, saving: 0 });
  const col = dealFromColruyt({ price: { basicPrice: 1.99, quantityPrice: 1.32, quantityPriceQuantity: '3.0' } });
  assert.equal(col.txt, '1,32 € pièce dès 3');
  assert.equal(dealTotal(1.99, 2, col), 3.98);
  assert.equal(dealTotal(1.99, 3, col), 3.96);
  assert.equal(dealFromColruyt({ price: { basicPrice: 1.99, quantityPrice: 0, quantityPriceQuantity: '' } }), null);
});
