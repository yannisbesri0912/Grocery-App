// Sources « navigateur » : une recherche par produit du catalogue.
import { RULES } from '../src/match-rules.js';
import { openBrowser, searchProducts } from './browser.mjs';

export const SITES = {
  // Delhaize : recherche en français (/fr/ : noms français, reconnus bien plus souvent).
  delhaize: {
    name: 'Delhaize',
    searchUrl: (q) => `https://www.delhaize.be/fr/shop/search?text=${encodeURIComponent(q)}`,
    dataUrl: /operationName=(GetProductSearch|GetCategoryProductSearch)/,
    embedded: false,
  },
  // Aldi : la recherche du site est en néerlandais (adresse vue dans les journaux).
  aldi: { name: 'Aldi', lang: 'nl', dataUrl: /algolia\.net|_next\/data/, searchUrl: (q) => `https://www.aldi.be/zoekresultaten.html?query=${encodeURIComponent(q)}` },
};

/** Candidats pour une enseigne : on cherche chaque produit puis on garde tout. */
export async function fetchSite(chain, { only } = {}) {
  const site = SITES[chain];
  const { browser, context } = await openBrowser();
  const candidates = [];
  let empty = 0;
  let done = 0;
  try {
    const queries = [...new Set(Object.entries(RULES).filter(([id]) => !only || only.includes(id)).map(([, r]) => (site.lang === 'nl' ? r.nl ?? r.q : r.q)))];
    for (const q of queries) {
      // Les 2 premières recherches sont détaillées dans le journal (diagnostic).
      const found = await searchProducts(context, site, q, { debug: done < 2 || process.env.DEBUG_PRICES === '1' });
      done++;
      if (!found.length) empty++;
      candidates.push(...found);
      // Site qui ne répond rien du tout : inutile d'insister (blocage probable).
      if (done === 4 && empty === 4) throw new Error(`${site.name} : aucune donnée produit lisible (blocage ou page changée)`);
    }
  } finally {
    await browser.close();
  }
  console.log(`  ${site.name} : ${candidates.length} articles lus, ${empty} recherches vides`);
  return { date: new Date().toISOString().slice(0, 10), candidates };
}
