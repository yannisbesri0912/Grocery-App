// Sondage : livres de cuisine Wikibooks en français et en néerlandais (taille, catégories, format).
import { writeFileSync, mkdirSync } from 'node:fs';
const UA = { 'User-Agent': 'GroceryOpti/1.0 (https://github.com/yannisbesri0912/Grocery-App)' };
const api = async (host, params) => (await fetch(`https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`, { headers: UA })).json();
const out = {};
for (const [host, prefixes] of [['fr.wikibooks.org', ['Recette', 'Livre de cuisine', 'Cuisine']], ['nl.wikibooks.org', ['Kookboek', 'Recept']]]) {
  const r = { cats: [] };
  for (const p of prefixes) {
    const d = await api(host, { action: 'query', list: 'allcategories', acprefix: p, aclimit: '100', acprop: 'size' });
    r.cats.push(...(d.query?.allcategories ?? []).map((c) => [c.category, c.size, c.pages]));
  }
  r.cats.sort((a, b) => b[1] - a[1]);
  // Pages du livre (préfixe de titre)
  for (const pre of host.startsWith('fr') ? ['Livre de cuisine/'] : ['Kookboek/']) {
    const titles = [];
    let cont = {};
    for (let i = 0; i < 30; i++) {
      const d = await api(host, { action: 'query', list: 'allpages', apprefix: pre, aplimit: '500', ...cont });
      titles.push(...(d.query?.allpages ?? []).map((x) => x.title));
      if (!d.continue) break;
      cont = d.continue;
    }
    r.pages = titles.length;
    r.sample = titles.filter((_, i) => i % Math.max(1, Math.floor(titles.length / 150)) === 0).slice(0, 150);
    // Exemple de contenu
    for (const t of titles.filter((x) => /bolognaise|carbonnade|stoemp|waterzooi|boulet|frites|vol-au-vent|stoofvlees|spaghetti/i.test(x)).slice(0, 3)) {
      const d = await api(host, { action: 'parse', page: t, prop: 'wikitext' });
      (r.examples ??= {})[t] = String(d.parse?.wikitext ?? '').slice(0, 2500);
    }
  }
  const lic = await api(host, { action: 'query', meta: 'siteinfo', siprop: 'rightsinfo' });
  r.license = lic.query?.rightsinfo;
  out[host] = r;
  console.log(host, 'pages', r.pages, 'top catégories', r.cats.slice(0, 8));
}
mkdirSync('data-raw', { recursive: true });
writeFileSync('data-raw/probe-cookbooks.json', JSON.stringify(out, null, 1));
