// Colruyt : catalogue complet publié chaque jour par le projet open source
// BelgianNoise/colruyt-products-scraper (bucket public Google Cloud Storage).
// Aucun accès au site de Colruyt : pas de risque de blocage.
const BUCKET = 'https://storage.googleapis.com/storage/v1/b/colruyt-products/o';
const FILES = 'https://storage.googleapis.com/colruyt-products/';

import { CAT_MAP } from '../src/catalog.js';
import { toFrench } from '../src/translate.js';
import { dealFromColruyt } from '../src/deals.js';

const UNIT = { K: 'kg', L: 'l', S: 'pc' };

export async function latestDumpName(now = new Date()) {
  // Les fichiers s'appellent colruyt-products/AAAA-MM-JJ-hh-mm-ss.json
  for (let back = 0; back < 3; back++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const prefix = `colruyt-products/${d.toISOString().slice(0, 7)}`;
    const res = await fetch(`${BUCKET}?prefix=${encodeURIComponent(prefix)}&fields=items(name)`);
    if (!res.ok) throw new Error(`Liste du bucket : HTTP ${res.status}`);
    const names = ((await res.json()).items ?? []).map((i) => i.name).sort();
    if (names.length) return names.at(-1);
  }
  throw new Error('Aucun fichier Colruyt trouvé sur les 3 derniers mois');
}

/** Convertit un produit Colruyt en candidat pour le matcher. */
export function toCandidate(p) {
  const pr = p.price ?? {};
  const c = {
    name: (p.LongName || p.name || '').includes(p.content ?? '') ? (p.LongName || p.name) : `${p.LongName || p.name} ${p.content}`,
    price: pr.basicPrice,
    promo: Boolean(p.inPromo),
    deal: dealFromColruyt(p) ?? undefined,
    walk: p.walkRouteSequenceNumber || undefined,
    id: p.productId,
    frozen: p.topCategoryName === 'Diepvries',
    kind: p.topCategoryName === 'Huisdieren' ? 'pet' : p.topCategoryName === 'Baby' ? 'baby' : undefined,
    // Pour la lessive, le « prix par pièce » de Colruyt est un prix par lavage.
    perUnit: UNIT[pr.measurementUnit] ? { unit: UNIT[pr.measurementUnit], price: pr.measurementUnitPrice, perDose: pr.measurementUnit === 'S' } : undefined,
  };
  // Articles au poids sans contenance (fruits, légumes, viande à la coupe) :
  // le prix affiché est le prix au kilo.
  // Pour ces articles (IsWeightArticle), basicPrice est déjà un prix au kilo.
  if ((p.IsWeightArticle || !/\d/.test(p.content ?? '')) && UNIT[pr.measurementUnit] && pr.measurementUnitPrice > 0) {
    c.size = { amount: 1, unit: UNIT[pr.measurementUnit] };
    c.price = pr.measurementUnitPrice;
  }
  return c;
}

/**
 * Catalogue complet pour la recherche dans l'app : une ligne compacte par
 * article en vente en Belgique (voir ROW dans src/catalog.js).
 */
export function catalogRows(products) {
  const r2 = (x) => Math.round(x * 100) / 100;
  return products
    .filter((p) => p.businessDomain === 'RETAIL_BE' && p.isAvailable !== false && p.isPriceAvailable !== false && p.price?.basicPrice > 0)
    .map((p) => {
      const pr = p.price;
      const name = (p.LongName || p.name || '').trim();
      const fr = toFrench(name); // nom français affiché dans l'app
      return [
        p.productId, name, name.includes(p.content ?? '') ? '' : (p.content ?? ''), r2(pr.basicPrice),
        pr.measurementUnitPrice > 0 ? r2(pr.measurementUnitPrice) : 0, UNIT[pr.measurementUnit] ?? '',
        CAT_MAP[p.topCategoryName] ?? 4, p.inPromo ? 1 : 0, p.IsWeightArticle ? 1 : 0, fr === name ? '' : fr,
        '', '', dealFromColruyt(p) ?? 0, p.walkRouteSequenceNumber ?? 0,
      ];
    })
    .sort((a, b) => (a[9] || a[1]).localeCompare(b[9] || b[1], 'fr'));
}

export async function fetchColruyt() {
  const name = await latestDumpName();
  const res = await fetch(FILES + name);
  if (!res.ok) throw new Error(`Téléchargement ${name} : HTTP ${res.status}`);
  const products = await res.json();
  const date = name.match(/(\d{4}-\d{2}-\d{2})/)[1];
  const candidates = products
    .filter((p) => p.isAvailable !== false && p.isPriceAvailable !== false && p.businessDomain !== 'RETAIL_LU')
    .map(toCandidate);
  return { date, candidates, note: `catalogue ${name}`, catalog: catalogRows(products) };
}
