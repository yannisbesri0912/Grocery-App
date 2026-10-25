// Reçus conservés (« Courses faites », tickets scannés) : classement des dépenses
// en familles parlantes (viande, biscuits, produits ménagers…), Nutri-Score des
// achats, et texte Markdown d'un reçu à envoyer tel quel (à Claude, par exemple).
// Rayons (cat) = indices de CATEGORIES (src/data.js) :
// 0 fruits & légumes, 1 boulangerie, 2 crèmerie, 3 viande & poisson, 4 épicerie,
// 5 surgelés, 6 boissons, 7 hygiène, 8 entretien, 9 bébé & animaux.
import { norm } from './matcher.js';
import { halalKind } from './halal.js';

export const GROUPS = {
  fruits: 'Fruits', legumes: 'Légumes', viande: 'Viande', charcuterie: 'Charcuterie', poisson: 'Poisson',
  oeufs: 'Œufs', fromage: 'Fromage', laitiers: 'Lait, yaourts, beurre', pain: 'Pain',
  sucre: 'Biscuits et sucreries', snacks: 'Snacks salés', epicerie: 'Épicerie (pâtes, riz, conserves…)',
  surgeles: 'Surgelés', boissons: 'Boissons', alcool: 'Alcool', hygiene: 'Hygiène',
  menage: 'Produits ménagers', bebe: 'Bébé et animaux', autre: 'Autre',
};

const FISH = /saumon|zalm|thon|tonijn|cabillaud|kabeljauw|poisson|\bvis\b|crevette|garnaal|scampi|moule|mossel|truite|forel|maquereau|makreel|hareng|haring|colin|surimi|calamar|gamba/;
const CHARCU = /jambon|\bham\b|salami|saucisson|\bpate\b|pastei|chorizo|bacon|americain|rillette|cobourg|filet de saxe|mortadel|boudin|spek/;
const FRUIT = /banane|banaan|\bpommes?\b(?! de terre)|appel|orange|sinaas|citron|poire|peer|fraise|aardbei|raisin|druif|kiwi|mangue|mango|ananas|melon|myrtille|framboise|cerise|kers|peche|abricot|prune|clementine|mandarine|pamplemousse|grenade|fruit/;
const SWEET = /biscuit|koek|cookie|gaufre|wafel|chocola|choco|bonbon|snoep|gateau|cake|taart|speculoos|madeleine|confiture|confituur|tartiner|nutella|haribo|\bglace|\bijs\b|dessert|pudding|praline|caramel|sucre|suiker|miel|honing|muffin|brownie|tiramisu|mousse/;
const SALTY = /chips|cracker|apero|cacahuete|pinda|noix|noten|nootjes|pistache|amande|popcorn|bretzel|toastjes/;

/** Famille de dépense d'un article (nom + rayon). */
export function spendGroup(name, cat) {
  const t = norm(name);
  if (cat === 8) return 'menage';
  if (cat === 7) return 'hygiene';
  if (cat === 9) return 'bebe';
  if (cat === 6) return halalKind(name, 6) === 'alcohol' ? 'alcool' : 'boissons';
  if (cat === 5) return 'surgeles';
  if (cat === 3) return FISH.test(t) ? 'poisson' : CHARCU.test(t) ? 'charcuterie' : 'viande';
  if (/\b(oeufs?|eieren)\b/.test(t)) return 'oeufs';
  if (cat === 0) return FRUIT.test(t) ? 'fruits' : 'legumes';
  if (cat === 2) return /fromage|kaas|gouda|emmental|mozzarella|parmesan|feta|brie|camembert|reblochon|cheddar|chevre|raclette/.test(t) ? 'fromage' : SWEET.test(t) ? 'sucre' : 'laitiers';
  if (SWEET.test(t)) return 'sucre';
  if (cat === 1) return 'pain';
  if (SALTY.test(t)) return 'snacks';
  if (cat === 4) return 'epicerie';
  return 'autre';
}

/**
 * Totaux d'une série de reçus : par famille et par Nutri-Score (en euros).
 * → { groups: [{ key, label, v }] (du plus gros au plus petit), nutri: { A…E, '?' }, total }
 */
export function summarize(receipts) {
  const g = {};
  const nutri = { A: 0, B: 0, C: 0, D: 0, E: 0, '?': 0 };
  let total = 0;
  for (const r of receipts) {
    for (const l of [...(r.lines ?? []), ...(r.butcher ?? [])]) {
      const v = Number(l.t) || 0;
      if (v <= 0) continue;
      const key = l.g ?? spendGroup(l.n, l.cat);
      g[key] = (g[key] ?? 0) + v;
      nutri[/^[A-E]$/.test(l.ns ?? '') ? l.ns : '?'] += v;
      total += v;
    }
  }
  const round = (x) => Math.round(x * 100) / 100;
  return {
    groups: Object.entries(g).map(([key, v]) => ({ key, label: GROUPS[key] ?? key, v: round(v) })).sort((a, b) => b.v - a.v),
    nutri: Object.fromEntries(Object.entries(nutri).map(([k, v]) => [k, round(v)])),
    total: round(total),
  };
}

const eur = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace('.', ',')} €`;
const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

/** Reçu → Markdown lisible (et collable dans une conversation pour vérifier un problème). */
export function receiptMarkdown(r, chainName = (c) => c) {
  const out = [`# Courses du ${r.date}${r.label ? ` — ${cell(r.label)}` : ''}`, ''];
  out.push(`- Total estimé par l'app : ${eur(r.total)}`);
  if (r.paid != null) out.push(`- Payé : ${eur(r.paid)}`);
  if (r.fees) out.push(`- Frais (retrait, livraison) : ${eur(r.fees)}`);
  const byStore = new Map();
  for (const l of r.lines ?? []) {
    const k = l.s ?? chainName(l.c) ?? '';
    if (!byStore.has(k)) byStore.set(k, []);
    byStore.get(k).push(l);
  }
  for (const [store, lines] of byStore) {
    out.push('', `## ${cell(store) || 'Magasin'}`, '', '| Produit demandé | Article acheté | Qté | Prix | Type de prix | Famille | Nutri-Score |', '|---|---|---|---|---|---|---|');
    for (const l of lines) {
      const kind = l.k === 'estimate' ? 'estimé' : l.k === 'promo' ? 'promo' : l.k === 'user' ? 'saisi' : 'réel';
      out.push(`| ${cell(l.n)} | ${cell(l.a) || '—'} | ${l.q ?? 1} | ${eur(l.t)} | ${kind}${l.d ? ` (${cell(l.d)})` : ''} | ${GROUPS[l.g] ?? ''} | ${l.ns ?? '—'} |`);
    }
    out.push('', `Sous-total : ${eur(lines.reduce((t, l) => t + (Number(l.t) || 0), 0))}`);
  }
  if (r.butcher?.length) {
    out.push('', '## Boucher halal (prix estimés)', '', '| Viande | Qté | Prix estimé |', '|---|---|---|');
    for (const l of r.butcher) out.push(`| ${cell(l.n)} | ${l.q ?? 1} | ${eur(l.t)} |`);
  }
  out.push('', '_Exporté depuis Grocery Opti. « estimé » = l\'app n\'avait pas le vrai prix de cet article dans ce magasin._', '');
  return out.join('\n');
}
