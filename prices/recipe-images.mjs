// Photos des plats : l'image principale de la page Wikibooks de la recette, sinon
// celle de l'article Wikipédia du plat (anglais, puis français). On ne garde que
// les images libres de Wikimedia Commons, avec auteur et licence (à afficher).
// Les images ne sont pas copiées : l'app les charge depuis Wikimedia, à la demande.
//   node prices/recipe-images.mjs [sortie=data/recipe-images.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { RECIPES, makeRecipe, addRecipes, sameName } from '../src/recipes.js';

const OUT = process.argv[2] ?? 'data/recipe-images.json';
// Recherches françaises qui tombent à côté (article générique, aliment cru, autre plat) : pas de photo.
const BAD_GUESS = new Set([
  // Livre de cuisine (Wikilivres) : recherches tombées à côté (plante, poisson vivant, autre plat…).
  'wl-aiga-bolhida', 'wl-beignets-de-citrouille', 'wl-blancs-de-poulet-farcis-aux-herbes', 'wl-boulettes-de-lentilles',
  'wl-boulettes-de-noix-en-ragout', 'wl-cake-moelleux-au-chocolat', 'wl-cake-aux-olives', 'wl-creme-de-chou-fleur',
  'wl-des-de-saumon-marine-au-citron', 'wl-pave-aux-noix', 'wl-tarte-caramel-aux-noix', 'wl-gateau-simple-au-chocolat',
  'wl-flan-de-courgettes', 'wl-galettes-d-avoine', 'wl-galettes-de-haricots-rouges-au-mais', 'wl-galettes-de-quinoa',
  'wl-gratin-au-chou', 'wl-gratinee-a-la-biere', 'wl-gazpacho', 'wl-gateau-au-chocolat',
  'wl-gateau-aux-noix-et-au-miel', 'wl-gateau-au-fromage-a-la-mode-d-obwald', 'wl-gateau-aux-carottes-et-aux-epices',
  'wl-gateau-aux-pommes', 'wl-gateau-de-pommes-a-la-poudre-d-amandes', 'wl-gateau-au-vin-blanc',
  'wl-gateau-au-chocolat-rapide', 'wl-lentilles-cuisinees', 'wl-michon', 'wl-melsa', 'wl-omelette-angevine',
  'wl-pie-anglaise', 'wl-poisson-au-guazzetto', 'wl-piquant-bourbonnais', 'wl-pizza-familiale',
  'wl-poelee-de-champignons-au-fromage-a-l-ail-et-fines-herbes', 'wl-poelee-brestoise', 'wl-pudding-au-chocolat',
  'wl-poulet-a-la-gaston-gerard', 'wl-pates-aux-champignons-et-aux-herbes', 'wl-pates-aux-poivrons',
  'wl-pates-a-la-flammenkuche', 'wl-pates-au-thon', 'wl-puree-de-courgettes',
  'wl-pate-vegetal-aux-flocons-et-aux-epinards', 'wl-pates-au-poivron-et-a-la-farine-de-pois-chiches',
  'wl-quinoa-au-lait', 'wl-riz-au-lait-a-la-bretonne', 'wl-riz-au-chocolat', 'wl-riz-rouge',
  'wl-sandwich-au-beurre-d-arachide-et-a-la-banane', 'wl-soupe-au-potiron', 'wl-soupe-aux-courgettes-et-aux-tomates',
  'wl-spaghetti-au-jambon-de-parme', 'wl-soupe-de-lentilles-grecque', 'wl-tarte-au-sucre', 'wl-tarte-au-citron',
  'wl-tarte-au-beaufort', 'wl-tarte-aux-courgettes', 'wl-tarte-au-saumon-et-aux-epinards',
  'wl-tarte-aux-brocolis-et-au-jambon', 'wl-tarte-aux-legumes', 'wl-tarte-au-sucre-complet-et-a-la-cannelle',
  'wl-tarte-aux-champignons', 'wl-tarte-aux-fraises', 'wl-tarte-aux-tomates-et-au-gouda', 'wl-tarte-a-la-tomate',
  'wl-terrine-verte', 'wl-thon-grille-a-la-mediterraneenne', 'wl-tourain-blanchi', 'wl-tortilla', 'wl-oeuf-bocage',
  'one-pot-pasta-tomate-mozzarella',
  'gnocchi-poeles-sauce-tomate',
  'riz-saute-aux-crevettes',
  'saumon-riz-et-brocoli',
  'tofu-saute-aux-legumes',
  'quiche-saumon-et-poireaux',
  'poulet-curry-coco-et-riz',
  'cabillaud-pane-et-puree',
  'ramen-express',
  'pommes-de-terre-farcies',
  'gratin-de-chou-fleur',
  'soupe-de-lentilles-corail',
  'salade-de-lentilles-et-feta',
  'wrap-poulet-crudites',
  'sandwich-jambon-fromage',
  'sandwich-thon-mayo',
  'riz-au-lait',
  'chicons-au-gratin',
  'gratin-de-courgettes',
  'pates-au-thon-et-a-la-tomate',
  'pates-au-pesto-et-tomates',
  'pates-aux-courgettes-et-feta',
  'escalope-de-dinde-aux-champignons',
  'saucisses-et-puree',
  'tarte-fine-tomate-mozzarella',
]);
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
const wikilivres = JSON.parse(readFileSync(new URL('../data/recipes-wikilivres.json', import.meta.url), 'utf8')).map((row) => ({ r: makeRecipe(row, 'wl-'), src: row[6], fr: true }));
const all = [...RECIPES.map((r) => ({ r })), ...wikibooks, ...wikilivres];
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

