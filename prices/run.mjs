// Met à jour data/prices.json avec les vrais prix (lancé chaque nuit par GitHub Actions).
//   node prices/run.mjs                 toutes les sources
//   node prices/run.mjs colruyt promos  seulement certaines sources
// Une source en échec garde ses prix de la veille : l'app ne perd jamais de données.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../src/data.js';
import { RULES, PET_BABY } from '../src/match-rules.js';
import { pickBest, rankMatches } from '../src/matcher.js';
import { fetchColruyt } from './colruyt.mjs';
import { fetchPromotions } from './prijsprofeet.mjs';
import { fetchSite } from './sites.mjs';
import { fetchDelhaizeCatalog, fetchAldiCatalog, toCandidate, toRow } from './catalogs.mjs';
import { toFrench } from '../src/translate.js';
import { sameProducts } from '../src/same.js';
import { addDay } from '../src/history.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data/prices.json');
const REPORT = join(root, 'data/prices-report.md');
const CATALOG = (chain) => join(root, `data/catalog-${chain}.json`);

// Catalogue complet (rapide, tous les articles, en français) ; en cas d'échec,
// recherche produit par produit sur le site comme avant.
async function fromCatalog(chain, read) {
  try {
    const rows = await read();
    const candidates = rows.map(toCandidate).map(withUnitText);
    // Produits que le catalogue ne couvre pas : recherche sur le site pour eux seuls.
    const missing = PRODUCTS.filter((p) => RULES[p.id] && !pickBest(RULES[p.id], candidates, PET_BABY)).map((p) => p.id);
    let extra = [];
    if (missing.length) {
      console.log(`  ${missing.length} produits absents du catalogue, recherche sur le site : ${missing.join(', ')}`);
      const site = await fetchSite(chain, { only: missing }).catch((e) => { console.log(`  recherche impossible : ${e.message}`); return { candidates: [] }; });
      extra = site.candidates.map((c) => ({ ...c, nl: chain === 'aldi' }));
    }
    return { date: new Date().toISOString().slice(0, 10), lang: 'fr', candidates: [...candidates, ...extra], catalog: rows.map(toRow), note: `catalogue complet (${rows.length} articles)` };
  } catch (e) {
    console.log(`  catalogue complet impossible (${e.message}) : recherche produit par produit`);
    return fetchSite(chain);
  }
}

const SOURCES = {
  colruyt: () => fetchColruyt(),
  delhaize: () => fromCatalog('delhaize', fetchDelhaizeCatalog),
  aldi: () => fromCatalog('aldi', fetchAldiCatalog),
};

const wanted = process.argv.slice(2);
const runs = (name) => !wanted.length || wanted.includes(name);
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { sources: {}, items: {} };

// Le prix unitaire affiché par certains sites (« 1,05 €/l ») sert quand le format est illisible.
function withUnitText(c) {
  if (c.perUnit || !c.unitText) return c;
  const m = c.unitText.replace(/\s/g, '').toLowerCase().match(/(\d+[.,]\d+)€?\/(kg|l|litre|liter|pc|pièce|piece|st|stuk)/);
  if (!m) return c;
  const unit = { kg: 'kg', l: 'l', litre: 'l', liter: 'l' }[m[2]] ?? 'pc';
  return { ...c, perUnit: { unit, price: Number(m[1].replace(',', '.')) } };
}

// Noms néerlandais (Colruyt, Aldi, promos PrijsProfeet) affichés en français.
const DUTCH = new Set(['colruyt', 'aldi', 'promos']);

