// Promotions qui dépendent de la quantité, ramenées à une seule forme :
//   { k, q, d, m, r, end, txt }
//   k   'g' : par lot de q articles, d = remise moyenne (1+1 → 0,5 ; 2e à -50 % → 0,25 ;
//             3 pour 5 € → 1 − 5 / (3 × prix) ; -30 % → q = 1, d = 0,3)
//       'f' : dès q articles, tous à prix réduit (prix par quantité Colruyt)
//   m   1 si la carte du magasin est nécessaire (Delhaize Plus)
//   r   1 si les articles de la même action se mélangent
//   end date de fin (AAAA-MM-JJ) ou null ; txt : texte à afficher.

const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;

/** Prix de qty articles avec la promo (deal facultatif). */
export function dealTotal(price, qty, deal) {
  if (!deal || !(deal.q > 0) || !(deal.d > 0)) return r2(price * qty);
  if (deal.k === 'f') return r2(qty >= deal.q ? price * qty * (1 - deal.d) : price * qty);
  const groups = Math.floor(qty / deal.q);
  return r2(price * qty - groups * deal.q * price * deal.d);
}

/** Conseil : combien en prendre pour profiter de la promo, et le prix à la pièce alors. */
export function dealAdvice(price, qty, deal) {
  if (!deal || !(deal.d > 0)) return null;
  const target = deal.k === 'f' ? Math.max(qty, deal.q) : Math.max(deal.q, Math.ceil(qty / deal.q) * deal.q);
  const each = r2(dealTotal(price, target, deal) / target);
  const saving = r2(price * qty - dealTotal(price, qty, deal));
  return { target, add: target - qty, each, saving };
}

const dateOf = (s) => {
  const m = String(s ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const tidy = (s) => String(s ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/€\s?(\d)/g, '$1 €').replace(/(\d)\.(\d)/g, '$1,$2').trim();

/**
 * Promo d'un article Delhaize (réponse de l'API du site), ou null.
 * Sans action mais avec un prix réduit : prix membre (carte Delhaize Plus).
 */
export function dealFromDelhaize(p) {
  const price = p.price?.value;
  if (!(price > 0)) return null;
  for (const x of p.potentialPromotions ?? []) {
    if (!x || x.toDisplay === false || /DeliveryMode/i.test(x.promotionTypeCode ?? '')) continue;
    const q = Number(x.qualifyingCount) || 1;
    const title = `${x.title ?? ''} ${x.simplePromotionMessage ?? ''}`;
    let d = null;
    let m;
    if (/MultiBuy/i.test(x.promotionTypeCode) && (m = title.match(/(\d+)\s*(?:pour|voor)\s*€?\s*(\d+(?:[.,]\d+)?)/i))) {
      d = 1 - Number(m[2].replace(',', '.')) / (Number(m[1]) * price);
    } else if (/DiscountXEuros/i.test(x.promotionTypeCode) && (m = title.match(/€\s*(\d+(?:[.,]\d+)?)/))) {
      d = Number(m[1].replace(',', '.')) / (q * price);
    } else if (x.percentageDiscount > 0) {
      d = x.percentageDiscount / 100;
    } else if ((m = title.match(/(\d+)\s*\+\s*(\d+)/))) {
      d = Number(m[2]) / (Number(m[1]) + Number(m[2]));
    } else if ((m = title.match(/(\d+)\s*(?:e|ème|eme|de)\s*à\s*-?\s*(\d+)\s*%/i))) {
      d = Number(m[2]) / 100 / Number(m[1]);
    } else if ((m = title.match(/-\s*(\d+(?:[.,]\d+)?)\s*%/))) {
      d = Number(m[1].replace(',', '.')) / 100;
    }
    if (!(d > 0 && d < 1)) continue;
    return { k: 'g', q, d: r4(d), m: x.redemptionLevel === 'MEMBER' ? 1 : 0, r: x.range ? 1 : 0, end: dateOf(x.endDate), txt: tidy(x.title || x.simplePromotionMessage) };
  }
  const disc = Number(String(p.price?.discountedPriceFormatted ?? '').replace(/[^\d,.]/g, '').replace(',', '.'));
  if (disc > 0 && disc < price - 0.005) return { k: 'g', q: 1, d: r4(1 - disc / price), m: 1, r: 0, end: null, txt: `${Math.round((1 - disc / price) * 100)} % carte Plus` };
  return null;
}

/** Prix par quantité Colruyt (« dès 3 pièces : 1,32 € »), ou null. */
export function dealFromColruyt(p) {
  const pr = p.price ?? {};
  const q = Number(pr.quantityPriceQuantity);
  if (!(pr.quantityPrice > 0) || !(q > 1) || !(pr.basicPrice > pr.quantityPrice)) return null;
  const each = pr.quantityPrice.toFixed(2).replace('.', ',');
  return { k: 'f', q, d: r4(1 - pr.quantityPrice / pr.basicPrice), m: 0, r: 0, end: null, txt: `${each} € pièce dès ${q}` };
}
