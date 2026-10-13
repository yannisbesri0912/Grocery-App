// Relevé brut (diagnostic) : ce que Delhaize renvoie pour chaque recherche,
// et si l'API de recherche accepte de plus grandes pages (catalogue complet).
import { mkdirSync, writeFileSync } from 'node:fs';
import { RULES } from '../src/match-rules.js';
import { openBrowser, acceptCookies, productsFromJson, sleep } from './browser.mjs';

const OUT = 'data-raw';
mkdirSync(OUT, { recursive: true });
const { browser, context } = await openBrowser();
const page = await context.newPage();
const seen = [];
page.on('response', async (res) => {
  if (!/operationName=(GetProductSearch|GetCategoryProductSearch)/.test(res.url())) return;
  try { seen.push({ url: res.url(), body: await res.json() }); } catch { /* ignore */ }
});
const result = { queries: {}, sampleUrl: null, sampleBody: null, replay: [] };
const queries = [...new Set(Object.values(RULES).map((r) => r.q))];
let i = 0;
for (const q of queries) {
  seen.length = 0;
  try {
    await page.goto(`https://www.delhaize.be/fr/shop/search?text=${encodeURIComponent(q)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (i === 0) await acceptCookies(page);
    await page.waitForResponse((r) => /operationName=GetProductSearch/.test(r.url()), { timeout: 15000 }).catch(() => {});
    await sleep(1500);
  } catch (e) { console.log(`${q} : ${e.message.slice(0, 120)}`); }
  const prods = seen.flatMap((s) => productsFromJson(s.body, 200));
  result.queries[q] = { responses: seen.length, products: prods };
  if (!result.sampleUrl && seen[0]) { result.sampleUrl = seen[0].url; result.sampleBody = JSON.stringify(seen[0].body).slice(0, 20000); }
  console.log(`${String(++i).padStart(3)} ${q.padEnd(28)} réponses ${seen.length}  produits ${prods.length}  ${prods.slice(0, 3).map((p) => p.name).join(' | ')}`);
  await sleep(800 + Math.random() * 800);
}
// Rejouer la requête avec une plus grande page et sans texte (catalogue entier ?).
if (result.sampleUrl) {
  const u = new URL(result.sampleUrl);
  const vars = JSON.parse(u.searchParams.get('variables') ?? '{}');
  console.log('variables :', JSON.stringify(vars));
  for (const tweak of [{ pageSize: 100 }, { pageSize: 500 }, { searchQuery: '', pageSize: 100 }, { searchQuery: '*', pageSize: 100 }, { currentPage: 1, pageSize: 100 }]) {
    const v = { ...vars, ...tweak };
    u.searchParams.set('variables', JSON.stringify(v));
    const r = await page.evaluate(async (url) => {
      try { const res = await fetch(url, { credentials: 'include' }); const t = await res.text(); return { status: res.status, len: t.length, text: t.slice(0, 3000) }; } catch (e) { return { error: String(e) }; }
    }, u.toString());
    let count = null;
    try { count = productsFromJson(JSON.parse(r.text ?? '{}'), 1000).length; } catch { /* tronqué */ }
    result.replay.push({ tweak, ...r, countInFirst3k: count });
    console.log('rejeu', JSON.stringify(tweak), r.status, r.len, r.error ?? '');
  }
}
writeFileSync(`${OUT}/delhaize.json`, JSON.stringify(result, null, 1));
await browser.close();
