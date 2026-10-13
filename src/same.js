// Même produit chez Colruyt et chez Delhaize : même marque, même format,
// noms proches (Colruyt souvent en néerlandais, Delhaize en français).
// Les marques de magasin (Boni, Everyday, Delhaize, 365…) ne sont jamais le
// même produit d'une enseigne à l'autre : elles sont exclues.
import { norm, parseSizes } from './matcher.js';
import { ROW, BRAND } from './catalog.js';
import { toFrench } from './translate.js';

export const STORE_BRANDS = new Set(['boni', 'everyday', 'boni selection', 'delhaize', '365', 'taste of inspirations', 'delhaize bio', 'kiddies', 'nalys', 'care', 'jeff de bruges']);
const STOP = new Set(['de', 'du', 'la', 'le', 'les', 'des', 'a', 'au', 'aux', 'en', 'et', 'avec', 'pour', 'sur', 'x', 'pc', 'pcs', 'st', 'stuks', 'pieces', 'piece', 'g', 'gr', 'kg', 'cl', 'ml', 'l', 'boite', 'canette', 'bouteille', 'pet', 'blik', 'fles', 'pack', 'emballe', 'met', 'van', 'het', 'een', 'voor', 'in', 'en', 'alc', 'vol', 'fp', 'mp', 'family']);
// Mots équivalents d'une enseigne à l'autre.
const SYN = { regular: 'original', classic: 'original', classique: 'original', zero: 'zero', sugar: '', taste: '', light: 'light', pils: 'pils', blonde: '', biere: '', bier: '', chocopasta: 'tartiner', pate: '', choco: 'chocolat', chocolade: 'chocolat', hazelnoten: 'noisette', noisettes: 'noisette', hazeln: 'noisette', casier: 'caisse', bak: 'caisse' };

const stem = (w) => (w.length > 3 ? w.replace(/(es|s|x)$/, '') : w);
function tokens(text) {
  const out = new Set();
  for (let w of norm(text).replace(/\d+[.,]?\d*\s*(%|x|g|gr|kg|cl|ml|l|st|pc|pcs)?\b/g, ' ').split(/[^a-z0-9%]+/)) {
    if (!w || STOP.has(w) || /^\d/.test(w)) continue;
    if (w in SYN) w = SYN[w];
    if (w) out.add(stem(w));
  }
  return out;
}
const brandOf = (name) => norm((name.match(BRAND)?.[0] ?? '').trim());

function sizeOf(name, content) {
  const s = parseSizes(content ? `${name} ${content}` : name);
  return s.length ? s[s.length - 1] : null;
}
// Nombre de pièces d'un lot (« 4x85ml », « 6 x 5,5 cl », « 40st », « 6pc »).
function countOf(text) {
  const t = norm(text);
  const m = t.match(/(\d+)\s*x\s*\d/) ?? t.match(/(\d+)\s*(?:st|pc|pcs|pieces?|stuks?)\b/);
  return m ? Number(m[1]) : null;
}
const sameSize = (a, b) => a && b && a.unit === b.unit && Math.abs(a.amount - b.amount) <= Math.max(a.amount, b.amount) * 0.03;

export function describe(r, chain) {
  const name = r[ROW.name];
  const brand = brandOf(name);
  const rest = name.replace(BRAND, '');
  const words = chain === 'colruyt'
    ? new Set([...tokens(rest), ...tokens((r[ROW.fr] || toFrench(name)).replace(BRAND, ''))])
    : tokens(rest);
  return { r, brand, size: sizeOf(name, r[ROW.content]), count: countOf(`${name} ${r[ROW.content] ?? ''}`), words };
}

function score(a, b) {
  let shared = 0;
  for (const w of b.words) if (a.words.has(w)) shared++;
  // Colruyt a souvent deux versions du nom (néerlandais + français) : on compare au plus court.
  const base = Math.min(b.words.size, a.words.size) || 1;
  const extra = b.words.size - shared; // mots Delhaize absents chez Colruyt (variante : zero, bio…)
  return shared / base - extra * 0.12;
}

/**
 * Paires [idColruyt, idDelhaize] du même article.
 * colruyt / delhaize : lignes de catalogue (même forme que data/catalog-*.json).
 */
export function sameProducts(colruyt, delhaize) {
  const byKey = new Map();
  for (const r of colruyt) {
    if (r[ROW.weight] === 1) continue; // vendu au poids : formats non comparables
    const d = describe(r, 'colruyt');
    if (!d.brand || STORE_BRANDS.has(d.brand) || !d.size) continue;
    const key = `${d.brand}|${d.size.unit}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(d);
  }
  const best = new Map(); // idColruyt → { del, s }
  for (const r of delhaize) {
    const b = describe(r, 'delhaize');
    if (!b.brand || STORE_BRANDS.has(b.brand) || !b.size) continue;
    let top = null;
    for (const a of byKey.get(`${b.brand}|${b.size.unit}`) ?? []) {
      if (!sameSize(a.size, b.size) || (a.count && b.count && a.count !== b.count)) continue;
      const s = score(a, b);
      if (s >= 0.5 && (!top || s > top.s)) top = { a, s };
    }
    if (!top) continue;
    const id = top.a.r[ROW.id];
    const cur = best.get(id);
    if (!cur || top.s > cur.s) best.set(id, { del: r[ROW.id], s: top.s });
  }
  // Une fiche Delhaize ne va qu'avec une fiche Colruyt.
  const used = new Map();
  for (const [col, { del, s }] of best) if (!used.has(del) || used.get(del).s < s) used.set(del, { col, s });
  return [...used].map(([del, { col }]) => [col, del]);
}
