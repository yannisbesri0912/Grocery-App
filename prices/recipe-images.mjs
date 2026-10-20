// Photos des plats : l'image principale de la page Wikibooks de la recette, sinon
// celle de l'article Wikipédia du plat (anglais, puis français). On ne garde que
// les images libres de Wikimedia Commons, avec auteur et licence (à afficher).
// Les images ne sont pas copiées : l'app les charge depuis Wikimedia, à la demande.
//   node prices/recipe-images.mjs [sortie=data/recipe-images.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { RECIPES, makeRecipe } from '../src/recipes.js';

const OUT = process.argv[2] ?? 'data/recipe-images.json';
const UA = { 'User-Agent': 'GroceryOpti/1.0 (https://github.com/yannisbesri0912/Grocery-App)' };
const SIZE = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: UA }).catch(() => null);
    if (res?.ok) return res.json();
    await sleep(2000 * (i + 1));
  }
  return null;
}

// Image principale de pages (50 par requête) → Map titre → { file, thumb }.
async function pageImages(host, titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const data = await api(host, { action: 'query', prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: SIZE, redirects: '1', titles: chunk.join('|') });
    const alias = new Map();
    for (const n of data?.query?.normalized ?? []) alias.set(n.to, n.from);
    for (const r of data?.query?.redirects ?? []) alias.set(r.to, alias.get(r.from) ?? r.from);
    for (const p of data?.query?.pages ?? []) {
      if (!p.pageimage || !p.thumbnail?.source) continue;
      out.set(alias.get(p.title) ?? p.title, { file: p.pageimage, thumb: p.thumbnail.source });
    }
    await sleep(300);
  }
  return out;
}

// Licence et auteur sur Commons (les images locales, souvent non libres, sont écartées).
const strip = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
async function licenses(files) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const chunk = files.slice(i, i + 50);
    const data = await api('commons.wikimedia.org', { action: 'query', prop: 'imageinfo', iiprop: 'extmetadata|url', titles: chunk.map((f) => `File:${f}`).join('|') });
    const alias = new Map((data?.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of data?.query?.pages ?? []) {
      const info = p.imageinfo?.[0];
      if (!info || p.missing) continue;
      const m = info.extmetadata ?? {};
      const license = strip(m.LicenseShortName?.value);
      if (!/^(cc|public domain|pd|gfdl|cc0)/i.test(license) || /fair use|non-free/i.test(license)) continue;
      const file = (alias.get(p.title) ?? p.title).replace(/^File:/, '');
      out.set(file, { author: strip(m.Artist?.value).slice(0, 80) || 'Wikimedia Commons', license, page: info.descriptionurl });
    }
    await sleep(300);
  }
  return out;
}

const wikibooks = JSON.parse(readFileSync(new URL('../data/recipes-wikibooks.json', import.meta.url), 'utf8')).map((row) => ({ r: makeRecipe(row, 'wb-'), src: row[6] }));
const all = [...RECIPES.map((r) => ({ r })), ...wikibooks];
const found = new Map(); // id → { file, thumb }

// 1. Page Wikibooks de la recette.
const wbTitle = (src) => decodeURIComponent(String(src ?? '').split('/wiki/')[1] ?? '').replace(/_/g, ' ');
const wbPages = await pageImages('en.wikibooks.org', [...new Set(wikibooks.map((x) => wbTitle(x.src)).filter(Boolean))]);
for (const x of wikibooks) { const hit = wbPages.get(wbTitle(x.src)); if (hit) found.set(x.r.id, hit); }
console.log(`Wikibooks : ${found.size}`);

// 2. Article Wikipédia anglais du plat (titre de la recette sans « Cookbook: »).
const enTitle = (src) => wbTitle(src).replace(/^Cookbook:/, '').replace(/\s*\(.*\)$/, '').replace(/\s*I+$/, '');
const missingWb = wikibooks.filter((x) => !found.has(x.r.id));
const enPages = await pageImages('en.wikipedia.org', [...new Set(missingWb.map((x) => enTitle(x.src)).filter(Boolean))]);
for (const x of missingWb) { const hit = enPages.get(enTitle(x.src)); if (hit) found.set(x.r.id, hit); }
console.log(`+ Wikipédia (en) : ${found.size}`);

// 3. Recettes de l'app (noms français) : premier résultat de recherche sur Wikipédia en français.
for (const { r } of all.filter((x) => !found.has(x.r.id) && !x.src)) {
  const q = r.name.replace(/\s+(et|avec|au|aux|à la|à l'|sauce)\s.*$/i, '');
  const data = await api('fr.wikipedia.org', { action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '1', prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: SIZE });
  const p = data?.query?.pages?.[0];
  if (p?.pageimage && p.thumbnail?.source) found.set(r.id, { file: p.pageimage, thumb: p.thumbnail.source, guess: p.title });
  await sleep(200);
}
console.log(`+ Wikipédia (fr) : ${found.size}`);

const lic = await licenses([...new Set([...found.values()].map((f) => f.file))]);
const out = {};
for (const [id, f] of found) {
  const l = lic.get(f.file);
  if (l) out[id] = [f.thumb, l.author, l.license, l.page, ...(f.guess ? [f.guess] : [])];
}
writeFileSync(OUT, `{\n${Object.entries(out).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n')}\n}\n`);
console.log(`Écrit : ${OUT} — ${Object.keys(out).length} photos libres sur ${all.length} recettes`);
