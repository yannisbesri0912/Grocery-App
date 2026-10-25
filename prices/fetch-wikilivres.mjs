// Relevé brut du « Livre de cuisine » de Wikilivres (fr.wikibooks.org, CC BY-SA 4.0) :
// texte wiki et catégories de chaque page, pour prices/wikilivres.mjs.
import { writeFileSync, mkdirSync } from 'node:fs';
const UA = { 'User-Agent': 'GroceryOpti/1.0 (https://github.com/yannisbesri0912/Grocery-App)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const url = `https://fr.wikibooks.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: UA }).catch(() => null);
    if (res?.ok) return res.json();
    await sleep(2000 * (i + 1));
  }
  throw new Error(`API ${params.action}`);
}
const titles = [];
let cont = {};
for (;;) {
  const d = await api({ action: 'query', list: 'allpages', apprefix: 'Livre de cuisine/', aplimit: '500', ...cont });
  titles.push(...d.query.allpages.map((p) => p.title));
  if (!d.continue) break;
  cont = d.continue;
}
console.log(titles.length, 'pages');
const pages = [];
for (let i = 0; i < titles.length; i += 50) {
  const d = await api({ action: 'query', prop: 'revisions|categories', rvprop: 'content', rvslots: 'main', cllimit: 'max', titles: titles.slice(i, i + 50).join('|') });
  for (const p of d.query.pages) {
    const text = p.revisions?.[0]?.slots?.main?.content;
    if (text) pages.push({ title: p.title, cats: (p.categories ?? []).map((c) => c.title.replace(/^Catégorie:/, '')), text });
  }
  await sleep(300);
}
mkdirSync('data-raw', { recursive: true });
writeFileSync('data-raw/wikilivres-raw.json', JSON.stringify(pages));
console.log(pages.length, 'pages avec texte');
