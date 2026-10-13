// Catalogues complets Delhaize et Aldi, lus comme le fait leur site :
//  - Delhaize : API de recherche par rayon (19 rayons, pages de 50) ;
//  - Aldi : index de recherche Algolia en français (toute la gamme).
// Chaque article donne un candidat pour le rapprochement (prix réels des
// produits de l'app) et une ligne du catalogue cherchable dans l'app.
import { openBrowser, acceptCookies, sleep } from './browser.mjs';
import { parseSizes } from '../src/matcher.js';
import { RULES } from '../src/match-rules.js';

const r2 = (x) => Math.round(x * 100) / 100;
const num = (s) => { const m = String(s ?? '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(',', '.')) : null; };

// Rayons Delhaize → rayons de l'app (indices de CATEGORIES).
const DELHAIZE_CATS = {
  v2FRU: 0, v2BAK: 1, v2DAI: 2, v2MEA: 3, v2CON: 3, v2APE: 4, v2SWE: 4, v2SAL: 4, v2SPE: 4,
  v2FRO: 5, v2DRI: 6, v2ALC: 6, v2WIN: 6, v2HYG: 7, v2SPO: 7, v2CLE: 8, v2BAB: 9, v2PET: 9,
};
const UNIT_OF = { kilogram: 'kg', kg: 'kg', liter: 'l', litre: 'l', l: 'l', pieces: 'pc', piece: 'pc', pc: 'pc' };

// Relevé des formes de promo rencontrées (diagnostic : node prices/catalogs.mjs delhaize).
export const PROMO_SEEN = new Map();
function seePromo(p, row) {
  const pr = p.price ?? {};
  const promos = p.potentialPromotions ?? [];
  const key = promos.length
    ? promos.map((x) => [x.promotionTypeCode, x.redemptionLevel, x.qualifyingCount, x.freeCount, x.percentageDiscount, x.range, x.pickAndMix].join('|')).join(' + ')
    : pr.discountedPriceFormatted ? `(sans promo, prix réduit ${pr.wasPrice ? 'avec wasPrice' : ''} ${pr.showStrikethroughPrice ? 'barré' : ''})` : null;
  if (!key) return;
  const e = PROMO_SEEN.get(key) ?? { n: 0, ex: [] };
  e.n++;
  if (e.ex.length < 4) e.ex.push({ name: row.name, price: pr.value, discounted: pr.discountedPriceFormatted, was: pr.wasPrice, strike: pr.showStrikethroughPrice, promos: promos.map((x) => ({ title: x.title, msg: x.simplePromotionMessage, desc: x.description, type: x.promotionType, q: x.qualifyingCount, free: x.freeCount, pct: x.percentageDiscount, lvl: x.redemptionLevel, end: x.endDate, burn: x.priceToBurn, offerType: x.offerType, badge: x.alternativePromotionBadge })) });
  PROMO_SEEN.set(key, e);
}

function delhaizeRow(p) {
  const pr = p.price ?? {};
  const price = pr.value ?? num(pr.formattedValue);
  if (!(price > 0) || p.available === false) return null;
  // Prix normal : les réductions Delhaize sont souvent conditionnelles (carte,
  // 2e à moitié prix…) et feraient sous-estimer le panier. La promo est signalée.
  const promo = num(pr.discountedPriceFormatted);
  // « Raisins | Blanc | Sans pépins » → « DELHAIZE Raisins, blanc, sans pépins »
  // (marque en capitales comme chez Colruyt : la recherche la reconnaît).
  const brand = (p.manufacturerName && !/^delhaize$/i.test(p.manufacturerName) ? p.manufacturerName : 'Delhaize').toUpperCase();
  const parts = p.name.split(/\s*\|\s*/).map((x, i) => (i && x !== x.toUpperCase() ? x[0].toLowerCase() + x.slice(1) : x));
  const name = `${brand} ${parts.join(', ')}`.replace(/\s+/g, ' ').trim();
  const content = pr.supplementaryPriceLabel2 ?? '';
  // Prix au kilo / au litre : donné pour les articles pesés, sinon calculé d'après le format.
  let unit = UNIT_OF[pr.unitCode] ?? UNIT_OF[pr.unit] ?? '';
  let unitPrice = unit === 'kg' && pr.unitPrice > 0 ? r2(pr.unitPrice) : 0;
  const size = parseSizes(content)[0];
  if (!unitPrice && size?.amount > 0) { unit = size.unit; unitPrice = r2(price / size.amount); }
  return {
    id: p.code,
    name,
    content,
    price: r2(price),
    regular: null,
    promo: promo && promo < price ? r2(promo) : null,
    unitPrice,
    unit,
    cat: DELHAIZE_CATS[p.firstLevelCategory?.code] ?? 4,
    frozen: Boolean(p.frozen) || p.firstLevelCategory?.code === 'v2FRO',
    url: p.url ? `https://www.delhaize.be${p.url.replace('/nl/shop/', '/fr/shop/')}` : '',
    nutri: /^[A-E]$/.test(p.nutriScoreLetter ?? '') ? p.nutriScoreLetter : '',
    kind: ['v2PET', 'v2BAB'].includes(p.firstLevelCategory?.code) ? (p.firstLevelCategory.code === 'v2PET' ? 'pet' : 'baby') : undefined,
  };
}
function delhaizeRowSeen(p) {
  const row = delhaizeRow(p);
  if (row) seePromo(p, row);
  return row;
}

export async function fetchDelhaizeCatalog({ log = console.log, maxPages = 400 } = {}) {
  const { browser, context } = await openBrowser();
  const rows = new Map();
  try {
    const page = await context.newPage();
    let catUrl = null;
    let searchUrl = null;
    const codes = new Set(Object.keys(DELHAIZE_CATS));
    page.on('request', (r) => {
      if (/operationName=GetCategoryProductSearch/.test(r.url())) catUrl ??= r.url();
      if (/operationName=GetProductSearch/.test(r.url())) searchUrl ??= r.url();
    });
    // Tous les rayons cités par le site (menu, en-tête) : certains, comme les
    // conserves, n'apparaissent pas dans la liste de départ.
    page.on('response', async (r) => {
      if (!/\/api\/v1\//.test(r.url())) return;
      const t = await r.text().catch(() => '');
      for (const m of t.matchAll(/["/=](v2[A-Z]{3})\b/g)) codes.add(m[1]);
    });
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
    for (const code of await page.evaluate(() => [...document.querySelectorAll('a[href*="/c/v2"]')].map((a) => a.getAttribute('href').match(/\/c\/(v2[A-Z]{3})/)?.[1]))) if (code) codes.add(code);
    log(`  Delhaize : ${codes.size} rayons (${[...codes].join(' ')})`);
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
    for (const cat of codes) {
      let total = 1;
      for (let n = 0; n < total && pages < maxPages; n++) {
        let r = await call({ category: cat, pageNumber: n, pageSize: 50, lang: 'fr' });
        if (r.error) { await sleep(3000); r = await call({ category: cat, pageNumber: n, pageSize: 50, lang: 'fr' }); }
        if (r.error) { log(`  Delhaize ${cat} page ${n} : HTTP ${r.error}`); break; }
        total = r.totalPages;
        pages++;
        if (pages === 1) log(`  exemple : ${r.products.slice(0, 3).map((p) => p.name).join(' | ')}`);
        for (const p of r.products) { const row = delhaizeRowSeen(p); if (row) rows.set(row.id, row); }
        await sleep(250 + Math.random() * 250);
      }
      log(`  Delhaize ${cat} : ${total} pages, ${rows.size} articles au total`);
    }
    // Filet de sécurité : une recherche par produit suivi par l'app (50 premiers résultats).
    await page.goto('https://www.delhaize.be/fr/shop/search?text=lait', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForResponse((r) => /GetProductSearch/.test(r.url()), { timeout: 15000 }).catch(() => {});
    if (searchUrl) {
      const before = rows.size;
      const vars = JSON.parse(new URL(searchUrl).searchParams.get('variables'));
      const textKey = Object.keys(vars).find((k) => vars[k] === 'lait');
      for (const q of new Set(Object.values(RULES).map((r) => r.q).filter(Boolean))) {
        const r = await page.evaluate(async ([url, v]) => {
          const x = new URL(url, location.origin);
          x.searchParams.set('variables', JSON.stringify({ ...JSON.parse(x.searchParams.get('variables')), ...v }));
          const res = await fetch(x, { headers: { 'content-type': 'application/json', 'apollo-require-preflight': 'true' } });
          return res.ok ? (await res.json()).data?.productSearch?.products ?? [] : [];
        }, [searchUrl, { [textKey ?? 'searchQuery']: q, pageNumber: 0, pageSize: 50, lang: 'fr' }]).catch(() => []);
        for (const p of r) { const row = delhaizeRowSeen(p); if (row && !rows.has(row.id)) rows.set(row.id, row); }
        await sleep(200 + Math.random() * 200);
      }
      log(`  Delhaize recherches : +${rows.size - before} articles (clé « ${textKey} »)`);
    } else log('  Delhaize : recherche introuvable, pas de filet de sécurité');
  } finally {
    await browser.close();
  }
  if (rows.size < 500) throw new Error(`Delhaize : seulement ${rows.size} articles lus`);
  return [...rows.values()];
}

// Rayons Aldi (identifiants Algolia) → rayons de l'app. Un article a plusieurs
// identifiants (rayon parent, sous-rayon, actions) : le premier groupe trouvé
// dans l'ordre ci-dessous l'emporte, sinon épicerie.
const ALDI_CATS = [
  [5, ['diepvries', 'diepvries-pizza-maaltijden-snacks', 'diepvries-vis', 'diepvries-groenten-fruit', 'diepvries-vlees', 'diepvries-gebak-koeken', 'ijs', 'ijs-zomer', 'frietjes-aardappelproducten']],
  [9, ['dierenvoeding', 'kat', 'hond', 'baby']],
  [7, ['lichaamsverzorging', 'haarproducten', 'tandverzorging', 'gezichtsverzorging', 'intieme-hygiene', 'make-up', 'verzorging-winter']],
  [8, ['huishouden', 'schoonmaakmiddelen-schoonmaakartikelen', 'wasmiddelen-wasverzachters', 'zakdoekjes-toiletpapier-keukenpapier', 'folie-huishoudzakken', 'afwassen-vaatwasmiddelen', 'batterijen-aanmaakblokjes', 'draagtassen-overige']],
  [6, ['water-frisdrank-sappen-siroop', 'wijn', 'bier-sterke-dranken', 'frisdrank', 'koffie-thee', 'koffie', 'bier', 'sterke-dranken', 'rode-wijn', 'witte-wijn', 'rose-wijn', 'sappen-smoothies', 'energy-drinks-sportdrank', 'water', 'bubbels', 'dranken-zomer', 'dranken-eoy', 'thee-cacao', 'wijn-eoy', 'fou-d-o']],
  [3, ['vlees', 'charcuterie', 'vis-zeevruchten', 'gevogelte', 'vis', 'varkensvlees', 'rundsvlees', 'zeevruchten', 'wild', 'mosselen', 'lamsvlees', 'barbecuevlees', 'vlees-eoy', 'vis-eoy']],
  [2, ['zuivel-eieren-boter', 'kaas', 'yoghurt', 'melk', 'boter-margarine-room', 'eieren', 'desserts', 'kaas-eoy']],
  [0, ['aardappelen-groenten-fruit', 'groenten', 'fruit', 'aardappelen', 'groente-fruit-eoy']],
  [1, ['brood-bakkerij-zelf-bakken', 'brood', 'broodjes-sandwiches-afbakbrood', 'koffiekoeken-gebak', 'beschuiten-toast-crackers']],
];
function aldiCat(ids = []) {
  return ALDI_CATS.find(([, list]) => ids.some((id) => list.includes(id)))?.[0] ?? 4;
}
const aldiKind = (ids = []) => (ids.some((id) => ['dierenvoeding', 'kat', 'hond'].includes(id)) ? 'pet' : ids.includes('baby') ? 'baby' : undefined);

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
    const query = (q) => page.evaluate(async ([u, body]) => {
      const res = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: JSON.stringify({ requests: [{ indexName: 'an_prd_be_fr_products2', query: '', ...body }] }) });
      return res.ok ? (await res.json()).results?.[0] : { error: res.status };
    }, [url, q]);
    // Une requête rend au plus 1000 articles : on lit rayon par rayon.
    const all = await query({ hitsPerPage: 1000, facets: ['categoryIDs'], maxValuesPerFacet: 1000 });
    if (!all || all.error) throw new Error(`Aldi : ${all?.error ?? 'réponse vide'}`);
    const facets = Object.entries(all.facets?.categoryIDs ?? {});
    log(`  Aldi : ${all.nbHits} articles, ${facets.length} rayons : ${facets.slice(0, 60).map(([c, n]) => `${c}=${n}`).join(' ')}`);
    const seen = new Set();
    const batches = [all];
    for (const [cat, n] of facets) {
      if (n > 1000) continue; // les sous-rayons couvrent ces articles
      const r = await query({ hitsPerPage: 1000, facetFilters: [[`categoryIDs:${cat}`]] });
      if (r && !r.error) batches.push(r);
      await sleep(150);
    }
    for (const r of batches) {
      for (const h of r.hits ?? []) {
        const key = String(h.objectID ?? h.productID ?? h.productSlug);
        if (seen.has(key)) continue;
        seen.add(key);
        const price = h.currentPrice?.priceValue;
        if (!(price > 0)) continue;
        const base = h.currentPrice?.basePrice?.[0];
        const unit = /kg/.test(base?.basePriceScale ?? '') ? 'kg' : /\bl\b|liter|litre/.test(base?.basePriceScale ?? '') ? 'l' : /st|pc|pi/.test(base?.basePriceScale ?? '') ? 'pc' : '';
        rows.push({
          id: key,
          name: `${h.brandName && !/aldi/i.test(h.brandName) ? `${h.brandName.replace(/®/g, '')} ` : ''}${h.name}`.trim(),
          content: h.salesUnit ?? '',
          price: r2(price),
          regular: null,
          unitPrice: base?.basePriceValue > 0 ? r2(base.basePriceValue) : 0,
          unit,
          cat: aldiCat(h.categoryIDs),
          frozen: /diepvries/.test((h.categoryIDs ?? []).join(' ')),
          kind: aldiKind(h.categoryIDs),
          url: h.productSlug ? `https://www.aldi.be/fr/produits/${h.productSlug}.html` : '',
          nutri: '',
          catIds: h.categoryIDs,
        });
      }
    }
    log(`  Aldi : ${rows.length} articles avec prix (sur ${all.nbHits})`);
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
  frozen: r.frozen,
  kind: r.kind,
  url: r.url,
  perUnit: r.unit && r.unitPrice ? { unit: r.unit, price: r.unitPrice } : undefined,
});

/** Article → ligne compacte du catalogue de l'app (même forme que Colruyt + lien et Nutri-Score). */
// Lien sans le domaine (l'app le rajoute) : fichier plus léger.
export const toRow = (r) => [r.id, r.name, r.content, r.price, r.unitPrice, r.unit, r.cat, r.promo ? 1 : 0, 0, '', r.url.replace(/^https:\/\/www\.[a-z]+\.be/, ''), r.nutri];

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
    if (chain === 'delhaize') writeFileSync('data-raw/delhaize-promos.json', JSON.stringify([...PROMO_SEEN].sort((a, b) => b[1].n - a[1].n), null, 1));
  }
}
