// Colruyt : catalogue complet publié chaque jour par le projet open source
// BelgianNoise/colruyt-products-scraper (bucket public Google Cloud Storage).
// Aucun accès au site de Colruyt : pas de risque de blocage.
const BUCKET = 'https://storage.googleapis.com/storage/v1/b/colruyt-products/o';
const FILES = 'https://storage.googleapis.com/colruyt-products/';

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

export async function fetchColruyt() {
  const name = await latestDumpName();
  const res = await fetch(FILES + name);
  if (!res.ok) throw new Error(`Téléchargement ${name} : HTTP ${res.status}`);
  const products = await res.json();
  const date = name.match(/(\d{4}-\d{2}-\d{2})/)[1];
  const candidates = products
    .filter((p) => p.isAvailable !== false && p.isPriceAvailable !== false && p.businessDomain !== 'RETAIL_LU')
    .map(toCandidate);
  return { date, candidates, note: `catalogue ${name}` };
}
