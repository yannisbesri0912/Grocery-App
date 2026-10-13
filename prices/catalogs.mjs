// Catalogues complets Delhaize et Aldi, lus comme le fait leur site :
//  - Delhaize : API de recherche par rayon (19 rayons, pages de 50) ;
//  - Aldi : index de recherche Algolia en français (toute la gamme).
// Chaque article donne un candidat pour le rapprochement (prix réels des
// produits de l'app) et une ligne du catalogue cherchable dans l'app.
import { openBrowser, acceptCookies, sleep } from './browser.mjs';

const r2 = (x) => Math.round(x * 100) / 100;
const num = (s) => { const m = String(s ?? '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(',', '.')) : null; };

// Rayons Delhaize → rayons de l'app (indices de CATEGORIES).
const DELHAIZE_CATS = {
  v2FRU: 0, v2BAK: 1, v2DAI: 2, v2MEA: 3, v2CON: 3, v2APE: 4, v2SWE: 4, v2SAL: 4, v2SPE: 4,
  v2FRO: 5, v2DRI: 6, v2ALC: 6, v2WIN: 6, v2HYG: 7, v2SPO: 7, v2CLE: 8, v2BAB: 9, v2PET: 9,
};
const UNIT_OF = { kilogram: 'kg', kg: 'kg', liter: 'l', litre: 'l', l: 'l', pieces: 'pc', piece: 'pc', pc: 'pc' };

function delhaizeRow(p) {
  const pr = p.price ?? {};
  const price = pr.value ?? num(pr.formattedValue);
  if (!(price > 0) || p.available === false) return null;
  const promo = num(pr.discountedPriceFormatted);
  const brand = p.manufacturerName && !/^delhaize$/i.test(p.manufacturerName) ? `${p.manufacturerName} ` : 'Delhaize ';
  const name = `${brand}${p.name}`.replace(/\s+/g, ' ').trim();
  const unit = UNIT_OF[pr.unitCode] ?? UNIT_OF[pr.unit] ?? '';
  return {
    id: p.code,
    name,
    content: pr.supplementaryPriceLabel2 ?? '',
    price: r2(promo && promo < price ? promo : price),
    regular: promo && promo < price ? r2(price) : null,
    unitPrice: pr.unitPrice > 0 ? r2(pr.unitPrice) : 0,
    unit,
    cat: DELHAIZE_CATS[p.firstLevelCategory?.code] ?? 4,
    frozen: Boolean(p.frozen) || p.firstLevelCategory?.code === 'v2FRO',
    url: p.url ? `https://www.delhaize.be${p.url.replace('/nl/shop/', '/fr/shop/')}` : '',
    nutri: /^[A-E]$/.test(p.nutriScoreLetter ?? '') ? p.nutriScoreLetter : '',
    kind: ['v2PET', 'v2BAB'].includes(p.firstLevelCategory?.code) ? (p.firstLevelCategory.code === 'v2PET' ? 'pet' : 'baby') : undefined,
  };
}

export async function fetchDelhaizeCatalog({ log = console.log, maxPages = 400 } = {}) {
  const { browser, context } = await openBrowser();
  const rows = new Map();
  try {
    const page = await context.newPage();
    let catUrl = null;
    page.on('request', (r) => { if (/operationName=GetCategoryProductSearch/.test(r.url())) catUrl ??= r.url(); });
    // Accueil d'abord (cookies), puis un rayon : sa page appelle la recherche par rayon.
    await page.goto('https://www.delhaize.be/fr/shop', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies(page);
    await sleep(3000);
    for (const path of ['/fr/c/v2FRU', '/c/v2FRU', '/c/v2WIN', '/nl/c/v2DAI']) {
      if (catUrl) break;
      await page.goto(`https://www.delhaize.be${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await page.waitForResponse((r) => /GetCategoryProductSearch/.test(r.url()), { timeout: 15000 }).catch(() => {});
      if (!catUrl) { await page.mouse.wheel(0, 3000); await sleep(3000); }
      log(`  Delhaize ${path} : ${catUrl ? 'requête trouvée' : 'rien'}`);
    }
    if (!catUrl) throw new Error('Delhaize : requête de rayon introuvable');
    const call = (vars) => page.evaluate(async ([url, v]) => {
      const x = new URL(url, location.origin);
      x.searchParams.set('variables', JSON.stringify({ ...JSON.parse(x.searchParams.get('variables')), ...v }));
      const res = await fetch(x, { headers: { 'content-type': 'application/json', 'apollo-require-preflight': 'true' } });
      if (!res.ok) return { error: res.status };
      const j = await res.json();
      const ps = j.data?.categoryProductSearch;
      return { products: ps?.products ?? [], totalPages: ps?.pagination?.totalPages ?? 0 };
    }, [catUrl, vars]);
    let pages = 0;
    for (const cat of Object.keys(DELHAIZE_CATS)) {
      let total = 1;
      for (let n = 0; n < total && pages < maxPages; n++) {
        let r = await call({ category: cat, pageNumber: n, pageSize: 50, lang: 'fr' });
        if (r.error) { await sleep(3000); r = await call({ category: cat, pageNumber: n, pageSize: 50, lang: 'fr' }); }
        if (r.error) { log(`  Delhaize ${cat} page ${n} : HTTP ${r.error}`); break; }
        total = r.totalPages;
        pages++;
        if (pages === 1) log(`  exemple : ${r.products.slice(0, 3).map((p) => p.name).join(' | ')}`);
        for (const p of r.products) { const row = delhaizeRow(p); if (row) rows.set(row.id, row); }
        await sleep(250 + Math.random() * 250);
      }
      log(`  Delhaize ${cat} : ${total} pages, ${rows.size} articles au total`);
    }
  } finally {
    await browser.close();
  }
  if (rows.size < 500) throw new Error(`Delhaize : seulement ${rows.size} articles lus`);
  return [...rows.values()];
}

// Rayons Aldi (identifiants Algolia) → rayons de l'app, par mots-clés.
function aldiCat(ids = []) {
  const s = ids.join(' ');
  if (/fruit|groente|legume|aardappel/.test(s)) return 0;
  if (/brood|bakker|boulang|pain/.test(s)) return 1;
  if (/zuivel|kaas|eieren|yoghurt|melk|cremerie|fromage/.test(s)) return 2;
  if (/vlees|vis|charcut|viande|poisson|vegetari/.test(s)) return 3;
  if (/diepvries|surgel|ijs/.test(s)) return 5;
  if (/drank|wijn|bier|water|sap|boisson|vin|biere/.test(s)) return 6;
  if (/verzorging|hygien|cosmet/.test(s)) return 7;
  if (/huishoud|onderhoud|was|entretien|menage/.test(s)) return 8;
  if (/baby|dier|animaux|kat|hond/.test(s)) return 9;
  return 4;
}

export async function fetchAldiCatalog({ log = console.log } = {}) {
  const { browser, context } = await openBrowser();
  const rows = [];
  try {
    const page = await context.newPage();
    let url = null;
    page.on('request', (r) => { if (/algolia\.net/.test(r.url()) && r.method() === 'POST') url ??= r.url(); });
    await page.goto('https://www.aldi.be/zoekresultaten.html?query=melk', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies(page);
    for (let i = 0; i < 20 && !url; i++) await sleep(500);
    if (!url) throw new Error('Aldi : recherche Algolia introuvable');
    for (let pg = 0; pg < 10; pg++) {
      const r = await page.evaluate(async ([u, p]) => {
        const res = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: JSON.stringify({ requests: [{ indexName: 'an_prd_be_fr_products2', query: '', hitsPerPage: 1000, page: p }] }) });
        return res.ok ? (await res.json()).results?.[0] : { error: res.status };
      }, [url, pg]);
      if (!r || r.error) { log(`  Aldi page ${pg} : ${r?.error ?? 'vide'}`); break; }
      for (const h of r.hits ?? []) {
        const price = h.currentPrice?.priceValue;
        if (!(price > 0)) continue;
        const base = h.currentPrice?.basePrice?.[0];
        const unit = /kg/.test(base?.basePriceScale ?? '') ? 'kg' : /\bl\b|liter|litre/.test(base?.basePriceScale ?? '') ? 'l' : /st|pc|pi/.test(base?.basePriceScale ?? '') ? 'pc' : '';
        rows.push({
          id: String(h.objectID ?? h.productID ?? h.productSlug),
          name: `${h.brandName && !/aldi/i.test(h.brandName) ? `${h.brandName.replace(/®/g, '')} ` : ''}${h.name}`.trim(),
          content: h.salesUnit ?? '',
          price: r2(price),
          regular: null,
          unitPrice: base?.basePriceValue > 0 ? r2(base.basePriceValue) : 0,
          unit,
          cat: aldiCat(h.categoryIDs),
          frozen: /diepvries|surgel/.test((h.categoryIDs ?? []).join(' ')),
          url: h.productSlug ? `https://www.aldi.be/fr/produits/${h.productSlug}.html` : '',
          nutri: '',
        });
      }
      log(`  Aldi page ${pg} : ${rows.length} articles (sur ${r.nbHits})`);
      if ((pg + 1) * 1000 >= r.nbHits) break;
      await sleep(500);
    }
  } finally {
    await browser.close();
  }
  if (rows.length < 300) throw new Error(`Aldi : seulement ${rows.length} articles lus`);
  return rows;
}

/** Article de catalogue → candidat pour le rapprochement (src/matcher.js). */
export const toCandidate = (r) => ({
  name: r.content && !r.name.includes(r.content) ? `${r.name} ${r.content}` : r.name,
  price: r.price,
  promo: Boolean(r.regular),
  frozen: r.frozen,
  kind: r.kind,
  url: r.url,
  perUnit: r.unit && r.unitPrice ? { unit: r.unit, price: r.unitPrice } : undefined,
});

/** Article → ligne compacte du catalogue de l'app (même forme que Colruyt + lien et Nutri-Score). */
export const toRow = (r) => [r.id, r.name, r.content, r.price, r.unitPrice, r.unit, r.cat, r.regular ? 1 : 0, 0, '', r.url, r.nutri];

// Lancement direct : node prices/catalogs.mjs [delhaize|aldi] → résumé.
if (process.argv[1]?.endsWith('catalogs.mjs')) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  mkdirSync('data-raw', { recursive: true });
  for (const chain of process.argv.slice(2)) {
    const t = Date.now();
    const rows = await (chain === 'delhaize' ? fetchDelhaizeCatalog() : fetchAldiCatalog()).catch((e) => { console.log(`${chain} : ${e.message}`); return null; });
    if (!rows) continue;
    console.log(`${chain} : ${rows.length} articles en ${Math.round((Date.now() - t) / 1000)} s`);
    console.log(rows.slice(0, 5));
    writeFileSync(`data-raw/catalog-${chain}.json`, JSON.stringify(rows));
  }
}
