// Test n°2 : Delhaize (taille de page acceptée, liste des catégories) et
// index Algolia Aldi en français.
import { writeFileSync, mkdirSync } from 'node:fs';
import { openBrowser, acceptCookies, sleep } from './browser.mjs';

mkdirSync('data-raw', { recursive: true });
const out = { delhaize: {}, aldi: {} };
const { browser, context } = await openBrowser();
{
  const page = await context.newPage();
  let catUrl = null;
  const ops = new Set();
  page.on('request', (r) => {
    const op = r.url().match(/operationName=(\w+)/)?.[1];
    if (op) ops.add(op);
    if (op === 'GetCategoryProductSearch') catUrl ??= r.url();
  });
  await page.goto('https://www.delhaize.be/fr/shop', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await acceptCookies(page);
  await sleep(4000);
  // Ouvrir le menu des rayons si besoin.
  for (const sel of ['button:has-text("Rayons")', 'button:has-text("Produits")', '[data-testid*="category" i] button', 'a:has-text("Tous les rayons")']) {
    const b = page.locator(sel).first();
    if (await b.isVisible({ timeout: 500 }).catch(() => false)) { await b.click().catch(() => {}); await sleep(1500); }
  }
  const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/c/"]')].map((a) => `${a.getAttribute('href')}|${a.textContent.trim().slice(0, 40)}`))]);
  out.delhaize.links = links;
  out.delhaize.ops = [...ops];
  console.log('liens /c/ :', links.length, links.slice(0, 40));
  console.log('opérations :', [...ops]);
  const first = links.map((l) => l.split('|')[0]).find((h) => /\/c\/v2/.test(h)) ?? '/fr/c/v2WIN';
  await page.goto(new URL(first, 'https://www.delhaize.be').toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForResponse((r) => /GetCategoryProductSearch/.test(r.url()), { timeout: 15000 }).catch(() => {});
  await sleep(2000);
  const call = (vars) => page.evaluate(async ([url, v]) => {
    const x = new URL(url, location.origin);
    x.searchParams.set('variables', JSON.stringify({ ...JSON.parse(x.searchParams.get('variables')), ...v }));
    const res = await fetch(x, { headers: { 'content-type': 'application/json', 'apollo-require-preflight': 'true' } });
    const t = await res.text();
    let n = null, pag = null, codes = null;
    try { const j = JSON.parse(t); const ps = j.data?.categoryProductSearch ?? j.data?.productSearch; n = ps?.products?.length ?? null; pag = ps?.pagination ?? null; codes = JSON.stringify(ps?.facets ?? ps?.categoryBreadcrumbs ?? ps?.subCategories ?? null)?.slice(0, 1500); } catch { /* ignore */ }
    return { status: res.status, n, pag, codes, head: t.slice(0, 400), keys: (() => { try { return Object.keys(JSON.parse(t).data?.categoryProductSearch ?? {}); } catch { return []; } })() };
  }, [catUrl, vars]);
  if (catUrl) {
    for (const v of [{}, { pageSize: 20, pageNumber: 1 }, { pageSize: 48 }, { pageSize: 50 }, { pageSize: 40 }, { pageSize: 30 }]) {
      const r = await call(v);
      console.log('catégorie', JSON.stringify(v), r.status, r.n, JSON.stringify(r.pag), r.n ? '' : r.head.slice(0, 200));
      (out.delhaize.tries ??= []).push({ v, ...r });
    }
    const r0 = out.delhaize.tries[0];
    console.log('clés :', r0.keys, '\nfacettes :', r0.codes?.slice(0, 1200));
  }
  out.delhaize.catUrl = catUrl;
  await page.close();
}
{
  const page = await context.newPage();
  let req = null;
  page.on('request', (r) => { if (/algolia/.test(r.url()) && r.method() === 'POST') req ??= { url: r.url(), headers: r.headers() }; });
  await page.goto('https://www.aldi.be/fr/resultats-de-recherche.html?query=lait', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await acceptCookies(page);
  await sleep(6000);
  if (!req) { await page.goto('https://www.aldi.be/zoekresultaten.html?query=melk', { waitUntil: 'domcontentloaded' }); await sleep(6000); }
  console.log('Aldi page :', page.url(), req?.url?.slice(0, 120));
  for (const index of ['an_prd_be_fr_products2', 'an_prd_be_nl_products2']) {
    const r = await page.evaluate(async ({ url, index }) => {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: JSON.stringify({ requests: [{ indexName: index, query: '', hitsPerPage: 5, page: 0 }] }) });
      const t = await res.text();
      try { const r0 = JSON.parse(t).results?.[0]; return { status: res.status, nb: r0?.nbHits, names: r0?.hits?.map((h) => `${h.name} ${h.salesUnit} ${h.currentPrice?.priceValue}`) }; } catch { return { status: res.status, head: t.slice(0, 300) }; }
    }, { url: req.url, index });
    console.log('index', index, JSON.stringify(r));
    out.aldi[index] = r;
  }
}
writeFileSync('data-raw/probe-catalog2.json', JSON.stringify(out, null, 1));
await browser.close();
