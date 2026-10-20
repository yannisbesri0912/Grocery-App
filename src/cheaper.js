// « Moins cher pour la même chose » pour un article précis de la liste :
//  - swap   : le même genre de produit, autre marque (souvent celle du magasin),
//             moins cher à quantité égale, dans le même magasin ;
//  - bigger : la même marque en plus grand format, moins chère au kilo / litre.
import { describe, STORE_BRANDS } from './same.js';
import { ROW } from './catalog.js';

// Mots qui changent le produit : présents d'un côté, ils doivent l'être de l'autre.
const DISTINCT = ['bio', 'light', 'zero', 'sans', 'lactose', 'lactosevrij', 'proteine', 'protein', 'choco', 'chocolat', 'chocolade',
  'vegan', 'vegetal', 'vegetale', 'plantaardig', 'soja', 'haver', 'avoine', 'amande', 'amandel', 'entier', 'volle', 'vol', 'halfvolle', 'halfvol',
  'demi', 'ecreme', 'mager', 'magere', 'maigre', 'kefir', 'grec', 'griekse', 'light', 'decafeine', 'cafeinevrij', 'gluten', 'glutenvrij', 'kids', 'baby'];
const distinct = (words) => DISTINCT.filter((w) => [...words].some((x) => x === w || x.startsWith(w)));

const indexes = new WeakMap(); // lignes du catalogue → descriptions par rayon et unité
function indexOf(rows, chain) {
  if (indexes.has(rows)) return indexes.get(rows);
  const idx = new Map();
  for (const r of rows) {
    if (r[ROW.weight] === 1) continue; // vendu au poids
    const d = describe(r, chain);
    if (!d.size || !d.words.size || !(r[ROW.price] > 0)) continue;
    const key = `${r[ROW.cat]}|${d.size.unit}`;
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push({ ...d, unit: r[ROW.price] / d.size.amount });
  }
  indexes.set(rows, idx);
  return idx;
}

/** → { swap: { r, saving }, bigger: { r, perUnit, pct } } (chacun facultatif) */
export function cheaperOptions(row, rows, chain) {
  if (!row || row[ROW.weight] === 1) return {};
  const me = describe(row, chain);
  if (!me.size || !me.words.size) return {};
  const myUnit = row[ROW.price] / me.size.amount;
  const myDistinct = distinct(me.words).join('|');
  let swap = null;
  let bigger = null;
  for (const d of indexOf(rows, chain).get(`${row[ROW.cat]}|${me.size.unit}`) ?? []) {
    if (d.r[ROW.id] === row[ROW.id]) continue;
    let shared = 0;
    for (const w of me.words) if (d.words.has(w)) shared++;
    const cover = shared / me.words.size;
    const extra = d.words.size - shared;
    const ratio = d.size.amount / me.size.amount;
    if (d.brand === me.brand) {
      if (cover >= 0.8 && extra <= 1 && ratio >= 1.2 && d.unit < myUnit * 0.95 && distinct(d.words).join('|') === myDistinct) {
        const pct = 1 - d.unit / myUnit;
        if (!bigger || pct > bigger.pct) bigger = { r: d.r, perUnit: d.unit, pct: Math.round(pct * 100) / 100 };
      }
    } else if (STORE_BRANDS.has(d.brand) && cover >= 0.6 && extra <= 2 && ratio >= 0.6 && ratio <= 1.7 && d.unit < myUnit * 0.92
      && distinct(d.words).join('|') === myDistinct) {
      const saving = Math.round((myUnit - d.unit) * me.size.amount * 100) / 100;
      if (saving >= 0.15 && (!swap || saving > swap.saving)) swap = { r: d.r, saving };
    }
  }
  return { ...(swap ? { swap } : {}), ...(bigger ? { bigger } : {}) };
}
