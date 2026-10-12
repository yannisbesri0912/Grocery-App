// Promotions de la semaine via l'API publique PrijsProfeet (gratuite, sans clé).
// https://github.com/PrijsProfeet/supermarkt-api — attribution obligatoire dans l'app.
const BASE = 'https://www.prijsprofeet.be/api/v1';
const UA = 'GroceryOpti/1.0 (+https://github.com/yannisbesri0912/Grocery-App)';

// Clé PrijsProfeet → enseigne de l'app
export const RETAILERS = { colruyt: 'colruyt', delhaize: 'delhaize', aldi_be: 'aldi', lidl_be: 'lidl' };
const UNIT = { kg: 'kg', l: 'l', stuk: 'pc' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, params) {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const headers = { 'User-Agent': UA, Accept: 'application/json' };
    if (process.env.PRIJSPROFEET_KEY) headers['X-API-Key'] = process.env.PRIJSPROFEET_KEY;
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      await sleep((Number(res.headers.get('retry-after')) || 20) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`);
    return res.json();
  }
  throw new Error(`${path} : trop de requêtes`);
}

export function toCandidate(p) {
  return {
    name: `${p.brand && !norm(p.name).includes(norm(p.brand)) ? `${p.brand} ` : ''}${p.name} ${p.quantity ?? ''}`.trim(),
    price: p.price,
    perUnit: UNIT[norm(p.unit)] && p.unit_price > 0 ? { unit: UNIT[norm(p.unit)], price: p.unit_price } : undefined,
    promo: true,
    promoText: p.promotion_type || (p.original_price ? `au lieu de ${p.original_price} €` : 'promo'),
    until: p.valid_until ?? null,
    url: p.product_url ?? null,
  };
}
const norm = (s) => String(s ?? '').toLowerCase();

/** { aldi: [candidats], delhaize: [...], ... } — uniquement les promos en cours aujourd'hui. */
export async function fetchPromotions(today = new Date().toISOString().slice(0, 10)) {
  const out = {};
  for (const [key, chain] of Object.entries(RETAILERS)) {
    const rows = [];
    for (let page = 1; page <= 40; page++) {
      const data = await get('/products/promotional/all', { retailer: key, page, page_size: 100 });
      rows.push(...(data.products ?? []));
      if (!data.products?.length || rows.length >= (data.total ?? 0)) break;
      await sleep(2200); // 30 requêtes/min sans clé
    }
    out[chain] = rows
      .filter((p) => (p.promotion_status ?? 'active') === 'active')
      .filter((p) => !p.valid_from || p.valid_from <= today)
      .filter((p) => !p.valid_until || p.valid_until >= today)
      .filter((p) => !p.loyalty_price || p.price) // le prix carte de fidélité n'est jamais dans `price`
      .map(toCandidate);
    console.log(`  PrijsProfeet ${key} : ${rows.length} promos, ${out[chain].length} en cours`);
  }
  return out;
}