// 2b. Livre de cuisine (Wikilivres) : image de la page de la recette.
const wlPages = await pageImages('fr.wikibooks.org', [...new Set(wikilivres.map((x) => wbTitle(x.src)).filter(Boolean))]);
for (const x of wikilivres) { const hit = wlPages.get(wbTitle(x.src)); if (hit) found.set(x.r.id, hit); }
console.log(`+ Wikilivres : ${found.size}`);

// 3. Recettes de l'app (noms français) : premier résultat de recherche sur Wikipédia en français.
for (const { r } of all.filter((x) => !found.has(x.r.id) && (!x.src || x.fr))) {
  const q = r.name.replace(/\s+(et|avec|au|aux|à la|à l'|sauce)\s.*$/i, '');
  const data = await api('fr.wikipedia.org', { action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '1', prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: SIZE });
  const p = data?.query?.pages?.[0];
  if (p?.pageimage && p.thumbnail?.source && !BAD_GUESS.has(r.id)) found.set(r.id, { file: p.pageimage, thumb: p.thumbnail.source, guess: p.title });
  await sleep(200);
}
console.log(`+ Wikipédia (fr) : ${found.size}`);

const lic = await licenses([...new Set([...found.values()].map((f) => f.file))]);
const out = {};
for (const [id, f] of found) {
  const l = lic.get(f.file);
  if (l) out[id] = [f.thumb.replace(/\?utm_.*$/, ''), l.author, l.license, l.page];
}
// L'app charge Wikilivres puis Wikibooks sans doublon de nom : la photo d'une recette écartée
// passe à la recette gardée du même nom (si celle-ci n'en a pas).
const wlRows = JSON.parse(readFileSync(new URL('../data/recipes-wikilivres.json', import.meta.url), 'utf8'));
const wbRows = JSON.parse(readFileSync(new URL('../data/recipes-wikibooks.json', import.meta.url), 'utf8'));
addRecipes(wlRows, 'wl-');
addRecipes(wbRows, 'wb-');
const keptIds = new Set(RECIPES.map((r) => r.id));
const keptByName = new Map(RECIPES.map((r) => [sameName(r.name), r.id]));
for (const x of all.filter((x) => out[x.r.id] && !keptIds.has(x.r.id))) {
  const to = keptByName.get(sameName(x.r.name));
  if (to && !out[to]) out[to] = out[x.r.id];
  delete out[x.r.id];
}

// Recherches devinées (à relire, et à ajouter à BAD_GUESS si elles tombent à côté).
writeFileSync(`${OUT}.guesses.txt`, [...found].filter(([id, f]) => f.guess && out[id]).map(([id, f]) => `${id} → ${f.guess}`).join('\n'));
writeFileSync(OUT, `{\n${Object.entries(out).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n')}\n}\n`);
console.log(`Écrit : ${OUT} — ${Object.keys(out).length} photos libres sur ${all.length} recettes`);
