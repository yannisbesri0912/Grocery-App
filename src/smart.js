// Panier malin : plusieurs choix par produit (premier prix, marque Colruyt,
// grande marque) aux vrais prix du catalogue Colruyt, puis le meilleur panier
// qui tient dans le budget.
import { rankMatches, norm } from './matcher.js';
import { RULES, PET_BABY } from './match-rules.js';
import { ROW, rowName } from './catalog.js';

// Gammes, de la moins chère à la plus qualitative.
export const TIERS = [
  { key: 'eco', label: 'Premier prix' },
  { key: 'house', label: 'Marque Colruyt' },
  { key: 'brand', label: 'Grande marque' },
];
const RANK = Object.fromEntries(TIERS.map((t, i) => [t.key, i]));

/** Gamme d'un article Colruyt d'après sa marque. */
export function tierOf(name) {
  if (/^everyday\b/i.test(name)) return 'eco';
  // Boni, Colruyt, et les articles sans marque (boucherie, fruits au poids).
  // (Un nom tout en majuscules, « GEHAKT VARKEN RUND », n'a pas de marque non plus.)
  if (/^(boni|colruyt)\b/i.test(name) || !/^[A-ZÀ-Ý0-9&'.-]{2,}\b/.test(name) || !/[a-z]{3,}/.test(name)) return 'house';
  return 'brand';
}

/** Lignes du catalogue → candidats pour le matcher. */
export function candidatesFromRows(rows) {
  return rows.map((r) => {
    const weight = r[ROW.weight] === 1;
    const unit = r[ROW.unit];
    return {
      id: r[ROW.id],
      name: r[ROW.content] ? `${r[ROW.name]} ${r[ROW.content]}` : r[ROW.name],
      article: rowName(r), // nom français affiché
      // Articles au poids : le prix affiché est un prix au kilo.
      price: weight && r[ROW.unitPrice] ? r[ROW.unitPrice] : r[ROW.price],
      ...(weight && unit ? { size: { amount: 1, unit } } : {}),
      perUnit: unit && r[ROW.unitPrice] ? { unit, price: r[ROW.unitPrice], perDose: unit === 'pc' } : undefined,
      frozen: r[ROW.cat] === 5,
      kind: r[ROW.cat] === 9 ? 'pet' : undefined,
      promo: r[ROW.promo] === 1,
    };
  }).map((c) => ({ ...c, norm: norm(c.name) }));
}

// Premier tri rapide : garder les articles qui contiennent un mot du premier
// groupe de la règle (le matcher complet est lent sur 10 000 articles).
function prefilter(rule, candidates) {
  const words = (rule.all?.[0] ?? []).map((w) => norm(w).replace(/\*$/, ''));
  if (!words.length) return candidates;
  return candidates.filter((c) => words.some((w) => (c.norm ?? norm(c.name)).includes(w)));
}

/**
 * Choix pour un produit du catalogue de l'app : l'article le moins cher de
 * chaque gamme qui existe, du premier prix à la grande marque.
 * → [{ tier, label, id, article, price, promo }]
 */
export function productOptions(productId, candidates) {
  const rule = RULES[productId];
  if (!rule) return [];
  const best = {};
  for (const c of rankMatches(rule, prefilter(rule, candidates), PET_BABY, 60)) {
    const tier = tierOf(c.article ?? c.name);
    if (!best[tier]) best[tier] = { tier, label: TIERS[RANK[tier]].label, id: c.id, article: c.article ?? c.name, price: c.priceForSpec, promo: c.promo };
  }
  // Du premier prix à la grande marque ; une gamme plus chère qu'une gamme
  // au-dessus n'a pas d'intérêt et disparaît (les choix montent en prix).
  const opts = Object.values(best).sort((a, b) => RANK[a.tier] - RANK[b.tier]);
  return opts.filter((o, i) => opts.slice(i + 1).every((h) => h.price > o.price));
}

/**
 * Meilleur panier dans le budget.
 * items : [{ id, qty, must, options: [{ tier, price }] (du moins cher au plus cher), pin?: index }]
 *   must : indispensable (sinon « si le budget le permet »), dans l'ordre de priorité
 *   pin  : choix imposé par l'utilisateur
 * goal  : 'best' (meilleure gamme possible dans le budget) ou 'cheap' (le moins cher)
 * Ordre de remplissage : indispensables au moins cher, puis les extras qui
 * rentrent, puis montée en gamme (le plus petit supplément d'abord).
 */
export function buildBasket(items, budget, goal = 'best') {
  const cost = (it, i) => it.options[i].price * it.qty;
  const picked = new Map(); // id → index d'option
  let total = 0;
  for (const it of items) {
    if (!it.must || !it.options.length) continue;
    const i = it.pin ?? 0;
    picked.set(it.id, i);
    total += cost(it, i);
  }
  const skipped = [];
  for (const it of items) {
    if (it.must || !it.options.length) continue;
    const i = it.pin ?? 0;
    if (total + cost(it, i) <= budget + 1e-9) { picked.set(it.id, i); total += cost(it, i); } else skipped.push(it.id);
  }
  if (goal === 'best') {
    for (;;) {
      let step = null;
      for (const it of items) {
        const i = picked.get(it.id);
        if (i == null || it.pin != null || i + 1 >= it.options.length) continue;
        const extra = cost(it, i + 1) - cost(it, i);
        if (total + extra > budget + 1e-9) continue;
        if (!step || extra < step.extra) step = { it, extra };
      }
      if (!step) break;
      picked.set(step.it.id, picked.get(step.it.id) + 1);
      total += step.extra;
    }
  }
  const lines = items.filter((it) => picked.has(it.id)).map((it) => ({ id: it.id, qty: it.qty, must: it.must, option: picked.get(it.id), price: cost(it, picked.get(it.id)) }));
  total = Math.round(total * 100) / 100;
  return { lines, total, left: Math.round((budget - total) * 100) / 100, over: total > budget + 1e-9, skipped };
}
