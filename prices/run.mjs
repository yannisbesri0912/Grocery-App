// Met à jour data/prices.json avec les vrais prix (lancé chaque nuit par GitHub Actions).
//   node prices/run.mjs                 toutes les sources
//   node prices/run.mjs colruyt promos  seulement certaines sources
// Une source en échec garde ses prix de la veille : l'app ne perd jamais de données.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../src/data.js';
import { RULES, PET_BABY } from '../src/match-rules.js';
import { pickBest } from '../src/matcher.js';
import { fetchColruyt } from './colruyt.mjs';
import { fetchPromotions } from './prijsprofeet.mjs';
import { fetchSite } from './sites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data/prices.json');
const REPORT = join(root, 'data/prices-report.md');

const SOURCES = {
  colruyt: () => fetchColruyt(),
  delhaize: () => fetchSite('delhaize'),
  aldi: () => fetchSite('aldi'),
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

function match(candidates) {
  const items = {};
  for (const p of PRODUCTS) {
    const rule = RULES[p.id];
    if (!rule) continue;
    const best = pickBest(rule, candidates, PET_BABY);
    if (best) {
      items[p.id] = {
        price: best.priceForSpec,
        article: best.name,
        pack: Math.round(best.price * 100) / 100,
        unitPrice: Math.round(best.unitPrice * 1000) / 1000,
        unit: rule.size[1],
        ...(best.url ? { url: best.url } : {}),
        ...(best.promo ? { promo: best.promoText ?? true, until: best.until ?? null } : {}),
      };
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

for (const [chain, fetcher] of Object.entries(SOURCES)) {
  if (!runs(chain)) continue;
  console.log(`\n=== ${chain}`);
  try {
    const { date, candidates, note } = await fetcher();
    const items = match(candidates.map(withUnitText));
    const count = Object.keys(items).length;
    if (!count) throw new Error('aucun produit reconnu');
    for (const [pid, it] of Object.entries(result.items)) if (it[chain] && !it[chain].promoOnly) delete it[chain];
    for (const [pid, it] of Object.entries(items)) (result.items[pid] ??= {})[chain] = it;
    result.sources[chain] = { date, matched: count, ok: true, ...(note ? { note } : {}) };
    log.push(`- **${chain}** : ${count} produits au ${date}`);
    console.log(`  ${count} produits reconnus`);
  } catch (e) {
    console.log(`  ÉCHEC : ${e.message}`);
    result.sources[chain] = { ...(previous.sources?.[chain] ?? {}), ok: false, error: e.message, failedAt: result.updatedAt };
    log.push(`- **${chain}** : échec (${e.message}) — prix précédents conservés`);
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
      const items = match(cands);
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
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);

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
