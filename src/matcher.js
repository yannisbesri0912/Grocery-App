// Rapprochement produit ↔ article réel d'une enseigne.
// Les noms viennent de sources différentes (Colruyt en néerlandais, Delhaize/Aldi
// en français, PrijsProfeet en néerlandais) : on compare des mots-clés FR/NL et
// on ramène tout à un prix unitaire (€/kg, €/L, €/pièce) pour comparer des
// formats différents. Aucune dépendance : utilisé par le robot et par l'app.

export const norm = (s) => String(s ?? '').replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[’'`]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Unités reconnues → [unité de base, facteur].
const UNITS = {
  kg: ['kg', 1], kilo: ['kg', 1], g: ['kg', 0.001], gr: ['kg', 0.001], gram: ['kg', 0.001], grammes: ['kg', 0.001],
  l: ['l', 1], ltr: ['l', 1], liter: ['l', 1], litre: ['l', 1], litres: ['l', 1],
  cl: ['l', 0.01], ml: ['l', 0.001], dl: ['l', 0.1],
  st: ['pc', 1], stuk: ['pc', 1], stuks: ['pc', 1], pc: ['pc', 1], pcs: ['pc', 1], piece: ['pc', 1], pieces: ['pc', 1],
  p: ['pc', 1], x: ['pc', 1], r: ['pc', 1], rol: ['pc', 1], rollen: ['pc', 1], rouleau: ['pc', 1], rouleaux: ['pc', 1],
  tabs: ['pc', 1], tablettes: ['pc', 1], capsules: ['pc', 1], caps: ['pc', 1], sachets: ['pc', 1], zakjes: ['pc', 1],
  oeufs: ['pc', 1], eieren: ['pc', 1],
  d: ['dose', 1], sc: ['dose', 1], doses: ['dose', 1], dosis: ['dose', 1], wasbeurten: ['dose', 1], lavages: ['dose', 1], wl: ['dose', 1],
};
const UNIT_RE = Object.keys(UNITS).sort((a, b) => b.length - a.length).join('|');
const NUM = '(\\d+(?:[.,]\\d+)?)';
// « 6x25cl », « 6 x 1,5 L », « 4x90g »
const MULTI = new RegExp(`(?:^|[^\\d.,])(\\d+)\\s*[x×*]\\s*${NUM}\\s*(${UNIT_RE})\\b`, 'g');
// « 1,5L », « 500 g », « ±1kg », « 12st »
const SINGLE = new RegExp(`(?:^|[^\\d.,])${NUM}\\s*(${UNIT_RE})\\b`, 'g');

const toNum = (s) => Number(String(s).replace(',', '.'));

/** Toutes les contenances lisibles d'un libellé, une par unité : [{ amount, unit }]. */
export function parseSizes(text) {
  const t = norm(text).replace(/±/g, ' ');
  const byUnit = new Map();
  for (const m of t.matchAll(MULTI)) {
    const [base, f] = UNITS[m[3]];
    if (m[3] === 'x') continue;
    byUnit.set(base, { amount: round(toNum(m[1]) * toNum(m[2]) * f), unit: base, multi: true });
  }
  // Plusieurs tailles d'une même unité : la dernière est presque toujours le
  // conditionnement (« 3l 180v 12r » : 3 couches, 180 feuilles, 12 rouleaux).
  for (const m of t.matchAll(SINGLE)) {
    if (m[2] === 'x' || m[2] === 'p') continue;
    const [base, f] = UNITS[m[2]];
    if (byUnit.get(base)?.multi) continue;
    byUnit.set(base, { amount: round(toNum(m[1]) * f), unit: base });
  }
  return [...byUnit.values()].map(({ amount, unit }) => ({ amount, unit }));
}

/** Contenance principale (poids/volume avant pièces), ou null. */
export function parseSize(text) {
  const all = parseSizes(text);
  return ['kg', 'l', 'dose', 'pc'].map((u) => all.find((x) => x.unit === u)).find(Boolean) ?? null;
}

const FROZEN_WORDS = /diepvries|diepgevroren|surgel|congel/;
const isFrozen = (c) => c.frozen === true || FROZEN_WORDS.test(norm(c.name));

const round = (x) => Math.round(x * 10000) / 10000;

const wordRe = new Map();
function hasWord(text, word) {
  let re = wordRe.get(word);
  if (!re) {
    const w = norm(word);
    const prefix = w.endsWith('*');
    const body = (prefix ? w.slice(0, -1) : w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(^|[^a-z0-9])${body}${prefix ? '' : '([^a-z0-9]|$)'}`);
    wordRe.set(word, re);
  }
  return re.test(text);
}

/** Le libellé respecte-t-il la règle (tous les groupes `all`, aucun mot `not`) ? */
export function nameMatches(rule, name, globalNot = []) {
  const t = norm(name);
  if ((rule.not ?? []).some((w) => hasWord(t, w))) return false;
  if (!rule.pets && globalNot.some((w) => hasWord(t, w))) return false;
  return (rule.all ?? []).every((group) => group.some((w) => hasWord(t, w)));
}

/**
 * Choisit l'article le moins cher au prix unitaire parmi ceux qui correspondent.
 * candidates : [{ name, price, size?: {amount, unit}, unitPrice?, ... }]
 * Renvoie { ...candidat, unitPrice, size, priceForSpec } ou null.
 */
export function pickBest(rule, candidates, globalNot = []) {
  const [best] = rankMatches(rule, candidates, globalNot, 1);
  return best ?? null;
}

/**
 * Tous les articles qui correspondent, du moins cher au plus cher au prix
 * unitaire (au plus `limit`). Même format que pickBest.
 */
export function rankMatches(rule, candidates, globalNot = [], limit = Infinity) {
  const [amount, unit] = rule.size;
  const [lo, hi] = rule.tol ?? [0.5, 2.5];
  const all = [];
  for (const c of candidates) {
    if (!(c.price > 0) || !nameMatches(rule, c.name, globalNot)) continue;
    if (c.kind === 'baby' || (c.kind === 'pet' && !rule.pets)) continue;
    if (rule.frozen !== 'any' && Boolean(rule.frozen) !== isFrozen(c)) continue;
    const sizes = c.size ? [c.size] : parseSizes(c.content ? `${c.name} ${c.content}` : c.name);
    let size = sizes.find((x) => x.unit === unit);
    // Vendu à la pièce sans contenance écrite (« Concombre », « Laitue ») : une pièce.
    if (!size && unit === 'pc' && !sizes.length && !c.perUnit && amount === 1) size = { amount: 1, unit: 'pc' };
    let unitPrice;
    if (size) {
      const ratio = size.amount / amount;
      if (ratio < lo || ratio > hi) continue;
      unitPrice = c.price / size.amount;
    } else if (c.perUnit?.price > 0 && (c.perUnit.unit === unit || (unit === 'dose' && c.perUnit.perDose))) {
      // Format illisible mais prix unitaire fourni par l'enseigne
      // (ex. lessive : Colruyt donne le prix par lavage).
      unitPrice = c.perUnit.price;
      size = { amount: Math.round(c.price / unitPrice), unit };
    } else continue;
    all.push({ ...c, size, unitPrice });
  }
  all.sort((a, b) => a.unitPrice - b.unitPrice);
  return all.slice(0, limit).map((c) => ({ ...c, priceForSpec: Math.round(c.unitPrice * amount * 100) / 100 }));
}