function match(candidates, source, lang) {
  const dutch = DUTCH.has(source) && lang !== 'fr';
  const items = {};
  for (const p of PRODUCTS) {
    // Rayon du produit : un article d'un autre rayon (conserve, plat préparé) n'est pas retenu.
    const rule = RULES[p.id] && { ...RULES[p.id], cat: p.cat };
    if (!rule) continue;
    const best = pickBest(rule, candidates, PET_BABY);
    if (best) {
      items[p.id] = {
        price: best.priceForSpec,
        article: dutch || best.nl ? toFrench(best.name) : best.name,
        pack: Math.round(best.price * 100) / 100,
        unitPrice: Math.round(best.unitPrice * 1000) / 1000,
        unit: rule.size[1],
        ...(best.url ? { url: best.url } : {}),
        ...(best.deal ? { deal: best.deal } : {}),
        ...(best.walk ? { walk: best.walk } : {}),
        ...(best.ref ? { ref: best.ref } : {}),
        ...(best.promo ? { promo: best.promoText ?? true, until: best.until ?? null } : {}),
      };
      // Autres formats (1 L seul quand le moins cher au litre est un pack de 6, boîte de 12
      // œufs quand le moins cher à l'œuf est une boîte de 10) : l'app choisit le format le
      // moins cher pour la quantité voulue. Le moins cher de chaque taille, 4 tailles au plus.
      const alts = [];
      const sizes = new Set([best.size?.amount]);
      for (const c of rankMatches(rule, candidates, PET_BABY, 80)) {
        if (!c.size || sizes.has(c.size.amount)) continue;
        sizes.add(c.size.amount);
        alts.push({
          price: c.priceForSpec, pack: Math.round(c.price * 100) / 100,
          article: dutch || c.nl ? toFrench(c.name) : c.name,
          ...(c.url ? { url: c.url } : {}), ...(c.deal ? { deal: c.deal } : {}), ...(c.ref ? { ref: c.ref } : {}),
        });
        if (alts.length >= 4) break;
      }
      if (alts.length) items[p.id].alts = alts;
    }
  }
  return items;
}

const result = {
  updatedAt: new Date().toISOString(),
  sources: { ...previous.sources },
  items: structuredClone(previous.items ?? {}),
};
const log = [];
const warnings = []; // signalés dans GitHub Actions (le relevé continue avec les bonnes données)

for (const [chain, fetcher] of Object.entries(SOURCES)) {
  if (!runs(chain)) continue;
  console.log(`\n=== ${chain}`);
  try {
    const { date, candidates, note, catalog, lang } = await fetcher();
    const items = match(candidates.map(withUnitText), chain, lang);
    const count = Object.keys(items).length;
    if (!count) throw new Error('aucun produit reconnu');
    // Couverture anormalement basse (site changé, réponse partielle) : on garde les prix d'avant.
    const before = previous.sources?.[chain]?.ok ? previous.sources[chain].matched : 0;
    if (before && count < before * 0.6) throw new Error(`seulement ${count} produits reconnus (${before} la dernière fois)`);
    for (const [pid, it] of Object.entries(result.items)) if (it[chain] && !it[chain].promoOnly) delete it[chain];
    for (const [pid, it] of Object.entries(items)) (result.items[pid] ??= {})[chain] = it;
    result.sources[chain] = { date, matched: count, ok: true, ...(note ? { note } : {}) };
    log.push(`- **${chain}** : ${count} produits au ${date}`);
    const oldRows = existsSync(CATALOG(chain)) ? readFileSync(CATALOG(chain), 'utf8').split('\n').length - 3 : 0;
    if (catalog?.length && catalog.length < oldRows * 0.6) {
      log.push(`- **${chain}** : catalogue incomplet (${catalog.length} articles contre ${oldRows}) — ancien catalogue gardé`);
      warnings.push(`${chain} : catalogue incomplet (${catalog.length} / ${oldRows})`);
    } else if (catalog?.length) {
      // Catalogue complet cherchable dans l'app (une ligne par article).
      writeFileSync(CATALOG(chain), `{"chain":"${chain}","date":"${date}","rows":[\n${catalog.map((r) => JSON.stringify(r)).join(',\n')}\n]}\n`);
      log.push(`- **${chain}** : catalogue complet de ${catalog.length} articles`);
    }
    console.log(`  ${count} produits reconnus`);
  } catch (e) {
    console.log(`  ÉCHEC : ${e.message}`);
    result.sources[chain] = { ...(previous.sources?.[chain] ?? {}), ok: false, error: e.message, failedAt: result.updatedAt };
    log.push(`- **${chain}** : échec (${e.message}) — prix précédents conservés`);
    warnings.push(`${chain} : ${e.message}`);
  }
}

