// Test : lire les catalogues complets (Delhaize : API de recherche par pages ;
// Aldi : Algolia). Résultats dans data-raw/probe-catalog.json.
import { writeFileSync, mkdirSync } from 'node:fs';
import { openBrowser, acceptCookies, sleep } from './browser.mjs';

mkdirSync('data-raw', { recursive: true });
const out = { delhaize: {}, aldi: {} };
const { browser, context } = await openBrowser();

// ---------- Delhaize ----------
{
  const page = await context.newPage();
  let searchUrl = null;
  let catUrl = null;
  page.on('request', (r) => {
    if (/operationName=GetProductSearch/.test(r.url())) searchUrl ??= r.url();
    if (/operationName=GetCategoryProductSearch/.test(r.url())) catUrl ??= r.url();
  });
  await page.goto('https://www.delhaize.be/fr/shop/search?text=lait', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await acceptCookies(page);
  await page.waitForResponse((r) => /GetProductSearch/.test(r.url()), { timeout: 15000 }).catch(() => {});
  await sleep(2000);
  const cats = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/c/"]')].map((a) => a.getAttribute('href')))].slice(0, 80));
  out.delhaize.categoryLinks = cats;
  console.log('catégories :', cats.length, cats.slice(0, 15));
  const call = (u, vars) => page.evaluate(async ([url, v]) => {
    const x = new URL(url, location.origin);
    x.searchParams.set('variables', JSON.stringify({ ...JSON.parse(x.searchParams.get('variables')), ...v }));
    const res = await fetch(x, { headers: { 'content-type': 'application/json', 'apollo-require-preflight': 'true', 'x-apollo-operation-name': x.searchParams.get('operationName') } });
    const t = await res.text();
    let n = null, total = null;
    try { const j = JSON.parse(t); const ps = j.data?.productSearch ?? j.data?.categoryProductSearch; n = ps?.products?.length ?? null; total = ps?.pagination ?? null; } catch { /* ignore */ }
    return { status: res.status, len: t.length, n, total, head: t.slice(0, 300) };
  }, [u, vars]);
  for (const v of [{ pageSize: 100 }, { pageSize: 500 }, { searchQuery: '', pageSize: 100 }, { searchQuery: '*', pageSize: 100 }, { pageSize: 100, pageNumber: 3 }]) {
    const r = await call(searchUrl, v);
    console.log('recherche', JSON.stringify(v), r.status, r.len, r.n, JSON.stringify(r.total), r.n ? '' : r.head);
    (out.delhaize.search ??= []).push({ v, ...r });
  }
  // Une page de catégorie pour capter sa requête.
  const first = cats.find((c) => /\/c\//.test(c));
  if (first) {
    await page.goto(new URL(first, 'https://www.delhaize.be').toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForResponse((r) => /GetCategoryProductSearch/.test(r.url()), { timeout: 15000 }).catch(() => {});
    await sleep(2000);
    out.delhaize.categoryUrl = catUrl;
    console.log('requête catégorie :', catUrl?.slice(0, 400));
    if (catUrl) for (const v of [{ pageSize: 100 }, { pageSize: 500 }]) {
      const r = await call(catUrl, v);
      console.log('catégorie', JSON.stringify(v), r.status, r.len, r.n, JSON.stringify(r.total), r.n ? '' : r.head);
      (out.delhaize.category ??= []).push({ v, ...r });
    }
  }
  out.delhaize.searchUrl = searchUrl;
  await page.close();
}

// ---------- Aldi (Algolia) ----------
{
  const page = await context.newPage();
  const algolia = [];
  page.on('request', (r) => { if (/algolia/.test(r.url())) algolia.push({ url: r.url(), method: r.method(), headers: r.headers(), body: r.postData()?.slice(0, 1500) }); });
  await page.goto('https://www.aldi.be/zoekresultaten.html?query=melk', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await acceptCookies(page);
  await sleep(6000);
  out.aldi.requests = algolia.slice(0, 5);
  console.log('Aldi Algolia :', algolia.length, algolia[0]?.url, algolia[0]?.body?.slice(0, 300));
  if (algolia[0]) {
    const a = algolia[0];
    const r = await page.evaluate(async ({ url, headers, body }) => {
      // Requête vide, beaucoup de résultats : catalogue complet ?
      let b = body;
      try {
        const j = JSON.parse(body);
        const reqs = j.requests ?? [j];
        for (const q of reqs) { if (q.params) q.params = q.params.replace(/query=[^&]*/, 'query=').replace(/hitsPerPage=\d+/, 'hitsPerPage=1000'); else { q.query = ''; q.hitsPerPage = 1000; } }
        b = JSON.stringify(j);
      } catch { /* ignore */ }
      const h = Object.fromEntries(Object.entries(headers).filter(([k]) => /algolia|content-type/i.test(k)));
      const res = await fetch(url, { method: 'POST', headers: h, body: b });
      const t = await res.text();
      let hits = null, nb = null;
      try { const j = JSON.parse(t); const r0 = j.results?.[0] ?? j; hits = r0.hits?.length; nb = r0.nbHits; } catch { /* ignore */ }
      return { status: res.status, len: t.length, hits, nb, sample: t.slice(0, 1500) };
    }, a);
    console.log('Aldi requête vide :', r.status, r.len, 'hits', r.hits, 'total', r.nb);
    out.aldi.replay = r;
  }
}
writeFileSync('data-raw/probe-catalog.json', JSON.stringify(out, null, 1));
await browser.close();