if (runs('promos')) {
  console.log('\n=== promotions (PrijsProfeet)');
  try {
    const promos = await fetchPromotions();
    let n = 0;
    // On efface les promos de la veille avant d'appliquer celles du jour.
    for (const it of Object.values(result.items)) {
      for (const [chain, v] of Object.entries(it)) {
        if (v.promoOnly) delete it[chain];
        else if (v.regular) { it[chain] = v.regular; }
      }
    }
    for (const [chain, cands] of Object.entries(promos)) {
      const items = match(cands, 'promos');
      for (const [pid, promo] of Object.entries(items)) {
        const cur = result.items[pid]?.[chain];
        if (cur && cur.price <= promo.price) continue;
        (result.items[pid] ??= {})[chain] = cur
          ? { ...promo, regular: cur }
          : { ...promo, promoOnly: true };
        n++;
      }
    }
    result.sources.promos = { date: new Date().toISOString().slice(0, 10), matched: n, ok: true, note: 'PrijsProfeet' };
    log.push(`- **promos** : ${n} promotions utiles`);
  } catch (e) {
    console.log(`  ÉCHEC : ${e.message}`);
    result.sources.promos = { ...(previous.sources?.promos ?? {}), ok: false, error: e.message };
    log.push(`- **promos** : échec (${e.message})`);
    warnings.push(`promos : ${e.message}`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);

// Historique : un point par jour et par enseigne relevée (à la date de son relevé).
{
  const HIST = join(root, 'data/history.json');
  let hist = existsSync(HIST) ? JSON.parse(readFileSync(HIST, 'utf8')) : { dates: [], p: {} };
  for (const chain of ['colruyt', 'delhaize', 'aldi']) {
    const src = result.sources[chain];
    if (!runs(chain) || !src?.ok || !src.date) continue;
    const day = {};
    for (const [pid, it] of Object.entries(result.items)) if (it[chain] && !it[chain].promoOnly) day[pid] = { [chain]: it[chain].price };
    hist = addDay(hist, src.date, day);
  }
  writeFileSync(HIST, `${JSON.stringify(hist)}\n`);
}

// Même article chez Colruyt et Delhaize (comparaison directe dans l'app).
if (existsSync(CATALOG('colruyt')) && existsSync(CATALOG('delhaize'))) {
  const rowsOf = (c) => JSON.parse(readFileSync(CATALOG(c), 'utf8')).rows;
  const pairs = sameProducts(rowsOf('colruyt'), rowsOf('delhaize'));
  writeFileSync(join(root, 'data/same.json'), `{"date":"${result.updatedAt.slice(0, 10)}","pairs":${JSON.stringify(pairs)}}\n`);
  log.push(`- **même produit** : ${pairs.length} articles identiques Colruyt / Delhaize`);
}

// Rapport lisible : quel article a été retenu pour chaque produit, par enseigne.
const chains = ['colruyt', 'delhaize', 'aldi', 'lidl'];
const rows = PRODUCTS.map((p) => {
  const it = result.items[p.id] ?? {};
  return `| ${p.name} | ${chains.map((c) => (it[c] ? `${it[c].price.toFixed(2)} €${it[c].promo ? ' 🏷️' : ''} — ${it[c].article.replace(/\|/g, '/')}` : '—')).join(' | ')} |`;
});
writeFileSync(REPORT, [
  `# Prix réels — ${result.updatedAt.slice(0, 16).replace('T', ' ')} UTC`, '',
  ...log, '',
  'Prix ramené au format de la liste (ex. 1 L, 1 kg). 🏷️ = promotion en cours (source PrijsProfeet).', '',
  `| Produit | ${chains.join(' | ')} |`, `|---|${chains.map(() => '---').join('|')}|`, ...rows, '',
].join('\n'));
console.log(`\n${log.join('\n')}\nÉcrit : data/prices.json, data/prices-report.md`);
// Sources en panne ou incomplètes : visibles dans l'onglet Actions de GitHub.
for (const w of warnings) console.log(`::warning title=Prix réels::${w}`);
